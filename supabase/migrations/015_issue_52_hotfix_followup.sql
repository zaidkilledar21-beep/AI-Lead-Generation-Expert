-- Issue #52 hotfix follow-up (post PR #53): close remaining WF-04/WF-05 dedup gaps,
-- preserve existing pending manual reviews, and add an idempotent draft-uniqueness backstop.
-- Additive and non-destructive: create-or-replace views/functions and create-if-not-exists index.

-- 1. WF-04 source: only surface truly routeable scored leads. Skip leads that already have a
--    pending manual review, an existing outreach_queue row, or an existing draft. Those states
--    are handled by their own dedicated logic and must not be re-routed into duplicate work.
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
  and not exists (
    select 1
    from public.manual_review_queue mrq
    where mrq.lead_id = l.id
      and mrq.review_status = 'pending'
  )
  and not exists (
    select 1
    from public.outreach_queue oq
    where oq.lead_id = l.id
      and oq.status in ('queued', 'paused', 'blocked', 'replied', 'completed')
  )
  and not exists (
    select 1
    from public.email_drafts d
    where d.lead_id = l.id
  )
;

-- 2. WF-05 due-queue classifier: existing state must win before missing-email blocking.
--    Priority: block_missing_lead, skip_existing_draft, skip_existing_manual_review,
--    block_missing_email, block_invalid_lead_status, generate_draft.
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
    when nullif(trim(coalesce(l.email, '')), '') is null then 'block_missing_email'
    when l.status not in ('queued', 'drafted') then 'block_invalid_lead_status'
    else 'generate_draft'
  end as wf05_action
from public.outreach_queue q
left join public.leads l on l.id = q.lead_id
where q.status = 'queued'
  and q.next_send_at <= now();

-- 3. Preserve an existing pending manual review by default. Replacement of reason/priority is
--    only allowed via the explicit p_force overload. The duplicate-protection partial unique
--    index manual_review_one_pending_per_lead_idx (001) is preserved and relied upon here.
create or replace function public.queue_manual_review_item(
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

  -- Lead status syncs against the effective (stored) review reason so preserved reviews keep
  -- their original lifecycle mapping.
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

-- Keep the original 3-arg contract intact; delegate to the preserve-by-default overload.
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
  from public.queue_manual_review_item(p_lead_id, p_reason, p_priority, false) q;
end;
$$;

-- 4. Idempotent backstop for the persist_draft_or_block ON CONFLICT target. The 001 schema
--    already declares this as a table-level unique constraint; this guards databases where that
--    constraint was not committed. Safe to run repeatedly via "if not exists".
--    If pre-existing duplicates block creation, inspect them manually (do NOT auto-delete):
--      select lead_id, sequence_id, step_number, count(*)
--      from public.email_drafts
--      group by lead_id, sequence_id, step_number
--      having count(*) > 1;
--    Resolve duplicates by hand, then re-run this migration.
create unique index if not exists email_drafts_lead_sequence_step_uidx
  on public.email_drafts (lead_id, sequence_id, step_number);

-- Active-queue uniqueness: public.outreach_queue already enforces unique (lead_id, sequence_id)
-- from 001_initial_schema.sql, which is the equivalent active-queue uniqueness backing
-- route_scored_lead's ON CONFLICT (lead_id, sequence_id). No additional constraint is required,
-- so none is added here (avoids a destructive change against possible historical duplicates).

revoke all on function public.queue_manual_review_item(uuid, text, text, boolean) from public, anon, authenticated;
grant execute on function public.queue_manual_review_item(uuid, text, text, boolean) to service_role;
