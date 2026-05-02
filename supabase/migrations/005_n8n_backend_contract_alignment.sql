-- Align checked-in tables with the live n8n WF-04 through WF-08 RPC contracts.
-- The RPC bodies already exist in the live Supabase project; this migration keeps
-- table shape, constraints, indexes, and grants compatible with those functions.

alter table leads
  add column if not exists last_reply_at timestamptz;

alter table outreach_queue
  add column if not exists updated_at timestamptz default now();

alter table outreach_events
  add column if not exists queue_id uuid references outreach_queue(id) on delete set null,
  add column if not exists event_type text,
  add column if not exists metadata jsonb not null default '{}'::jsonb,
  add column if not exists created_at timestamptz default now();

alter table outreach_events
  alter column lead_id drop not null;

update outreach_events
set event_type = coalesce(event_type, status, 'outreach_event')
where event_type is null;

alter table outreach_events
  alter column event_type set not null;

alter table email_drafts
  add column if not exists queue_id uuid references outreach_queue(id) on delete set null,
  add column if not exists channel text not null default 'email',
  add column if not exists subject text,
  add column if not exists body text,
  add column if not exists block_reason text,
  add column if not exists raw_draft jsonb not null default '{}'::jsonb,
  add column if not exists sent_at timestamptz,
  add column if not exists provider_message_id text,
  add column if not exists provider_thread_id text,
  add column if not exists updated_at timestamptz default now();

alter table email_drafts
  alter column sequence_id drop not null,
  alter column step_number drop not null,
  alter column subject_line drop not null,
  alter column message_body drop not null;

update email_drafts
set
  subject = coalesce(subject, subject_line),
  body = coalesce(body, message_body)
where subject is null
   or body is null;

alter table send_blocks
  add column if not exists queue_id uuid references outreach_queue(id) on delete set null,
  add column if not exists reason text,
  add column if not exists raw_payload jsonb not null default '{}'::jsonb,
  add column if not exists updated_at timestamptz default now();

alter table send_blocks
  alter column block_reason drop not null,
  alter column block_type drop not null;

update send_blocks
set reason = coalesce(reason, block_reason)
where reason is null;

alter table inboxes
  add column if not exists updated_at timestamptz default now();

alter table reply_events
  add column if not exists summary text,
  add column if not exists suggested_next_action text,
  add column if not exists updated_at timestamptz default now();

do $$
declare
  constraint_record record;
begin
  for constraint_record in
    select conname
    from pg_constraint
    where conrelid = 'leads'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) like '%status%'
  loop
    execute format('alter table leads drop constraint %I', constraint_record.conname);
  end loop;

  for constraint_record in
    select conname
    from pg_constraint
    where conrelid = 'outreach_queue'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) like '%status%'
  loop
    execute format('alter table outreach_queue drop constraint %I', constraint_record.conname);
  end loop;

  for constraint_record in
    select conname
    from pg_constraint
    where conrelid = 'reply_events'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) like '%intent_classification%'
  loop
    execute format('alter table reply_events drop constraint %I', constraint_record.conname);
  end loop;

  for constraint_record in
    select conname
    from pg_constraint
    where conrelid = 'reply_events'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) like '%sentiment%'
  loop
    execute format('alter table reply_events drop constraint %I', constraint_record.conname);
  end loop;
end;
$$;

alter table leads
  add constraint leads_status_check check (
    status in (
      'new',
      'enriched',
      'scored',
      'review_pending',
      'queued',
      'paused',
      'blocked',
      'completed',
      'replied',
      'replied_interested',
      'replied_not_interested',
      'replied_needs_review',
      'unsubscribed',
      'bounced',
      'not_interested',
      'archived'
    )
  );

alter table outreach_queue
  add constraint outreach_queue_status_check check (
    status in ('queued', 'drafted', 'paused', 'replied', 'blocked', 'completed')
  );

alter table reply_events
  add constraint reply_events_intent_classification_check check (
    intent_classification is null
    or intent_classification in (
      'interested',
      'pricing_request',
      'call_request',
      'not_interested',
      'unsubscribe',
      'opt_out',
      'question',
      'ambiguous',
      'bounce_or_noise',
      -- Legacy values kept so existing rows do not block the migration.
      'positive_interest',
      'neutral_question',
      'objection',
      'out_of_office',
      'wrong_person',
      'bounce',
      'manual_review_required'
    )
  );

alter table reply_events
  add constraint reply_events_sentiment_check check (
    sentiment is null
    or sentiment in ('positive', 'neutral', 'negative', 'unclear')
  );

create or replace function sync_email_draft_contract_columns()
returns trigger
language plpgsql
as $$
declare
  selected_queue outreach_queue%rowtype;
begin
  if new.queue_id is not null then
    select *
    into selected_queue
    from outreach_queue
    where id = new.queue_id;

    new.sequence_id := coalesce(new.sequence_id, selected_queue.sequence_id);
    new.step_number := coalesce(new.step_number, selected_queue.current_step);
  end if;

  new.subject := coalesce(new.subject, new.subject_line);
  new.body := coalesce(new.body, new.message_body);
  new.subject_line := coalesce(new.subject_line, new.subject);
  new.message_body := coalesce(new.message_body, new.body);
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists email_drafts_sync_contract_columns on email_drafts;
create trigger email_drafts_sync_contract_columns
before insert or update on email_drafts
for each row execute function sync_email_draft_contract_columns();

create or replace function sync_send_block_contract_columns()
returns trigger
language plpgsql
as $$
begin
  new.reason := coalesce(new.reason, new.block_reason);
  new.block_reason := coalesce(new.block_reason, new.reason, 'send_blocked');
  new.block_type := coalesce(new.block_type, 'workflow');
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists send_blocks_sync_contract_columns on send_blocks;
create trigger send_blocks_sync_contract_columns
before insert or update on send_blocks
for each row execute function sync_send_block_contract_columns();

drop trigger if exists email_drafts_touch_updated_at on email_drafts;
create trigger email_drafts_touch_updated_at before update on email_drafts
for each row execute function touch_updated_at();

drop trigger if exists send_blocks_touch_updated_at on send_blocks;
create trigger send_blocks_touch_updated_at before update on send_blocks
for each row execute function touch_updated_at();

drop trigger if exists inboxes_touch_updated_at on inboxes;
create trigger inboxes_touch_updated_at before update on inboxes
for each row execute function touch_updated_at();

drop trigger if exists reply_events_touch_updated_at on reply_events;
create trigger reply_events_touch_updated_at before update on reply_events
for each row execute function touch_updated_at();

create index if not exists outreach_queue_drafted_due_idx on outreach_queue (status, next_send_at)
where status in ('queued', 'drafted');

create index if not exists email_drafts_queue_idx on email_drafts (queue_id)
where queue_id is not null;

create index if not exists email_drafts_approval_due_idx on email_drafts (approval_status, sent, created_at desc);

create index if not exists email_drafts_lead_step_idx on email_drafts (lead_id, sequence_id, step_number);

create index if not exists send_blocks_queue_idx on send_blocks (queue_id)
where queue_id is not null;

create index if not exists outreach_events_event_created_idx on outreach_events (event_type, created_at desc);

create index if not exists outreach_events_queue_created_idx on outreach_events (queue_id, created_at desc)
where queue_id is not null;

create index if not exists outreach_events_metadata_thread_idx on outreach_events ((metadata->>'provider_thread_id'))
where metadata ? 'provider_thread_id';

create index if not exists outreach_events_metadata_message_idx on outreach_events ((metadata->>'provider_message_id'))
where metadata ? 'provider_message_id';

create index if not exists outreach_events_metadata_gmail_message_idx on outreach_events ((metadata->>'gmail_message_id'))
where metadata ? 'gmail_message_id';

create index if not exists reply_events_provider_thread_idx on reply_events (provider_thread_id)
where provider_thread_id is not null;

create index if not exists reply_events_provider_message_idx on reply_events (provider_message_id)
where provider_message_id is not null;

create index if not exists inboxes_active_capacity_idx on inboxes (active, current_daily_sent, daily_send_limit);

create index if not exists leads_weekly_region_idx on leads (city, country, created_at desc);

create or replace function dashboard_approve_lead_for_outreach(target_lead_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  selected_lead leads%rowtype;
  selected_score lead_scores%rowtype;
  selected_sequence outreach_sequences%rowtype;
  reply_count integer;
  block_count integer;
  global_paused boolean := true;
begin
  if not is_dashboard_user(array['founder', 'admin']) then
    raise exception 'Founder or admin access required';
  end if;

  select * into selected_lead
  from leads
  where id = target_lead_id;

  if selected_lead.id is null then
    raise exception 'Lead not found';
  end if;

  if selected_lead.status in (
    'paused',
    'replied',
    'replied_interested',
    'replied_not_interested',
    'replied_needs_review',
    'unsubscribed',
    'bounced',
    'not_interested',
    'archived'
  ) then
    raise exception 'Lead status blocks outreach approval: %', selected_lead.status;
  end if;

  if selected_lead.email is null or length(btrim(selected_lead.email)) = 0 then
    raise exception 'Lead needs a prospect email before outreach approval';
  end if;

  select coalesce((value->>'paused')::boolean, true)
  into global_paused
  from app_settings
  where key = 'global_outreach';

  if coalesce(global_paused, true) then
    raise exception 'Global outreach is paused';
  end if;

  select count(*) into reply_count
  from reply_events
  where lead_id = target_lead_id;

  if reply_count > 0 then
    raise exception 'Lead already has a reply; outreach must remain paused';
  end if;

  select count(*) into block_count
  from send_blocks
  where lead_id = target_lead_id;

  if block_count > 0 then
    raise exception 'Lead has unresolved send blocks';
  end if;

  select * into selected_score
  from lead_scores
  where lead_id = target_lead_id
  order by created_at desc
  limit 1;

  if selected_score.id is null then
    raise exception 'Lead must be scored before approval';
  end if;

  select * into selected_sequence
  from outreach_sequences
  where band = selected_score.band
    and active = true
  order by created_at asc
  limit 1;

  if selected_sequence.id is null then
    raise exception 'No active sequence found for band %', selected_score.band;
  end if;

  insert into outreach_queue (
    lead_id,
    sequence_id,
    current_step,
    next_send_at,
    status
  )
  values (
    target_lead_id,
    selected_sequence.id,
    1,
    now(),
    'queued'
  )
  on conflict (lead_id, sequence_id)
  do update set
    current_step = 1,
    next_send_at = excluded.next_send_at,
    status = 'queued',
    pause_reason = null;

  update manual_review_queue
  set review_status = 'approved'
  where lead_id = target_lead_id
    and review_status = 'pending';

  update leads
  set status = 'queued'
  where id = target_lead_id;
end;
$$;

revoke all on function sync_email_draft_contract_columns() from public;
revoke all on function sync_send_block_contract_columns() from public;
revoke all on function dashboard_approve_lead_for_outreach(uuid) from public;
grant execute on function dashboard_approve_lead_for_outreach(uuid) to authenticated;

grant select on
  app_settings,
  leads,
  lead_enrichment,
  lead_scores,
  score_evidence,
  automation_hypotheses,
  outreach_sequences,
  outreach_steps,
  outreach_queue,
  outreach_events,
  reply_events,
  manual_review_queue,
  inboxes,
  email_drafts,
  send_blocks,
  workflow_events
to authenticated;

grant all privileges on
  app_settings,
  leads,
  lead_enrichment,
  lead_scores,
  score_evidence,
  automation_hypotheses,
  outreach_sequences,
  outreach_steps,
  outreach_queue,
  outreach_events,
  reply_events,
  manual_review_queue,
  inboxes,
  email_drafts,
  send_blocks,
  workflow_events
to service_role;

grant execute on all functions in schema public to service_role;
