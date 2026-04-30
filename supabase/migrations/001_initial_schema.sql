create extension if not exists pgcrypto;

create table if not exists app_settings (
  key text primary key,
  value jsonb not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists dashboard_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'founder' check (role in ('founder', 'admin', 'viewer')),
  active boolean not null default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists leads (
  id uuid primary key default gen_random_uuid(),
  business_name text not null,
  website text,
  country text,
  city text,
  niche text,
  source text,
  google_maps_url text,
  linkedin_url text,
  phone text,
  email text,
  whatsapp text,
  decision_maker_name text,
  decision_maker_role text,
  rating numeric,
  review_count integer,
  address text,
  status text default 'new' check (
    status in (
      'new',
      'enriched',
      'scored',
      'review_pending',
      'queued',
      'paused',
      'replied',
      'unsubscribed',
      'bounced',
      'not_interested',
      'archived'
    )
  ),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists lead_enrichment (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references leads(id) on delete cascade,
  website_title text,
  website_description text,
  services_offered jsonb,
  contact_page_url text,
  booking_link_found boolean,
  contact_form_found boolean,
  email_found text,
  phone_found text,
  whatsapp_found text,
  social_links jsonb,
  team_page_found boolean,
  pricing_page_found boolean,
  faq_page_found boolean,
  chat_widget_found boolean,
  calendar_tool_found boolean,
  detected_tools jsonb,
  raw_scrape_summary text,
  enrichment_confidence text,
  status text default 'completed',
  error_message text,
  last_enriched_at timestamptz default now()
);

create table if not exists lead_scores (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references leads(id) on delete cascade,
  total_score integer not null check (total_score between 0 and 100),
  band text not null check (band in ('A', 'B', 'C', 'D')),
  confidence text not null check (confidence in ('low', 'medium', 'high')),
  automation_opportunity_score integer check (automation_opportunity_score between 0 and 20),
  lead_volume_score integer check (lead_volume_score between 0 and 15),
  digital_workflow_gap_score integer check (digital_workflow_gap_score between 0 and 15),
  ability_to_pay_score integer check (ability_to_pay_score between 0 and 15),
  niche_fit_score integer check (niche_fit_score between 0 and 10),
  reachability_score integer check (reachability_score between 0 and 10),
  operational_complexity_score integer check (operational_complexity_score between 0 and 10),
  growth_activity_score integer check (growth_activity_score between 0 and 5),
  manual_review_required boolean default false,
  created_at timestamptz default now()
);

create table if not exists score_evidence (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references leads(id) on delete cascade,
  lead_score_id uuid not null references lead_scores(id) on delete cascade,
  metric_name text not null,
  score integer not null,
  max_score integer not null,
  confidence text,
  evidence text,
  missing_data text,
  reasoning_summary text,
  created_at timestamptz default now()
);

create table if not exists automation_hypotheses (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references leads(id) on delete cascade,
  primary_pain_point text,
  likely_manual_workflow text,
  suggested_solution text,
  business_impact text,
  outreach_hook text,
  confidence text,
  created_at timestamptz default now()
);

create table if not exists outreach_sequences (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  band text check (band in ('A', 'B', 'C', 'D')),
  niche text,
  active boolean default true,
  created_at timestamptz default now()
);

create table if not exists outreach_steps (
  id uuid primary key default gen_random_uuid(),
  sequence_id uuid not null references outreach_sequences(id) on delete cascade,
  step_number integer not null,
  delay_days integer not null,
  channel text default 'email',
  template_type text,
  requires_ai_personalization boolean default true,
  active boolean default true,
  unique (sequence_id, step_number)
);

create table if not exists outreach_queue (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references leads(id) on delete cascade,
  sequence_id uuid not null references outreach_sequences(id),
  current_step integer default 1,
  next_send_at timestamptz,
  status text default 'queued' check (
    status in ('queued', 'paused', 'replied', 'blocked', 'completed')
  ),
  assigned_inbox text,
  last_sent_at timestamptz,
  pause_reason text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (lead_id, sequence_id)
);

create table if not exists outreach_events (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references leads(id) on delete cascade,
  sequence_id uuid references outreach_sequences(id),
  step_number integer,
  channel text default 'email',
  subject text,
  message_body text,
  sent_from text,
  sent_to text,
  sent_at timestamptz default now(),
  provider_message_id text,
  provider_thread_id text,
  status text check (status in ('generated', 'sent', 'blocked', 'failed', 'bounced', 'replied'))
);

create table if not exists reply_events (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references leads(id) on delete cascade,
  from_email text,
  to_email text,
  reply_body text,
  reply_received_at timestamptz default now(),
  provider_message_id text,
  provider_thread_id text,
  intent_classification text check (
    intent_classification in (
      'positive_interest',
      'neutral_question',
      'objection',
      'not_interested',
      'unsubscribe',
      'out_of_office',
      'wrong_person',
      'bounce',
      'manual_review_required'
    )
  ),
  sentiment text check (sentiment in ('positive', 'neutral', 'negative')),
  requires_human_review boolean default true,
  created_at timestamptz default now()
);

create table if not exists manual_review_queue (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references leads(id) on delete cascade,
  reason text,
  priority text,
  assigned_to text,
  review_status text default 'pending' check (
    review_status in ('pending', 'approved', 'rejected', 'handled')
  ),
  review_notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists inboxes (
  id uuid primary key default gen_random_uuid(),
  email_address text not null unique,
  provider text default 'google_workspace',
  daily_send_limit integer default 10 check (daily_send_limit >= 0),
  current_daily_sent integer default 0 check (current_daily_sent >= 0),
  warmup_stage text default 'week_1',
  active boolean default true,
  last_sent_at timestamptz,
  created_at timestamptz default now()
);

create table if not exists workflow_events (
  id uuid primary key default gen_random_uuid(),
  workflow_name text not null,
  lead_id uuid references leads(id) on delete set null,
  event_type text not null,
  status text not null check (status in ('started', 'completed', 'failed', 'blocked', 'skipped')),
  error_message text,
  payload jsonb,
  created_at timestamptz default now()
);

create table if not exists email_drafts (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references leads(id) on delete cascade,
  sequence_id uuid not null references outreach_sequences(id),
  step_number integer not null,
  subject_line text not null,
  preview_text text,
  message_body text not null,
  word_count integer,
  personalization_elements_used jsonb,
  cta_type text,
  validation_passed boolean default false,
  validation_failures jsonb,
  generation_warnings jsonb,
  approval_status text default 'pending' check (
    approval_status in ('pending', 'approved', 'auto_approved', 'rejected', 'blocked')
  ),
  approved_by text,
  approved_at timestamptz,
  sent boolean default false,
  created_at timestamptz default now(),
  unique (lead_id, sequence_id, step_number)
);

create table if not exists send_blocks (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references leads(id) on delete cascade,
  block_reason text not null,
  block_type text not null,
  created_at timestamptz default now()
);

create or replace function touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists leads_touch_updated_at on leads;
create trigger leads_touch_updated_at before update on leads
for each row execute function touch_updated_at();

drop trigger if exists dashboard_users_touch_updated_at on dashboard_users;
create trigger dashboard_users_touch_updated_at before update on dashboard_users
for each row execute function touch_updated_at();

drop trigger if exists outreach_queue_touch_updated_at on outreach_queue;
create trigger outreach_queue_touch_updated_at before update on outreach_queue
for each row execute function touch_updated_at();

drop trigger if exists manual_review_queue_touch_updated_at on manual_review_queue;
create trigger manual_review_queue_touch_updated_at before update on manual_review_queue
for each row execute function touch_updated_at();

drop trigger if exists app_settings_touch_updated_at on app_settings;
create trigger app_settings_touch_updated_at before update on app_settings
for each row execute function touch_updated_at();

create unique index if not exists leads_unique_website_idx on leads (lower(website)) where website is not null;
create unique index if not exists leads_unique_email_idx on leads (lower(email)) where email is not null;
create unique index if not exists leads_unique_phone_idx on leads (phone) where phone is not null;
create unique index if not exists leads_unique_name_location_idx on leads (
  lower(business_name),
  lower(coalesce(city, '')),
  lower(coalesce(country, ''))
);
create index if not exists leads_status_idx on leads (status);
create index if not exists leads_created_at_idx on leads (created_at desc);
create unique index if not exists outreach_sequences_name_idx on outreach_sequences (name);
create index if not exists lead_enrichment_lead_enriched_idx on lead_enrichment (lead_id, last_enriched_at desc);
create index if not exists lead_scores_lead_created_idx on lead_scores (lead_id, created_at desc);
create index if not exists score_evidence_lead_created_idx on score_evidence (lead_id, created_at desc);
create index if not exists automation_hypotheses_lead_created_idx on automation_hypotheses (lead_id, created_at desc);
create index if not exists outreach_queue_due_idx on outreach_queue (status, next_send_at);
create index if not exists outreach_queue_lead_created_idx on outreach_queue (lead_id, created_at desc);
create index if not exists reply_events_lead_idx on reply_events (lead_id, reply_received_at desc);
create index if not exists manual_review_status_idx on manual_review_queue (review_status, priority);
create index if not exists manual_review_status_created_idx on manual_review_queue (review_status, created_at asc);
create unique index if not exists manual_review_one_pending_per_lead_idx on manual_review_queue (lead_id)
where review_status = 'pending';
create index if not exists workflow_events_lead_idx on workflow_events (lead_id, created_at desc);
create index if not exists workflow_events_status_idx on workflow_events (workflow_name, status, created_at desc);

alter table app_settings enable row level security;
alter table dashboard_users enable row level security;
alter table leads enable row level security;
alter table lead_enrichment enable row level security;
alter table lead_scores enable row level security;
alter table score_evidence enable row level security;
alter table automation_hypotheses enable row level security;
alter table outreach_sequences enable row level security;
alter table outreach_steps enable row level security;
alter table outreach_queue enable row level security;
alter table outreach_events enable row level security;
alter table reply_events enable row level security;
alter table manual_review_queue enable row level security;
alter table inboxes enable row level security;
alter table email_drafts enable row level security;
alter table send_blocks enable row level security;
alter table workflow_events enable row level security;

drop policy if exists "authenticated read app settings" on app_settings;
drop policy if exists "dashboard users read own access" on dashboard_users;
drop policy if exists "authenticated read leads" on leads;
drop policy if exists "authenticated read lead enrichment" on lead_enrichment;
drop policy if exists "authenticated read lead scores" on lead_scores;
drop policy if exists "authenticated read score evidence" on score_evidence;
drop policy if exists "authenticated read hypotheses" on automation_hypotheses;
drop policy if exists "authenticated read sequences" on outreach_sequences;
drop policy if exists "authenticated read steps" on outreach_steps;
drop policy if exists "authenticated read outreach queue" on outreach_queue;
drop policy if exists "authenticated read outreach events" on outreach_events;
drop policy if exists "authenticated read replies" on reply_events;
drop policy if exists "authenticated read manual review" on manual_review_queue;
drop policy if exists "authenticated read inboxes" on inboxes;
drop policy if exists "authenticated read drafts" on email_drafts;
drop policy if exists "authenticated read send blocks" on send_blocks;
drop policy if exists "authenticated read workflow events" on workflow_events;

create or replace function is_dashboard_user(allowed_roles text[] default array['founder', 'admin', 'viewer'])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from dashboard_users
    where user_id = auth.uid()
      and active = true
      and role = any(allowed_roles)
  );
$$;

revoke all on function is_dashboard_user(text[]) from public;
grant execute on function is_dashboard_user(text[]) to authenticated;

create policy "dashboard users read own access" on dashboard_users
for select to authenticated
using (user_id = auth.uid());

create policy "authenticated read app settings" on app_settings for select to authenticated using (is_dashboard_user());
create policy "authenticated read leads" on leads for select to authenticated using (is_dashboard_user());
create policy "authenticated read lead enrichment" on lead_enrichment for select to authenticated using (is_dashboard_user());
create policy "authenticated read lead scores" on lead_scores for select to authenticated using (is_dashboard_user());
create policy "authenticated read score evidence" on score_evidence for select to authenticated using (is_dashboard_user());
create policy "authenticated read hypotheses" on automation_hypotheses for select to authenticated using (is_dashboard_user());
create policy "authenticated read sequences" on outreach_sequences for select to authenticated using (is_dashboard_user());
create policy "authenticated read steps" on outreach_steps for select to authenticated using (is_dashboard_user());
create policy "authenticated read outreach queue" on outreach_queue for select to authenticated using (is_dashboard_user());
create policy "authenticated read outreach events" on outreach_events for select to authenticated using (is_dashboard_user());
create policy "authenticated read replies" on reply_events for select to authenticated using (is_dashboard_user());
create policy "authenticated read manual review" on manual_review_queue for select to authenticated using (is_dashboard_user());
create policy "authenticated read inboxes" on inboxes for select to authenticated using (is_dashboard_user(array['founder', 'admin']));
create policy "authenticated read drafts" on email_drafts for select to authenticated using (is_dashboard_user());
create policy "authenticated read send blocks" on send_blocks for select to authenticated using (is_dashboard_user(array['founder', 'admin']));
create policy "authenticated read workflow events" on workflow_events for select to authenticated using (is_dashboard_user(array['founder', 'admin']));

grant usage on schema public to authenticated;
grant usage on schema public to service_role;
grant select on
  app_settings,
  dashboard_users,
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
  dashboard_users,
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

create or replace function dashboard_update_lead_status(target_lead_id uuid, next_status text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not is_dashboard_user(array['founder', 'admin']) then
    raise exception 'Founder or admin access required';
  end if;

  if next_status not in ('paused', 'unsubscribed', 'archived') then
    raise exception 'Unsupported dashboard status transition: %', next_status;
  end if;

  update leads
  set status = next_status
  where id = target_lead_id;

  if next_status in ('paused', 'unsubscribed') then
    update outreach_queue
    set status = 'paused',
        pause_reason = next_status
    where lead_id = target_lead_id
      and status = 'queued';
  end if;
end;
$$;

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
  global_paused boolean;
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

  if selected_lead.status in ('paused', 'replied', 'unsubscribed', 'bounced', 'not_interested', 'archived') then
    raise exception 'Lead status blocks outreach approval: %', selected_lead.status;
  end if;

  if selected_lead.email is null or length(btrim(selected_lead.email)) = 0 then
    raise exception 'Lead needs a prospect email before outreach approval';
  end if;

  select coalesce((value->>'paused')::boolean, false)
  into global_paused
  from app_settings
  where key = 'global_outreach';

  if coalesce(global_paused, false) then
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

revoke all on function dashboard_update_lead_status(uuid, text) from public;
revoke all on function dashboard_approve_lead_for_outreach(uuid) from public;
grant execute on function dashboard_update_lead_status(uuid, text) to authenticated;
grant execute on function dashboard_approve_lead_for_outreach(uuid) to authenticated;
