-- Issue #52: permanent discovery recovery, WF-04 routing, and WF-05 draft-source hardening.

create table if not exists public.discovery_recovery_leases (
  discovery_run_id uuid primary key references public.discovery_runs(id) on delete cascade,
  lease_token uuid not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.discovery_recovery_leases enable row level security;

create or replace function public.acquire_discovery_recovery_lease(
  p_discovery_run_id uuid,
  p_lease_token uuid,
  p_lease_seconds integer default 300
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_acquired uuid;
begin
  insert into public.discovery_recovery_leases (discovery_run_id, lease_token, expires_at, created_at, updated_at)
  values (p_discovery_run_id, p_lease_token, now() + make_interval(secs => greatest(30, least(coalesce(p_lease_seconds, 300), 900))), now(), now())
  on conflict (discovery_run_id) do update
  set lease_token = excluded.lease_token,
      expires_at = excluded.expires_at,
      updated_at = now()
  where discovery_recovery_leases.expires_at <= now()
  returning lease_token into v_acquired;

  return v_acquired = p_lease_token;
end;
$$;

create or replace function public.release_discovery_recovery_lease(
  p_discovery_run_id uuid,
  p_lease_token uuid
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_deleted integer;
begin
  delete from public.discovery_recovery_leases
  where discovery_run_id = p_discovery_run_id
    and lease_token = p_lease_token;

  get diagnostics v_deleted = row_count;
  return v_deleted > 0;
end;
$$;

create or replace function public.queue_manual_review_item(
  p_lead_id uuid,
  p_reason text,
  p_priority text default 'normal'
)
returns table(id uuid, lead_id uuid, review_status text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reason text := lower(trim(coalesce(p_reason, 'manual_review_required')));
  v_priority text := lower(trim(coalesce(p_priority, 'normal')));
  v_item public.manual_review_queue%rowtype;
begin
  if v_priority not in ('low', 'normal', 'high', 'urgent') then
    v_priority := 'normal';
  end if;

  select *
  into v_item
  from public.manual_review_queue mrq
  where mrq.lead_id = p_lead_id
    and mrq.review_status = 'pending'
  order by mrq.created_at asc
  limit 1
  for update;

  if v_item.id is null then
    insert into public.manual_review_queue (lead_id, reason, priority, review_status, created_at, updated_at)
    values (p_lead_id, v_reason, v_priority, 'pending', now(), now())
    on conflict (lead_id) where review_status = 'pending' do update
    set reason = excluded.reason,
        priority = excluded.priority,
        updated_at = now()
    returning * into v_item;
  else
    update public.manual_review_queue
    set reason = v_reason,
        priority = v_priority,
        updated_at = now()
    where manual_review_queue.id = v_item.id
    returning * into v_item;
  end if;

  update public.leads l
  set status = case
      when l.status in ('closed_won', 'closed_lost', 'archived', 'unsubscribed') then l.status
      when v_reason like 'reply_%' and l.status like 'replied%' then l.status
      when v_reason like 'reply_%' then 'replied_needs_review'
      when v_reason in ('band_a_approval', 'band_b_approval', 'email_draft_pending_approval', 'draft_pending_approval') then 'pending_approval'
      else 'review_pending'
    end,
    last_activity_at = now(),
    updated_at = now()
  where l.id = p_lead_id;

  insert into public.workflow_events (workflow_name, lead_id, event_type, status, payload, created_at)
  values (
    'Workflow Manual Review',
    p_lead_id,
    'manual_review_queued',
    'completed',
    jsonb_build_object('reason', v_reason, 'priority', v_priority, 'manual_review_queue_id', v_item.id),
    now()
  );

  return query select v_item.id, v_item.lead_id, v_item.review_status;
end;
$$;

create unique index if not exists lead_scores_lead_prompt_model_idx
on public.lead_scores (lead_id, prompt_version, model)
where prompt_version is not null and model is not null;

create unique index if not exists score_evidence_score_metric_idx
on public.score_evidence (lead_score_id, metric_name);

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
  ah.outreach_hook
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
;

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
    select 1
    from public.email_drafts d
    where d.lead_id = q.lead_id
      and d.sequence_id = q.sequence_id
      and d.step_number = coalesce(q.current_step, 1)
  ) as has_existing_draft,
  exists (
    select 1
    from public.manual_review_queue mrq
    where mrq.lead_id = q.lead_id
      and mrq.review_status = 'pending'
  ) as has_pending_manual_review,
  case
    when l.id is null then 'block_missing_lead'
    when nullif(trim(coalesce(l.email, '')), '') is null then 'block_missing_email'
    when exists (
      select 1
      from public.email_drafts d
      where d.lead_id = q.lead_id
        and d.sequence_id = q.sequence_id
        and d.step_number = coalesce(q.current_step, 1)
    ) then 'skip_existing_draft'
    when exists (
      select 1
      from public.manual_review_queue mrq
      where mrq.lead_id = q.lead_id
        and mrq.review_status = 'pending'
    ) then 'skip_existing_manual_review'
    when l.status not in ('queued', 'drafted') then 'block_invalid_lead_status'
    else 'generate_draft'
  end as wf05_action
from public.outreach_queue q
left join public.leads l on l.id = q.lead_id
where q.status = 'queued'
  and q.next_send_at <= now();

create or replace function public.sync_wf05_queue_action(
  p_queue_id uuid,
  p_action text
)
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
  select * into v_queue
  from public.outreach_queue
  where id = p_queue_id
  for update;

  if not found then
    return jsonb_build_object('queue_id', p_queue_id, 'status', 'skipped', 'reason', 'queue_not_found');
  end if;

  if v_action = 'skip_existing_draft' then
    update public.outreach_queue
    set status = 'drafted',
        updated_at = now()
    where id = p_queue_id;

    update public.leads
    set status = 'drafted',
        last_activity_at = now(),
        updated_at = now()
    where id = v_queue.lead_id
      and status not in ('replied', 'replied_interested', 'replied_not_interested', 'closed_won', 'closed_lost', 'unsubscribed', 'bounced', 'archived');
  elsif v_action in ('block_missing_email', 'skip_existing_manual_review', 'block_invalid_lead_status', 'block_missing_lead') then
    v_reason := case
      when v_action = 'block_missing_email' then 'missing_email'
      when v_action = 'skip_existing_manual_review' then 'pending_manual_review'
      when v_action = 'block_invalid_lead_status' then 'invalid_lead_status'
      else 'missing_lead'
    end;

    update public.outreach_queue
    set status = 'blocked',
        pause_reason = v_reason,
        updated_at = now()
    where id = p_queue_id;

    if v_action <> 'block_missing_lead' then
      update public.leads
      set status = 'review_pending',
          last_activity_at = now(),
          updated_at = now()
      where id = v_queue.lead_id;

      if v_action <> 'skip_existing_manual_review' then
        perform public.queue_manual_review_item(v_queue.lead_id, v_reason, 'high');
      end if;
    end if;
  else
    raise exception 'Unsupported WF-05 action: %', p_action;
  end if;

  insert into public.workflow_events (workflow_name, lead_id, event_type, status, payload, created_at)
  values (
    'WF-05 Draft Generation',
    v_queue.lead_id,
    'wf05_queue_action_synced',
    'completed',
    jsonb_build_object('queue_id', p_queue_id, 'wf05_action', v_action, 'pause_reason', v_reason),
    now()
  );

  return jsonb_build_object('queue_id', p_queue_id, 'lead_id', v_queue.lead_id, 'status', 'synced', 'wf05_action', v_action, 'pause_reason', v_reason);
end;
$$;

revoke all on table public.discovery_recovery_leases from anon, authenticated;
revoke all on function public.acquire_discovery_recovery_lease(uuid, uuid, integer) from public, anon, authenticated;
revoke all on function public.release_discovery_recovery_lease(uuid, uuid) from public, anon, authenticated;
revoke all on function public.sync_wf05_queue_action(uuid, text) from public, anon, authenticated;
grant select on table public.wf04_scored_leads to service_role;
grant select on table public.wf05_due_queue_items to service_role;
grant execute on function public.acquire_discovery_recovery_lease(uuid, uuid, integer) to service_role;
grant execute on function public.release_discovery_recovery_lease(uuid, uuid) to service_role;
grant execute on function public.sync_wf05_queue_action(uuid, text) to service_role;
