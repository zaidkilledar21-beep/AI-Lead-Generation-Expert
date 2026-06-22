-- Fair scheduled discovery and email-first cold outreach qualification.

create or replace function public.claim_due_discovery_campaigns(
  p_limit integer default 10,
  p_now timestamptz default now()
)
returns table (
  campaign_id uuid,
  due_at timestamptz,
  next_run_at timestamptz
)
language sql
volatile
security definer
set search_path = public
as $$
  with due as (
    select
      c.id,
      coalesce(c.next_run_at, p_now) as due_at,
      c.run_frequency
    from public.campaigns c
    where c.status = 'active'
      and c.run_frequency in ('daily', 'every_3_days', 'weekly')
      and coalesce(c.next_run_at, p_now) <= p_now
    order by coalesce(c.next_run_at, p_now), c.id
    for update skip locked
    limit greatest(1, least(coalesce(p_limit, 10), 50))
  ),
  claimed as (
    update public.campaigns c
    set next_run_at = case due.run_frequency
          when 'daily' then greatest(due.due_at, p_now) + interval '1 day'
          when 'every_3_days' then greatest(due.due_at, p_now) + interval '3 days'
          when 'weekly' then greatest(due.due_at, p_now) + interval '7 days'
        end,
        updated_at = now()
    from due
    where c.id = due.id
    returning c.id, due.due_at, c.next_run_at
  )
  select claimed.id, claimed.due_at, claimed.next_run_at
  from claimed
  order by claimed.due_at, claimed.id;
$$;

revoke all on function public.claim_due_discovery_campaigns(integer, timestamptz) from public, anon, authenticated;
grant execute on function public.claim_due_discovery_campaigns(integer, timestamptz) to service_role;

update public.campaigns
set next_run_at = now(),
    updated_at = now()
where status = 'active'
  and run_frequency in ('daily', 'every_3_days', 'weekly')
  and next_run_at is null;

create or replace function public.touch_campaign_last_run()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.campaigns
  set last_run_at = new.started_at,
      updated_at = now()
  where id = new.campaign_id;
  return new;
end;
$$;

drop trigger if exists discovery_runs_touch_campaign_last_run on public.discovery_runs;
create trigger discovery_runs_touch_campaign_last_run
after insert on public.discovery_runs
for each row execute function public.touch_campaign_last_run();

revoke all on function public.touch_campaign_last_run() from public, anon, authenticated;

create or replace function public.is_usable_lead_email(p_email text)
returns boolean
language sql
immutable
parallel safe
set search_path = public
as $$
  select case
    when nullif(trim(coalesce(p_email, '')), '') is null then false
    when lower(trim(p_email)) !~ '^[a-z0-9.!#$%&''*+/=?^_`{|}~-]+@[a-z0-9]([a-z0-9.-]*[a-z0-9])?\.[a-z]{2,24}$' then false
    when lower(split_part(trim(p_email), '@', 2)) in ('example.com', 'example.org', 'example.net', 'test.com', 'localhost') then false
    when lower(split_part(trim(p_email), '@', 1)) in ('noreply', 'no-reply', 'donotreply', 'do-not-reply') then false
    when lower(split_part(trim(p_email), '@', 1)) ~ '(logo|icon|sprite|image|img|cropped|artboard|@2x|@3x|@4x)' then false
    else true
  end;
$$;

create or replace function public.archive_unusable_email_lead(p_lead_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_lead public.leads%rowtype;
  v_now timestamptz := now();
begin
  select * into v_lead
  from public.leads
  where id = p_lead_id
  for update;

  if not found then
    raise exception 'Lead not found: %', p_lead_id;
  end if;

  if public.is_usable_lead_email(v_lead.email) then
    return jsonb_build_object('lead_id', p_lead_id, 'status', 'skipped', 'reason', 'usable_email_present');
  end if;

  if v_lead.status in (
    'replied', 'replied_interested', 'replied_not_interested', 'replied_needs_review',
    'closed_won', 'closed_lost', 'unsubscribed', 'bounced', 'not_interested'
  ) or exists (select 1 from public.reply_events re where re.lead_id = p_lead_id) then
    return jsonb_build_object('lead_id', p_lead_id, 'status', 'preserved', 'reason', 'terminal_or_replied');
  end if;

  update public.outreach_queue
  set status = 'blocked',
      pause_reason = 'missing_email',
      updated_at = v_now
  where lead_id = p_lead_id
    and status in ('queued', 'drafted', 'paused', 'blocked');

  update public.manual_review_queue
  set review_status = 'rejected',
      review_notes = 'Automatically rejected because no usable business email was found.',
      completed_at = coalesce(completed_at, v_now),
      completed_by = coalesce(completed_by, 'system:missing_email_gate'),
      updated_at = v_now
  where lead_id = p_lead_id
    and review_status = 'pending';

  update public.leads
  set email = null,
      status = 'archived',
      closed_at = coalesce(closed_at, v_now),
      closed_by = coalesce(closed_by, 'system:missing_email_gate'),
      last_activity_at = v_now,
      updated_at = v_now
  where id = p_lead_id;

  insert into public.workflow_events (
    workflow_name, lead_id, campaign_id, discovery_run_id, candidate_id,
    event_type, status, payload, created_at
  )
  values (
    'Email Qualification Gate', p_lead_id, v_lead.campaign_id, v_lead.discovery_run_id, v_lead.candidate_id,
    'lead_rejected_missing_email', 'completed',
    jsonb_build_object('previous_status', v_lead.status, 'reason', 'missing_valid_email'),
    v_now
  );

  return jsonb_build_object('lead_id', p_lead_id, 'status', 'archived', 'reason', 'missing_valid_email');
end;
$$;

revoke all on function public.archive_unusable_email_lead(uuid) from public, anon, authenticated;
grant execute on function public.archive_unusable_email_lead(uuid) to service_role;

create or replace view public.wf04_scored_leads
with (security_invoker = true)
as
select
  l.id,
  l.business_name,
  l.niche,
  l.campaign_id,
  l.discovery_run_id,
  l.status,
  l.updated_at,
  l.email,
  l.phone,
  l.whatsapp,
  ls.band,
  ls.confidence,
  ls.manual_review_required,
  ah.outreach_hook,
  public.is_usable_lead_email(l.email) as email_usable
from public.leads l
join lateral (
  select score.band, score.confidence, score.manual_review_required
  from public.lead_scores score
  where score.lead_id = l.id
  order by score.created_at desc
  limit 1
) ls on true
left join lateral (
  select hypothesis.outreach_hook
  from public.automation_hypotheses hypothesis
  where hypothesis.lead_id = l.id
  order by hypothesis.created_at desc
  limit 1
) ah on true
where l.status = 'scored'
  and not exists (
    select 1 from public.manual_review_queue mrq
    where mrq.lead_id = l.id and mrq.review_status = 'pending'
  )
  and not exists (
    select 1 from public.outreach_queue oq
    where oq.lead_id = l.id and oq.status in ('queued', 'drafted', 'paused', 'blocked', 'replied', 'completed')
  )
  and not exists (
    select 1 from public.email_drafts d
    where d.lead_id = l.id
  );

create or replace function public.route_scored_lead(
  p_lead_id uuid,
  p_band text default null,
  p_niche text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_band text := upper(nullif(trim(coalesce(p_band, '')), ''));
  v_lead public.leads%rowtype;
  v_sequence_id uuid;
  v_queue_id uuid;
  v_status text;
begin
  select * into v_lead from public.leads where id = p_lead_id for update;
  if not found then raise exception 'Lead not found: %', p_lead_id; end if;

  if not public.is_usable_lead_email(v_lead.email) then
    perform public.archive_unusable_email_lead(p_lead_id);
    return jsonb_build_object('lead_id', p_lead_id, 'band', v_band, 'queue_id', null, 'status', 'archived', 'reason', 'missing_valid_email');
  end if;

  if v_band is null then
    select upper(band) into v_band
    from public.lead_scores where lead_id = p_lead_id order by created_at desc limit 1;
  end if;
  v_band := coalesce(nullif(v_band, ''), 'C');

  if v_band = 'A' then
    update public.leads set status = 'pending_approval', last_activity_at = now(), updated_at = now() where id = p_lead_id;
    perform public.queue_manual_review_item(p_lead_id, 'band_a_approval', 'high');
    v_status := 'pending_approval';
  elsif v_band in ('B', 'C') then
    select id into v_sequence_id
    from public.outreach_sequences
    where active = true and band = v_band
    order by created_at asc limit 1;

    if v_sequence_id is null then
      update public.leads set status = 'blocked', last_activity_at = now(), updated_at = now() where id = p_lead_id;
      perform public.queue_manual_review_item(p_lead_id, 'missing_outreach_sequence', 'high');
      v_status := 'blocked';
    else
      insert into public.outreach_queue (lead_id, sequence_id, current_step, next_send_at, status, created_at, updated_at)
      values (p_lead_id, v_sequence_id, 1, now(), 'queued', now(), now())
      on conflict (lead_id, sequence_id) do update
      set status = case when outreach_queue.status in ('replied', 'completed') then outreach_queue.status else 'queued' end,
          next_send_at = coalesce(outreach_queue.next_send_at, now()),
          updated_at = now()
      returning id into v_queue_id;

      update public.leads
      set status = 'queued', last_activity_at = now(), updated_at = now()
      where id = p_lead_id
        and status not in ('replied', 'replied_interested', 'replied_not_interested', 'closed_won', 'closed_lost', 'unsubscribed', 'bounced', 'archived');
      v_status := 'queued';
    end if;
  else
    update public.leads set status = 'review_pending', last_activity_at = now(), updated_at = now() where id = p_lead_id;
    perform public.queue_manual_review_item(p_lead_id, 'low_score_or_band_d_review', 'normal');
    v_status := 'review_pending';
  end if;

  insert into public.workflow_events (workflow_name, lead_id, event_type, status, payload, created_at)
  values (
    'WF-04 Routing', p_lead_id, 'route_scored_lead', 'completed',
    jsonb_build_object('band', v_band, 'niche', p_niche, 'queue_id', v_queue_id, 'lead_status', v_status),
    now()
  );

  return jsonb_build_object('lead_id', p_lead_id, 'band', v_band, 'queue_id', v_queue_id, 'status', v_status);
end;
$$;

create or replace view public.wf05_due_queue_items
with (security_invoker = true)
as
select
  q.id as queue_id,
  q.lead_id,
  q.sequence_id,
  q.current_step,
  q.next_send_at,
  q.status as queue_status,
  q.pause_reason,
  l.business_name,
  l.email,
  l.website,
  l.status as lead_status,
  l.discovery_run_id,
  l.campaign_id,
  exists (
    select 1 from public.email_drafts d
    where d.lead_id = q.lead_id and d.sequence_id = q.sequence_id and d.step_number = coalesce(q.current_step, 1)
  ) as has_existing_draft,
  exists (
    select 1 from public.manual_review_queue mrq
    where mrq.lead_id = q.lead_id and mrq.review_status = 'pending'
  ) as has_pending_manual_review,
  case
    when l.id is null then 'block_missing_lead'
    when not public.is_usable_lead_email(l.email) then 'archive_unusable_email'
    when exists (
      select 1 from public.email_drafts d
      where d.lead_id = q.lead_id and d.sequence_id = q.sequence_id and d.step_number = coalesce(q.current_step, 1)
    ) then 'skip_existing_draft'
    when exists (
      select 1 from public.manual_review_queue mrq
      where mrq.lead_id = q.lead_id and mrq.review_status = 'pending'
    ) then 'skip_existing_manual_review'
    when l.status not in ('queued', 'drafted') then 'block_invalid_lead_status'
    else 'generate_draft'
  end as wf05_action
from public.outreach_queue q
left join public.leads l on l.id = q.lead_id
where q.status = 'queued'
  and q.next_send_at <= now();

create or replace function public.sync_wf05_queue_action(p_queue_id uuid, p_action text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_queue public.outreach_queue%rowtype;
  v_action text := lower(trim(coalesce(p_action, '')));
  v_reason text;
begin
  select * into v_queue from public.outreach_queue where id = p_queue_id for update;
  if not found then
    return jsonb_build_object('queue_id', p_queue_id, 'status', 'skipped', 'reason', 'queue_not_found');
  end if;

  if v_action = 'archive_unusable_email' then
    perform public.archive_unusable_email_lead(v_queue.lead_id);
    v_reason := 'missing_email';
  elsif v_action = 'skip_existing_draft' then
    update public.outreach_queue set status = 'drafted', updated_at = now() where id = p_queue_id;
    update public.leads
    set status = 'drafted', last_activity_at = now(), updated_at = now()
    where id = v_queue.lead_id
      and status not in ('replied', 'replied_interested', 'replied_not_interested', 'closed_won', 'closed_lost', 'unsubscribed', 'bounced', 'archived');
  elsif v_action in ('skip_existing_manual_review', 'block_invalid_lead_status', 'block_missing_lead') then
    v_reason := case
      when v_action = 'skip_existing_manual_review' then 'pending_manual_review'
      when v_action = 'block_invalid_lead_status' then 'invalid_lead_status'
      else 'missing_lead'
    end;
    update public.outreach_queue set status = 'blocked', pause_reason = v_reason, updated_at = now() where id = p_queue_id;
    if v_action <> 'block_missing_lead' then
      update public.leads set status = 'review_pending', last_activity_at = now(), updated_at = now() where id = v_queue.lead_id;
      if v_action <> 'skip_existing_manual_review' then
        perform public.queue_manual_review_item(v_queue.lead_id, v_reason, 'high');
      end if;
    end if;
  else
    raise exception 'Unsupported WF-05 action: %', p_action;
  end if;

  insert into public.workflow_events (workflow_name, lead_id, event_type, status, payload, created_at)
  values (
    'WF-05 Draft Generation', v_queue.lead_id, 'wf05_queue_action_synced', 'completed',
    jsonb_build_object('queue_id', p_queue_id, 'wf05_action', v_action, 'pause_reason', v_reason),
    now()
  );

  return jsonb_build_object('queue_id', p_queue_id, 'lead_id', v_queue.lead_id, 'status', 'synced', 'wf05_action', v_action, 'pause_reason', v_reason);
end;
$$;

revoke all on function public.sync_wf05_queue_action(uuid, text) from public, anon, authenticated;
grant execute on function public.sync_wf05_queue_action(uuid, text) to service_role;

do $$
declare
  v_lead_id uuid;
begin
  for v_lead_id in
    select l.id
    from public.leads l
    where not public.is_usable_lead_email(l.email)
      and l.status in ('new', 'enriched', 'scored', 'review_pending', 'pending_approval', 'queued', 'drafted', 'blocked', 'paused')
      and not exists (select 1 from public.reply_events re where re.lead_id = l.id)
  loop
    perform public.archive_unusable_email_lead(v_lead_id);
  end loop;
end;
$$;
