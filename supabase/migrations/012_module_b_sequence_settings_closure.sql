-- Module B: Sequence Settings Closure.
-- Add soft-archive/editing fields without dropping seeded sequence data, and
-- keep WF-04/WF-05 selection aligned to active, non-archived sequence records.

alter table public.outreach_sequences
  add column if not exists description text,
  add column if not exists archived boolean not null default false,
  add column if not exists updated_at timestamptz default now();

alter table public.outreach_steps
  add column if not exists prompt_guidance text,
  add column if not exists archived boolean not null default false,
  add column if not exists updated_at timestamptz default now();

update public.outreach_sequences
set archived = false
where archived is null;

update public.outreach_steps
set archived = false
where archived is null;

update public.outreach_steps
set prompt_guidance = 'Legacy sequence step; add CRM guidance before changing template behavior.'
where active = true
  and archived = false
  and nullif(btrim(coalesce(template_type, '')), '') is null
  and nullif(btrim(coalesce(prompt_guidance, '')), '') is null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'outreach_steps_delay_days_nonnegative'
      and conrelid = 'public.outreach_steps'::regclass
  ) then
    alter table public.outreach_steps
      add constraint outreach_steps_delay_days_nonnegative check (delay_days >= 0);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'outreach_steps_active_content_check'
      and conrelid = 'public.outreach_steps'::regclass
  ) then
    alter table public.outreach_steps
      add constraint outreach_steps_active_content_check check (
        active is not true
        or archived is true
        or nullif(btrim(coalesce(template_type, '')), '') is not null
        or nullif(btrim(coalesce(prompt_guidance, '')), '') is not null
      );
  end if;
end;
$$;

drop trigger if exists outreach_sequences_touch_updated_at on public.outreach_sequences;
create trigger outreach_sequences_touch_updated_at before update on public.outreach_sequences
for each row execute function public.touch_updated_at();

drop trigger if exists outreach_steps_touch_updated_at on public.outreach_steps;
create trigger outreach_steps_touch_updated_at before update on public.outreach_steps
for each row execute function public.touch_updated_at();

create index if not exists outreach_sequences_active_band_idx
on public.outreach_sequences (band, created_at)
where active = true and archived = false;

create index if not exists outreach_steps_active_sequence_step_idx
on public.outreach_steps (sequence_id, step_number)
where active = true and archived = false;

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
  v_lead record;
  v_sequence_id uuid;
  v_queue_id uuid;
  v_status text;
begin
  select * into v_lead
  from public.leads
  where id = p_lead_id
  for update;

  if not found then
    raise exception 'Lead not found: %', p_lead_id;
  end if;

  if v_band is null then
    select upper(band) into v_band
    from public.lead_scores
    where lead_id = p_lead_id
    order by created_at desc
    limit 1;
  end if;

  v_band := coalesce(nullif(v_band, ''), 'C');

  if v_band = 'A' then
    update public.leads
    set status = 'pending_approval',
        last_activity_at = now(),
        updated_at = now()
    where id = p_lead_id;

    perform public.queue_manual_review_item(p_lead_id, 'band_a_approval', 'high');
    v_status := 'pending_approval';
  elsif v_band in ('B', 'C') then
    select id into v_sequence_id
    from public.outreach_sequences
    where active = true
      and archived = false
      and band = v_band
    order by created_at asc
    limit 1;

    if v_sequence_id is null then
      update public.leads
      set status = 'blocked',
          last_activity_at = now(),
          updated_at = now()
      where id = p_lead_id;

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
      set status = 'queued',
          last_activity_at = now(),
          updated_at = now()
      where id = p_lead_id
        and status not in ('replied', 'replied_interested', 'replied_not_interested', 'closed_won', 'closed_lost', 'unsubscribed', 'bounced', 'archived');

      v_status := 'queued';
    end if;
  else
    update public.leads
    set status = 'review_pending',
        last_activity_at = now(),
        updated_at = now()
    where id = p_lead_id;

    perform public.queue_manual_review_item(p_lead_id, 'low_score_or_band_d_review', 'normal');
    v_status := 'review_pending';
  end if;

  insert into public.workflow_events (workflow_name, lead_id, event_type, status, payload, created_at)
  values (
    'WF-04 Routing',
    p_lead_id,
    'route_scored_lead',
    'completed',
    jsonb_build_object('band', v_band, 'niche', p_niche, 'queue_id', v_queue_id, 'lead_status', v_status),
    now()
  );

  return jsonb_build_object('lead_id', p_lead_id, 'band', v_band, 'queue_id', v_queue_id, 'status', v_status);
end;
$$;

create or replace function public.load_draft_context(p_queue_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_queue record;
  v_lead record;
  v_step record;
  v_score jsonb;
  v_evidence jsonb;
  v_hypothesis jsonb;
  v_campaign jsonb;
begin
  select * into v_queue from public.outreach_queue where id = p_queue_id;
  if not found then
    raise exception 'Queue item not found: %', p_queue_id;
  end if;

  select * into v_lead from public.leads where id = v_queue.lead_id;
  select * into v_step
  from public.outreach_steps
  where sequence_id = v_queue.sequence_id
    and step_number = coalesce(v_queue.current_step, 1)
    and active = true
    and archived = false
  limit 1;

  select to_jsonb(ls.*) into v_score
  from public.lead_scores ls
  where ls.lead_id = v_queue.lead_id
  order by ls.created_at desc
  limit 1;

  select coalesce(jsonb_agg(to_jsonb(se.*) order by se.created_at desc), '[]'::jsonb) into v_evidence
  from public.score_evidence se
  where se.lead_id = v_queue.lead_id;

  select to_jsonb(ah.*) into v_hypothesis
  from public.automation_hypotheses ah
  where ah.lead_id = v_queue.lead_id
  order by ah.created_at desc
  limit 1;

  select to_jsonb(c.*) into v_campaign
  from public.campaigns c
  where c.id = v_lead.campaign_id;

  return jsonb_build_object(
    'queue', to_jsonb(v_queue),
    'lead', to_jsonb(v_lead),
    'step', coalesce(to_jsonb(v_step), '{}'::jsonb),
    'score', coalesce(v_score, '{}'::jsonb),
    'evidence', coalesce(v_evidence, '[]'::jsonb),
    'hypothesis', coalesce(v_hypothesis, '{}'::jsonb),
    'campaign', coalesce(v_campaign, '{}'::jsonb)
  );
end;
$$;

grant execute on function public.route_scored_lead(uuid, text, text) to authenticated;
grant execute on function public.route_scored_lead(uuid, text, text) to service_role;
grant execute on function public.load_draft_context(uuid) to service_role;
