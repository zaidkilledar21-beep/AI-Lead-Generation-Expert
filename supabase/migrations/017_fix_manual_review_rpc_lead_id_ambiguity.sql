-- Migration 017: Permanently fix the ambiguous `lead_id` column reference inside
-- queue_manual_review_item_sync that caused WF-04 to fail with:
--   "column reference "lead_id" is ambiguous"
--
-- Root cause: migration 016 left an `on conflict (lead_id) where review_status = 'pending'`
-- clause inside the function body. Postgres/PostgREST could not disambiguate the bare
-- `lead_id` in the conflict target from the function's own return-table column also named
-- `lead_id`. The live DB was manually hotfixed; this migration makes that fix permanent.
--
-- Fix: replace the ambiguous ON CONFLICT path with an explicit SELECT → INSERT → exception
-- handler → re-SELECT pattern. All table references use qualified aliases (mrq.*) throughout.
-- External RPC contract is unchanged:
--   public.queue_manual_review_item(p_lead_id uuid, p_reason text, p_priority text)
--   public.queue_manual_review_item_force(p_lead_id uuid, p_reason text, p_priority text)
--   Return: table(id uuid, lead_id uuid, review_status text)
-- =============================================================================

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
  v_reason   text    := lower(trim(coalesce(p_reason, 'manual_review_required')));
  v_priority text    := lower(trim(coalesce(p_priority, 'normal')));
  v_force    boolean := coalesce(p_force, false);
  v_item     public.manual_review_queue%rowtype;
begin
  if v_priority not in ('low', 'normal', 'high', 'urgent') then
    v_priority := 'normal';
  end if;

  -- Step 1: attempt to lock an existing pending review for this lead.
  select mrq.*
  into   v_item
  from   public.manual_review_queue as mrq
  where  mrq.lead_id = p_lead_id
    and  mrq.review_status = 'pending'
  order  by mrq.created_at asc
  limit  1
  for update;

  if v_item.id is null then
    -- Step 2: no existing pending row — try to insert one.
    begin
      insert into public.manual_review_queue
             (lead_id,    reason,    priority,    review_status, created_at, updated_at)
      values (p_lead_id, v_reason, v_priority, 'pending',     now(),      now())
      returning
        manual_review_queue.id,
        manual_review_queue.lead_id,
        manual_review_queue.reason,
        manual_review_queue.priority,
        manual_review_queue.review_status,
        manual_review_queue.created_at,
        manual_review_queue.updated_at,
        manual_review_queue.reviewed_at,
        manual_review_queue.reviewed_by
      into v_item;

    exception when unique_violation then
      -- A concurrent insert won the race; re-select and lock it.
      select mrq.*
      into   v_item
      from   public.manual_review_queue as mrq
      where  mrq.lead_id = p_lead_id
        and  mrq.review_status = 'pending'
      order  by mrq.created_at asc
      limit  1
      for update;
    end;
  end if;

  -- Step 3: if force-update is requested, overwrite reason/priority on the existing row.
  if v_force and v_item.id is not null then
    update public.manual_review_queue as mrq
    set    reason     = v_reason,
           priority   = v_priority,
           updated_at = now()
    where  mrq.id = v_item.id
    returning
      mrq.id,
      mrq.lead_id,
      mrq.reason,
      mrq.priority,
      mrq.review_status,
      mrq.created_at,
      mrq.updated_at,
      mrq.reviewed_at,
      mrq.reviewed_by
    into v_item;
  end if;
  -- When a pending review already exists and v_force is false, it is preserved unchanged.

  -- Step 4: update the lead's status according to the review reason.
  update public.leads as l
  set    status           = case
           when l.status in ('closed_won', 'closed_lost', 'archived', 'unsubscribed') then l.status
           when v_item.reason like 'reply_%' and l.status like 'replied%'             then l.status
           when v_item.reason like 'reply_%'                                           then 'replied_needs_review'
           when v_item.reason in (
                  'band_a_approval', 'band_b_approval',
                  'email_draft_pending_approval', 'draft_pending_approval'
                )                                                                       then 'pending_approval'
           else 'review_pending'
         end,
         last_activity_at = now(),
         updated_at       = now()
  where  l.id = p_lead_id;

  -- Step 5: emit a workflow event for observability.
  insert into public.workflow_events
         (workflow_name,        lead_id,    event_type,              status,      payload,                                         created_at)
  values ('Workflow Manual Review', p_lead_id, 'manual_review_queued', 'completed',
          jsonb_build_object(
            'reason',                 v_item.reason,
            'priority',               v_item.priority,
            'requested_reason',       v_reason,
            'requested_priority',     v_priority,
            'forced',                 v_force,
            'manual_review_queue_id', v_item.id
          ),
          now());

  return query select v_item.id, v_item.lead_id, v_item.review_status;
end;
$$;

-- Canonical, unambiguous public RPC: preserve an existing pending review by default.
-- (Recreated here to ensure the body always delegates to the corrected _sync impl.)
create or replace function public.queue_manual_review_item(
  p_lead_id  uuid,
  p_reason   text,
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
    from   public.queue_manual_review_item_sync(p_lead_id, p_reason, p_priority, false) as q;
end;
$$;

-- Explicit force/replace variant (differently named — not an overload of the canonical name).
create or replace function public.queue_manual_review_item_force(
  p_lead_id  uuid,
  p_reason   text,
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
    from   public.queue_manual_review_item_sync(p_lead_id, p_reason, p_priority, true) as q;
end;
$$;

-- =============================================================================
-- Grants: re-apply service_role-only access after the function recreation.
-- =============================================================================
revoke all on function public.queue_manual_review_item_sync(uuid, text, text, boolean) from public, anon, authenticated;
revoke all on function public.queue_manual_review_item(uuid, text, text)               from public, anon, authenticated;
revoke all on function public.queue_manual_review_item_force(uuid, text, text)         from public, anon, authenticated;

grant execute on function public.queue_manual_review_item_sync(uuid, text, text, boolean) to service_role;
grant execute on function public.queue_manual_review_item(uuid, text, text)               to service_role;
grant execute on function public.queue_manual_review_item_force(uuid, text, text)         to service_role;
