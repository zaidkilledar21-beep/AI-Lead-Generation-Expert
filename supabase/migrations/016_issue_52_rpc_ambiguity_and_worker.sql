-- Issue #52 holistic follow-up: permanently fix the ambiguous queue_manual_review_item RPC and
-- add bounded resumable-worker support (review-pending sync + worker indexes).
-- Additive and non-destructive: drops only the redundant/overloaded RPC signatures, recreates a
-- single canonical RPC, and adds create-if-not-exists indexes.

-- =============================================================================
-- A) Remove the ambiguous overloads. PostgREST/Postgres could not resolve a 3-argument
--    queue_manual_review_item(uuid, unknown, unknown) call because the 4-arg
--    (uuid, text, text, boolean default false) overload also matched after defaults. The
--    legacy 5-arg (uuid, text, text, text, jsonb) overload has no live callers (all internal
--    callers use the 3-arg form), so it is dropped too. After this migration exactly ONE
--    function named queue_manual_review_item exists.
-- =============================================================================
drop function if exists public.queue_manual_review_item(uuid, text, text, boolean);
drop function if exists public.queue_manual_review_item(uuid, text, text, text, jsonb);

-- Single shared implementation. Distinct name (NOT an overload of queue_manual_review_item),
-- so PostgREST resolution of the canonical RPC stays unambiguous.
create or replace function public.queue_manual_review_item_sync(
  p_lead_id uuid,
  p_reason text,
  p_priority text,
  p_force boolean default false
)
returns table(id uuid, lead_id uuid, review_status text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reason text := lower(trim(coalesce(p_reason, 'manual_review_required')));
  v_priority text := lower(trim(coalesce(p_priority, 'normal')));
  v_force boolean := coalesce(p_force, false);
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
    set reason = case when v_force then excluded.reason else manual_review_queue.reason end,
        priority = case when v_force then excluded.priority else manual_review_queue.priority end,
        updated_at = now()
    returning * into v_item;
  elsif v_force then
    update public.manual_review_queue
    set reason = v_reason,
        priority = v_priority,
        updated_at = now()
    where manual_review_queue.id = v_item.id
    returning * into v_item;
  end if;
  -- When a pending review already exists and v_force is false, it is preserved unchanged.

  update public.leads l
  set status = case
      when l.status in ('closed_won', 'closed_lost', 'archived', 'unsubscribed') then l.status
      when v_item.reason like 'reply_%' and l.status like 'replied%' then l.status
      when v_item.reason like 'reply_%' then 'replied_needs_review'
      when v_item.reason in ('band_a_approval', 'band_b_approval', 'email_draft_pending_approval', 'draft_pending_approval') then 'pending_approval'
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
    jsonb_build_object(
      'reason', v_item.reason,
      'priority', v_item.priority,
      'requested_reason', v_reason,
      'requested_priority', v_priority,
      'forced', v_force,
      'manual_review_queue_id', v_item.id
    ),
    now()
  );

  return query select v_item.id, v_item.lead_id, v_item.review_status;
end;
$$;

-- Canonical, unambiguous public RPC: preserve an existing pending review by default.
create or replace function public.queue_manual_review_item(
  p_lead_id uuid,
  p_reason text,
  p_priority text
)
returns table(id uuid, lead_id uuid, review_status text)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  select q.id, q.lead_id, q.review_status
  from public.queue_manual_review_item_sync(p_lead_id, p_reason, p_priority, false) q;
end;
$$;

-- Explicit, differently named force/replace variant (no overload of the canonical name).
create or replace function public.queue_manual_review_item_force(
  p_lead_id uuid,
  p_reason text,
  p_priority text
)
returns table(id uuid, lead_id uuid, review_status text)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  select q.id, q.lead_id, q.review_status
  from public.queue_manual_review_item_sync(p_lead_id, p_reason, p_priority, true) q;
end;
$$;

-- =============================================================================
-- D) Bounded reconciliation helper: sync scored leads that already hold a pending manual review
--    back to review_pending so the parent run can finalize cleanly. Never overrides terminal,
--    replied, or archived statuses. Scoped to one run and indexed on discovery_run_id.
-- =============================================================================
create or replace function public.sync_run_review_pending(p_discovery_run_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  update public.leads l
  set status = 'review_pending',
      last_activity_at = now(),
      updated_at = now()
  where l.discovery_run_id = p_discovery_run_id
    and l.status = 'scored'
    and exists (
      select 1
      from public.manual_review_queue mrq
      where mrq.lead_id = l.id
        and mrq.review_status = 'pending'
    );

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- =============================================================================
-- C) Worker support indexes for bounded, indexed-filter batch selection. Idempotent.
-- =============================================================================
create index if not exists leads_discovery_run_status_idx
  on public.leads (discovery_run_id, status);

create index if not exists discovery_runs_status_started_idx
  on public.discovery_runs (status, started_at);

-- =============================================================================
-- Grants: every manual-review RPC and the worker helper are service_role only.
-- (Fixes a prior drift where the 3-arg queue_manual_review_item was executable by anon/authenticated.)
-- =============================================================================
revoke all on function public.queue_manual_review_item_sync(uuid, text, text, boolean) from public, anon, authenticated;
revoke all on function public.queue_manual_review_item(uuid, text, text) from public, anon, authenticated;
revoke all on function public.queue_manual_review_item_force(uuid, text, text) from public, anon, authenticated;
revoke all on function public.sync_run_review_pending(uuid) from public, anon, authenticated;

grant execute on function public.queue_manual_review_item_sync(uuid, text, text, boolean) to service_role;
grant execute on function public.queue_manual_review_item(uuid, text, text) to service_role;
grant execute on function public.queue_manual_review_item_force(uuid, text, text) to service_role;
grant execute on function public.sync_run_review_pending(uuid) to service_role;
