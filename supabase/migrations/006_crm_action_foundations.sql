create table if not exists crm_action_log (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references leads(id) on delete set null,
  campaign_id uuid references campaigns(id) on delete set null,
  reply_event_id uuid references reply_events(id) on delete set null,
  manual_review_id uuid references manual_review_queue(id) on delete set null,
  action_type text not null,
  action_detail jsonb not null default '{}'::jsonb,
  performed_by text not null,
  performed_by_user_id uuid references auth.users(id) on delete set null,
  performed_at timestamptz default now()
);

alter table leads
  add column if not exists notes text,
  add column if not exists notes_updated_at timestamptz,
  add column if not exists notes_updated_by text,
  add column if not exists assigned_to text,
  add column if not exists closed_at timestamptz,
  add column if not exists closed_by text,
  add column if not exists band_override text,
  add column if not exists band_override_reason text,
  add column if not exists band_override_by text,
  add column if not exists band_override_at timestamptz,
  add column if not exists approved_for_outreach boolean not null default false,
  add column if not exists approved_by text,
  add column if not exists approved_at timestamptz;

alter table reply_events
  add column if not exists handled_at timestamptz,
  add column if not exists handled_by text,
  add column if not exists handled_by_user_id uuid references auth.users(id) on delete set null,
  add column if not exists handled_notes text;

alter table manual_review_queue
  add column if not exists completed_at timestamptz,
  add column if not exists completed_by text,
  add column if not exists completed_by_user_id uuid references auth.users(id) on delete set null;

alter table campaigns
  add column if not exists last_manual_run_requested_at timestamptz,
  add column if not exists last_manual_run_requested_by text;

alter table crm_action_log enable row level security;

drop policy if exists "authenticated read crm action log" on crm_action_log;
create policy "authenticated read crm action log" on crm_action_log
for select to authenticated
using (is_dashboard_user(array['founder', 'admin']));

create index if not exists crm_action_log_lead_idx on crm_action_log (lead_id, performed_at desc)
where lead_id is not null;

create index if not exists crm_action_log_campaign_idx on crm_action_log (campaign_id, performed_at desc)
where campaign_id is not null;

create index if not exists crm_action_log_action_idx on crm_action_log (action_type, performed_at desc);

create index if not exists reply_events_unhandled_idx on reply_events (handled_at, reply_received_at desc)
where handled_at is null;

grant select on crm_action_log to authenticated;
grant all privileges on crm_action_log to service_role;
