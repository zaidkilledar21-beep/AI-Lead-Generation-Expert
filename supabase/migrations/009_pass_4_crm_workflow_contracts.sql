-- Pass 4 CRM workflow contract closure.
-- Supabase remains the source of truth, n8n owns automation execution, and
-- CRM actions only change review/control state for WF-05/WF-06/WF-07 to consume.

alter table campaigns
  alter column lead_source set default 'google_places';

update campaigns
set lead_source = 'google_places'
where lead_source = 'google_maps' or lead_source is null;

update discovery_runs
set source = 'google_places'
where source = 'google_maps' or source is null;

update leads
set source = 'google_places'
where source = 'google_maps';

alter table email_drafts
  add column if not exists edited_by_founder text,
  add column if not exists edited_at timestamptz;

do $$
declare
  constraint_record record;
begin
  for constraint_record in
    select conname
    from pg_constraint
    where conrelid = 'email_drafts'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) like '%approval_status%'
  loop
    execute format('alter table email_drafts drop constraint %I', constraint_record.conname);
  end loop;

  for constraint_record in
    select conname
    from pg_constraint
    where conrelid = 'manual_review_queue'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) like '%review_status%'
  loop
    execute format('alter table manual_review_queue drop constraint %I', constraint_record.conname);
  end loop;
end;
$$;

update manual_review_queue
set review_status = 'rejected',
    review_notes = coalesce(review_notes, 'Legacy handled status normalized during Pass 4 migration.')
where review_status = 'handled';

alter table email_drafts
  add constraint email_drafts_approval_status_check check (
    approval_status in ('pending', 'approved', 'auto_approved', 'rejected', 'blocked', 'regeneration_requested')
  );

alter table manual_review_queue
  add constraint manual_review_queue_review_status_check check (
    review_status in ('pending', 'approved', 'rejected')
  );

create table if not exists notification_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  channel text not null default 'email',
  recipient text,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'queued',
  error_message text,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);

create index if not exists notification_events_status_created_idx on notification_events (status, created_at desc);
create index if not exists notification_events_type_created_idx on notification_events (event_type, created_at desc);

alter table notification_events enable row level security;

drop policy if exists "authenticated read notification events" on notification_events;
create policy "authenticated read notification events" on notification_events
for select to authenticated
using (is_dashboard_user());

grant select on notification_events to authenticated;
grant all privileges on notification_events to service_role;

-- Reply lifecycle RPC: WF-07 inserts replies here and pauses all future outreach
-- for that lead. Interested replies are deliberately not answered by CRM code.
create or replace function queue_manual_review_item(
  target_lead_id uuid,
  review_reason text,
  review_priority text default 'normal',
  assigned_founder text default null,
  review_metadata jsonb default '{}'::jsonb
)
returns table(id uuid, lead_id uuid, review_status text)
language plpgsql
security definer
set search_path = public
as $$
declare
  existing_item manual_review_queue%rowtype;
  inserted_item manual_review_queue%rowtype;
begin
  select *
  into existing_item
  from manual_review_queue mrq
  where mrq.lead_id = target_lead_id
    and mrq.reason is not distinct from review_reason
    and mrq.review_status = 'pending'
  order by mrq.created_at asc
  limit 1;

  if existing_item.id is not null then
    return query select existing_item.id, existing_item.lead_id, existing_item.review_status;
    return;
  end if;

  insert into manual_review_queue (
    lead_id,
    reason,
    priority,
    assigned_to,
    review_status,
    review_notes
  )
  values (
    target_lead_id,
    review_reason,
    coalesce(review_priority, 'normal'),
    assigned_founder,
    'pending',
    case when review_metadata = '{}'::jsonb then null else review_metadata::text end
  )
  returning *
  into inserted_item;

  update leads l
  set status = case
      when l.status in (
        'replied',
        'replied_interested',
        'replied_not_interested',
        'replied_needs_review',
        'closed_won',
        'closed_lost',
        'unsubscribed',
        'bounced',
        'not_interested',
        'archived'
      ) then l.status
      else 'review_pending'
    end,
    last_activity_at = now()
  where l.id = target_lead_id;

  return query select inserted_item.id, inserted_item.lead_id, inserted_item.review_status;
end;
$$;

revoke all on function queue_manual_review_item(uuid, text, text, text, jsonb) from public;
grant execute on function queue_manual_review_item(uuid, text, text, text, jsonb) to anon;
grant execute on function queue_manual_review_item(uuid, text, text, text, jsonb) to authenticated;
grant execute on function queue_manual_review_item(uuid, text, text, text, jsonb) to service_role;

-- Sending safety contracts: dashboard approval still queues only; WF-06 remains
-- the sole scheduler-owned sender, and global pause/reply checks block sends.
grant execute on function dashboard_update_lead_status(uuid, text) to authenticated;
grant execute on function dashboard_update_lead_status(uuid, text) to service_role;
grant execute on function dashboard_approve_lead_for_outreach(uuid) to authenticated;
grant execute on function dashboard_approve_lead_for_outreach(uuid) to service_role;
grant execute on function reserve_places_quota(uuid, text, integer, integer, integer) to anon;
grant execute on function reserve_places_quota(uuid, text, integer, integer, integer) to authenticated;
grant execute on function reserve_places_quota(uuid, text, integer, integer, integer) to service_role;

create or replace function sending_global_outreach_allowed()
returns jsonb
language sql
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'allowed',
    not coalesce((select (value->>'paused')::boolean from app_settings where key = 'global_outreach'), true)
  );
$$;

create or replace function select_available_sending_inbox()
returns table(id uuid, email_address text, provider text, daily_send_limit integer, current_daily_sent integer)
language sql
security definer
set search_path = public
as $$
  select i.id, i.email_address, i.provider, i.daily_send_limit, i.current_daily_sent
  from inboxes i
  where i.active = true
    and coalesce(i.current_daily_sent, 0) < coalesce(i.daily_send_limit, 0)
  order by i.last_sent_at nulls first, i.created_at asc
  limit 1;
$$;

create or replace function select_approved_due_email_draft()
returns table(
  draft_id uuid,
  queue_id uuid,
  lead_id uuid,
  lead_email text,
  subject text,
  body text,
  sequence_id uuid,
  step_number integer
)
language sql
security definer
set search_path = public
as $$
  select
    d.id as draft_id,
    q.id as queue_id,
    l.id as lead_id,
    l.email as lead_email,
    coalesce(d.subject, d.subject_line) as subject,
    coalesce(d.body, d.message_body) as body,
    q.sequence_id,
    q.current_step as step_number
  from outreach_queue q
  join leads l on l.id = q.lead_id
  join email_drafts d
    on d.lead_id = q.lead_id
   and d.sequence_id = q.sequence_id
   and d.step_number = q.current_step
  where q.status = 'queued'
    and q.next_send_at <= now()
    and coalesce(d.sent, false) = false
    and d.validation_passed = true
    and d.approval_status in ('approved', 'auto_approved')
    and l.email is not null
    and not exists (select 1 from reply_events re where re.lead_id = l.id)
  order by q.next_send_at asc
  limit 1;
$$;

create or replace function update_email_send_state(
  p_draft_id uuid,
  p_gmail_message_id text,
  p_inbox_id uuid,
  p_lead_id uuid,
  p_queue_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  selected_queue outreach_queue%rowtype;
  next_step outreach_steps%rowtype;
begin
  select * into selected_queue
  from outreach_queue
  where id = p_queue_id
  for update;

  update email_drafts
  set sent = true,
      sent_at = now(),
      provider_message_id = p_gmail_message_id,
      updated_at = now()
  where id = p_draft_id
    and lead_id = p_lead_id
    and approval_status in ('approved', 'auto_approved');

  insert into outreach_events (
    lead_id,
    queue_id,
    sequence_id,
    step_number,
    channel,
    event_type,
    status,
    provider_message_id,
    sent_at,
    metadata,
    created_at
  )
  values (
    p_lead_id,
    p_queue_id,
    selected_queue.sequence_id,
    selected_queue.current_step,
    'email',
    'email_sent',
    'sent',
    p_gmail_message_id,
    now(),
    jsonb_build_object('gmail_message_id', p_gmail_message_id, 'inbox_id', p_inbox_id),
    now()
  );

  update inboxes
  set current_daily_sent = coalesce(current_daily_sent, 0) + 1,
      last_sent_at = now(),
      updated_at = now()
  where id = p_inbox_id;

  select * into next_step
  from outreach_steps
  where sequence_id = selected_queue.sequence_id
    and step_number = selected_queue.current_step + 1
    and active = true
  limit 1;

  if next_step.id is null then
    update outreach_queue
    set status = 'completed',
        last_sent_at = now(),
        updated_at = now()
    where id = p_queue_id;
  else
    update outreach_queue
    set current_step = next_step.step_number,
        next_send_at = now() + make_interval(days => next_step.delay_days),
        last_sent_at = now(),
        updated_at = now()
    where id = p_queue_id;
  end if;

  update leads
  set status = case when status in ('replied', 'replied_interested', 'replied_not_interested', 'replied_needs_review') then status else 'in_sequence' end,
      last_activity_at = now()
  where id = p_lead_id;

  return jsonb_build_object('updated', true, 'draft_id', p_draft_id, 'lead_id', p_lead_id);
end;
$$;

create or replace function match_reply_to_lead(
  p_from_email text,
  p_provider_message_id text default null,
  p_provider_thread_id text default null
)
returns table(lead_id uuid, business_name text, lead_email text, matched_by text)
language sql
security definer
set search_path = public
as $$
  with thread_match as (
    select l.id, l.business_name, l.email, 'provider_thread_id'::text as matched_by
    from outreach_events oe
    join leads l on l.id = oe.lead_id
    where p_provider_thread_id is not null
      and (oe.provider_thread_id = p_provider_thread_id or oe.metadata->>'provider_thread_id' = p_provider_thread_id)
    order by oe.created_at desc
    limit 1
  ),
  email_match as (
    select l.id, l.business_name, l.email, 'from_email'::text as matched_by
    from leads l
    where p_from_email is not null
      and lower(l.email) = lower(p_from_email)
    order by l.updated_at desc nulls last, l.created_at desc
    limit 1
  )
  select tm.id, tm.business_name, tm.email, tm.matched_by from thread_match tm
  union all
  select em.id, em.business_name, em.email, em.matched_by from email_match em
  where not exists (select 1 from thread_match)
  limit 1;
$$;

create or replace function insert_reply_event(
  p_lead_id uuid,
  p_from_email text,
  p_to_email text,
  p_reply_body text,
  p_provider_message_id text default null,
  p_provider_thread_id text default null
)
returns table(reply_event_id uuid, lead_id uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  inserted_id uuid;
begin
  insert into reply_events (
    lead_id,
    from_email,
    to_email,
    reply_body,
    provider_message_id,
    provider_thread_id,
    requires_human_review,
    reply_received_at
  )
  values (
    p_lead_id,
    p_from_email,
    p_to_email,
    p_reply_body,
    p_provider_message_id,
    p_provider_thread_id,
    true,
    now()
  )
  returning id into inserted_id;

  return query select inserted_id, p_lead_id;
end;
$$;

create or replace function pause_queue_after_reply(
  p_lead_id uuid,
  p_intent_classification text,
  p_sentiment text,
  p_requires_human_review boolean default true,
  p_reply_event_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  next_status text := 'replied';
begin
  if p_intent_classification in ('positive_interest', 'interested', 'pricing_request', 'call_request') then
    next_status := 'replied_interested';
  elsif p_intent_classification in ('not_interested', 'unsubscribe', 'opt_out') then
    next_status := 'replied_not_interested';
  elsif coalesce(p_requires_human_review, true) then
    next_status := 'replied_needs_review';
  end if;

  update reply_events
  set intent_classification = p_intent_classification,
      sentiment = p_sentiment,
      requires_human_review = coalesce(p_requires_human_review, true),
      updated_at = now()
  where id = p_reply_event_id;

  update outreach_queue
  set status = 'replied',
      pause_reason = 'reply_detected',
      updated_at = now()
  where lead_id = p_lead_id
    and status in ('queued', 'drafted', 'paused');

  update leads
  set status = next_status,
      last_reply_at = now(),
      last_activity_at = now()
  where id = p_lead_id;

  if coalesce(p_requires_human_review, true) then
    perform *
    from queue_manual_review_item(
      p_lead_id,
      'reply_requires_founder_review',
      case when next_status = 'replied_interested' then 'urgent' else 'high' end,
      null,
      jsonb_build_object('reply_event_id', p_reply_event_id, 'intent_classification', p_intent_classification)
    );
  end if;

  return jsonb_build_object('paused', true, 'lead_id', p_lead_id, 'lead_status', next_status);
end;
$$;

revoke all on function sending_global_outreach_allowed() from public;
revoke all on function select_available_sending_inbox() from public;
revoke all on function select_approved_due_email_draft() from public;
revoke all on function update_email_send_state(uuid, text, uuid, uuid, uuid) from public;
revoke all on function match_reply_to_lead(text, text, text) from public;
revoke all on function insert_reply_event(uuid, text, text, text, text, text) from public;
revoke all on function pause_queue_after_reply(uuid, text, text, boolean, uuid) from public;

grant execute on function sending_global_outreach_allowed() to anon, authenticated, service_role;
grant execute on function select_available_sending_inbox() to anon, authenticated, service_role;
grant execute on function select_approved_due_email_draft() to anon, authenticated, service_role;
grant execute on function update_email_send_state(uuid, text, uuid, uuid, uuid) to anon, authenticated, service_role;
grant execute on function match_reply_to_lead(text, text, text) to anon, authenticated, service_role;
grant execute on function insert_reply_event(uuid, text, text, text, text, text) to anon, authenticated, service_role;
grant execute on function pause_queue_after_reply(uuid, text, text, boolean, uuid) to anon, authenticated, service_role;

-- CRM-facing analytics and workflow telemetry remain version-controlled via the
-- views in 007_crm_prd_compatibility.sql and workflow_events.
