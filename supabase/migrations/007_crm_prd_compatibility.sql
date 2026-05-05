-- Additive CRM PRD compatibility layer.
-- This preserves the existing WF-01 through WF-10/n8n table contracts while
-- adding the CRM fields, audit tables, query views, indexes, RLS, and realtime
-- publication hooks required by the CRM PRD.

alter table campaigns
  add column if not exists description text,
  add column if not exists primary_niche text,
  add column if not exists niche_keywords jsonb not null default '[]'::jsonb,
  add column if not exists target_countries jsonb not null default '[]'::jsonb,
  add column if not exists target_cities jsonb not null default '[]'::jsonb,
  add column if not exists exclude_cities jsonb not null default '[]'::jsonb,
  add column if not exists language_of_business jsonb not null default '[]'::jsonb,
  add column if not exists max_leads_per_run integer not null default 100,
  add column if not exists lead_source text not null default 'google_places',
  add column if not exists min_google_rating numeric not null default 3.5,
  add column if not exists min_review_count integer not null default 5,
  add column if not exists exclude_chains boolean not null default false,
  add column if not exists exclude_already_discovered boolean not null default true,
  add column if not exists run_frequency text not null default 'manual',
  add column if not exists next_run_at timestamptz,
  add column if not exists last_run_at timestamptz,
  add column if not exists min_score_band_a integer not null default 76,
  add column if not exists min_score_band_b integer not null default 51,
  add column if not exists min_automation_opportunity integer not null default 13,
  add column if not exists min_ability_to_pay integer not null default 9,
  add column if not exists min_reachability integer not null default 6,
  add column if not exists confidence_required text not null default 'medium',
  add column if not exists sequence_band_a uuid references outreach_sequences(id) on delete set null,
  add column if not exists sequence_band_b uuid references outreach_sequences(id) on delete set null,
  add column if not exists sequence_band_c uuid references outreach_sequences(id) on delete set null,
  add column if not exists auto_approve_band_b boolean not null default false,
  add column if not exists require_approval_band_a boolean not null default true,
  add column if not exists assigned_inbox_id uuid references inboxes(id) on delete set null,
  add column if not exists tags jsonb not null default '[]'::jsonb,
  add column if not exists notes text,
  add column if not exists created_by_name text;

update campaigns
set
  primary_niche = coalesce(primary_niche, niche),
  target_countries = case
    when target_countries = '[]'::jsonb and nullif(btrim(region), '') is not null then to_jsonb(array[region])
    else target_countries
  end,
  max_leads_per_run = greatest(max_leads_per_run, max_leads_per_day)
where primary_niche is null
   or target_countries = '[]'::jsonb
   or max_leads_per_run < max_leads_per_day;

do $$
declare
  constraint_record record;
begin
  for constraint_record in
    select conname
    from pg_constraint
    where conrelid = 'campaigns'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) like '%status%'
  loop
    execute format('alter table campaigns drop constraint %I', constraint_record.conname);
  end loop;
end;
$$;

alter table campaigns
  add constraint campaigns_status_check check (status in ('draft', 'active', 'paused', 'completed', 'archived')),
  add constraint campaigns_run_frequency_check check (run_frequency in ('manual', 'daily', 'every_3_days', 'weekly')),
  add constraint campaigns_confidence_required_check check (confidence_required in ('low', 'medium', 'high')),
  add constraint campaigns_min_google_rating_check check (min_google_rating between 0 and 5),
  add constraint campaigns_min_review_count_check check (min_review_count >= 0),
  add constraint campaigns_score_thresholds_check check (
    min_score_band_a between 0 and 100
    and min_score_band_b between 0 and 100
    and min_score_band_b <= min_score_band_a
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
  add column if not exists approved_at timestamptz,
  add column if not exists last_activity_at timestamptz;

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
end;
$$;

alter table leads
  add constraint leads_status_check check (
    status in (
      'new',
      'enriched',
      'scored',
      'review_pending',
      'pending_approval',
      'queued',
      'drafted',
      'in_sequence',
      'paused',
      'blocked',
      'completed',
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
    )
  ),
  add constraint leads_band_override_check check (band_override is null or band_override in ('A', 'B', 'C', 'D'));

alter table reply_events
  add column if not exists handled_at timestamptz,
  add column if not exists handled_by text,
  add column if not exists assigned_to text,
  add column if not exists read_at timestamptz,
  add column if not exists read_by text,
  add column if not exists ai_draft_reply text,
  add column if not exists action_outcome text;

alter table discovery_runs
  add column if not exists duration_seconds integer,
  add column if not exists triggered_by text,
  add column if not exists n8n_execution_id text,
  add column if not exists error_details jsonb not null default '[]'::jsonb;

create table if not exists founder_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  email text,
  timezone text not null default 'UTC',
  telegram_chat_id text,
  notification_preferences jsonb not null default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists crm_action_log (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references leads(id) on delete set null,
  campaign_id uuid references campaigns(id) on delete set null,
  reply_event_id uuid references reply_events(id) on delete set null,
  manual_review_id uuid references manual_review_queue(id) on delete set null,
  email_draft_id uuid references email_drafts(id) on delete set null,
  action_type text not null,
  action_detail jsonb not null default '{}'::jsonb,
  performed_by text not null,
  performed_by_user_id uuid references auth.users(id) on delete set null,
  performed_at timestamptz default now()
);

alter table crm_action_log
  add column if not exists manual_review_id uuid references manual_review_queue(id) on delete set null,
  add column if not exists email_draft_id uuid references email_drafts(id) on delete set null;

create table if not exists saved_filters (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  view_key text not null default 'pipeline',
  filters jsonb not null,
  created_by text not null,
  created_by_user_id uuid references auth.users(id) on delete set null,
  is_shared boolean not null default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists lead_notes (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references leads(id) on delete cascade,
  body text not null,
  created_by text not null,
  created_by_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

drop trigger if exists founder_profiles_touch_updated_at on founder_profiles;
create trigger founder_profiles_touch_updated_at before update on founder_profiles
for each row execute function touch_updated_at();

drop trigger if exists saved_filters_touch_updated_at on saved_filters;
create trigger saved_filters_touch_updated_at before update on saved_filters
for each row execute function touch_updated_at();

drop trigger if exists lead_notes_touch_updated_at on lead_notes;
create trigger lead_notes_touch_updated_at before update on lead_notes
for each row execute function touch_updated_at();

create index if not exists campaigns_prd_status_next_run_idx on campaigns (status, next_run_at)
where status in ('active', 'paused', 'draft', 'completed');
create index if not exists campaigns_primary_niche_idx on campaigns (primary_niche);
create index if not exists campaigns_assigned_inbox_idx on campaigns (assigned_inbox_id)
where assigned_inbox_id is not null;

create index if not exists leads_pipeline_filter_idx on leads (status, campaign_id, assigned_to, created_at desc);
create index if not exists leads_assigned_created_idx on leads (assigned_to, created_at desc)
where assigned_to is not null;
create index if not exists leads_last_activity_idx on leads (last_activity_at desc nulls last);
create index if not exists leads_closed_idx on leads (closed_at desc)
where closed_at is not null;

create index if not exists reply_events_inbox_idx on reply_events (handled_at, reply_received_at desc);
create index if not exists reply_events_assigned_idx on reply_events (assigned_to, reply_received_at desc)
where assigned_to is not null;
create index if not exists reply_events_intent_received_idx on reply_events (intent_classification, reply_received_at desc);

create index if not exists discovery_runs_triggered_idx on discovery_runs (triggered_by, started_at desc)
where triggered_by is not null;
create index if not exists discovery_runs_n8n_execution_idx on discovery_runs (n8n_execution_id)
where n8n_execution_id is not null;

create index if not exists crm_action_log_lead_performed_idx on crm_action_log (lead_id, performed_at desc)
where lead_id is not null;
create index if not exists crm_action_log_campaign_performed_idx on crm_action_log (campaign_id, performed_at desc)
where campaign_id is not null;
create index if not exists crm_action_log_type_performed_idx on crm_action_log (action_type, performed_at desc);
create index if not exists saved_filters_view_created_idx on saved_filters (view_key, created_by_user_id, created_at desc);
create index if not exists lead_notes_lead_created_idx on lead_notes (lead_id, created_at desc);

create or replace view pipeline_view as
with latest_scores as (
  select distinct on (lead_id)
    lead_id,
    total_score,
    band,
    confidence,
    manual_review_required,
    created_at as scored_at
  from lead_scores
  order by lead_id, created_at desc
),
latest_queue as (
  select distinct on (lead_id)
    lead_id,
    status as outreach_status,
    current_step,
    next_send_at,
    last_sent_at,
    updated_at as outreach_updated_at
  from outreach_queue
  order by lead_id, updated_at desc nulls last, created_at desc
),
reply_rollup as (
  select
    lead_id,
    count(*) as reply_count,
    max(reply_received_at) as last_reply_at,
    bool_or(handled_at is null) as has_unhandled_reply,
    (array_agg(intent_classification order by reply_received_at desc))[1] as latest_reply_intent
  from reply_events
  group by lead_id
),
outreach_rollup as (
  select
    lead_id,
    count(*) filter (where coalesce(event_type, status) in ('sent', 'email_sent')) as emails_sent,
    max(sent_at) as last_email_sent_at,
    max(created_at) as last_outreach_event_at
  from outreach_events
  group by lead_id
),
review_rollup as (
  select
    lead_id,
    bool_or(review_status = 'pending') as has_pending_review,
    min(created_at) filter (where review_status = 'pending') as pending_review_since
  from manual_review_queue
  group by lead_id
)
select
  l.id,
  l.business_name,
  l.niche,
  l.country,
  l.city,
  l.email,
  l.phone,
  l.status,
  l.assigned_to,
  l.approved_for_outreach,
  l.created_at,
  l.updated_at,
  coalesce(
    l.last_activity_at,
    greatest(
      l.updated_at,
      coalesce(rr.last_reply_at, l.updated_at),
      coalesce(oroll.last_outreach_event_at, l.updated_at)
    )
  ) as last_activity_at,
  l.campaign_id,
  c.name as campaign_name,
  coalesce(c.primary_niche, c.niche) as campaign_niche,
  c.target_countries,
  ls.total_score,
  coalesce(l.band_override, ls.band) as band,
  ls.band as scored_band,
  l.band_override,
  ls.confidence,
  ls.manual_review_required,
  lq.outreach_status,
  lq.current_step,
  lq.next_send_at,
  coalesce(oroll.emails_sent, 0) as emails_sent,
  oroll.last_email_sent_at,
  coalesce(rr.reply_count, 0) as reply_count,
  rr.last_reply_at,
  rr.latest_reply_intent,
  coalesce(rr.has_unhandled_reply, false) as has_unhandled_reply,
  coalesce(rev.has_pending_review, false) as has_pending_review,
  rev.pending_review_since
from leads l
left join campaigns c on c.id = l.campaign_id
left join latest_scores ls on ls.lead_id = l.id
left join latest_queue lq on lq.lead_id = l.id
left join reply_rollup rr on rr.lead_id = l.id
left join outreach_rollup oroll on oroll.lead_id = l.id
left join review_rollup rev on rev.lead_id = l.id;

create or replace view inbox_reply_view as
with latest_scores as (
  select distinct on (lead_id)
    lead_id,
    total_score,
    band,
    confidence
  from lead_scores
  order by lead_id, created_at desc
),
thread_rollup as (
  select
    lead_id,
    provider_thread_id,
    count(*) as sent_count,
    max(sent_at) as last_sent_at
  from outreach_events
  where provider_thread_id is not null
  group by lead_id, provider_thread_id
)
select
  re.id,
  re.lead_id,
  l.business_name,
  l.niche,
  l.country,
  l.city,
  l.assigned_to as lead_assigned_to,
  re.assigned_to as reply_assigned_to,
  l.status as lead_status,
  l.campaign_id,
  c.name as campaign_name,
  ls.total_score,
  coalesce(l.band_override, ls.band) as band,
  ls.confidence,
  re.from_email,
  re.to_email,
  re.reply_body,
  left(coalesce(re.reply_body, ''), 100) as reply_excerpt,
  re.reply_received_at,
  re.provider_message_id,
  re.provider_thread_id,
  re.intent_classification,
  re.sentiment,
  re.requires_human_review,
  re.summary,
  re.suggested_next_action,
  re.ai_draft_reply,
  re.handled_at,
  re.handled_by,
  re.read_at,
  re.read_by,
  re.action_outcome,
  (re.handled_at is null) as is_unhandled,
  coalesce(tr.sent_count, 0) as sent_count,
  tr.last_sent_at
from reply_events re
join leads l on l.id = re.lead_id
left join campaigns c on c.id = l.campaign_id
left join latest_scores ls on ls.lead_id = re.lead_id
left join thread_rollup tr on tr.lead_id = re.lead_id and tr.provider_thread_id = re.provider_thread_id;

create or replace view campaign_analytics as
with latest_scores as (
  select distinct on (lead_id)
    lead_id,
    total_score,
    band,
    confidence
  from lead_scores
  order by lead_id, created_at desc
),
lead_rollup as (
  select
    c.id as campaign_id,
    count(distinct l.id) as total_leads,
    count(distinct l.id) filter (where l.status in ('enriched', 'scored', 'review_pending', 'pending_approval', 'queued', 'in_sequence', 'replied', 'closed_won', 'closed_lost')) as enriched_or_later,
    count(distinct l.id) filter (where ls.lead_id is not null) as scored_leads,
    count(distinct l.id) filter (where coalesce(l.band_override, ls.band) = 'A') as band_a_count,
    count(distinct l.id) filter (where coalesce(l.band_override, ls.band) = 'B') as band_b_count,
    count(distinct l.id) filter (where coalesce(l.band_override, ls.band) in ('A', 'B')) as band_ab_count,
    count(distinct l.id) filter (where l.status = 'closed_won') as closed_won_count,
    count(distinct l.id) filter (where l.status = 'closed_lost') as closed_lost_count
  from campaigns c
  left join leads l on l.campaign_id = c.id
  left join latest_scores ls on ls.lead_id = l.id
  group by c.id
),
outreach_rollup as (
  select
    l.campaign_id,
    count(oe.id) filter (where coalesce(oe.event_type, oe.status) in ('sent', 'email_sent')) as emails_sent,
    count(distinct oe.lead_id) filter (where coalesce(oe.event_type, oe.status) in ('sent', 'email_sent')) as leads_contacted
  from outreach_events oe
  join leads l on l.id = oe.lead_id
  group by l.campaign_id
),
reply_rollup as (
  select
    l.campaign_id,
    count(re.id) as replies,
    count(re.id) filter (
      where re.intent_classification in ('positive_interest', 'interested', 'pricing_request', 'call_request')
    ) as positive_replies,
    count(re.id) filter (
      where re.intent_classification in ('neutral_question', 'question', 'objection', 'ambiguous', 'manual_review_required')
    ) as needs_followup_replies
  from reply_events re
  join leads l on l.id = re.lead_id
  group by l.campaign_id
)
select
  c.id as campaign_id,
  c.name,
  coalesce(c.primary_niche, c.niche) as primary_niche,
  c.target_countries,
  c.status,
  coalesce(lr.total_leads, 0) as total_leads,
  coalesce(lr.enriched_or_later, 0) as enriched_or_later,
  coalesce(lr.scored_leads, 0) as scored_leads,
  coalesce(lr.band_a_count, 0) as band_a_count,
  coalesce(lr.band_b_count, 0) as band_b_count,
  coalesce(lr.band_ab_count, 0) as band_ab_count,
  coalesce(oroll.emails_sent, 0) as emails_sent,
  coalesce(oroll.leads_contacted, 0) as leads_contacted,
  coalesce(rr.replies, 0) as replies,
  coalesce(rr.positive_replies, 0) as positive_replies,
  coalesce(rr.needs_followup_replies, 0) as needs_followup_replies,
  case when coalesce(oroll.emails_sent, 0) = 0 then 0
       else round(coalesce(rr.replies, 0)::numeric / oroll.emails_sent * 100, 2)
  end as reply_rate,
  case when coalesce(oroll.emails_sent, 0) = 0 then 0
       else round(coalesce(rr.positive_replies, 0)::numeric / oroll.emails_sent * 100, 2)
  end as positive_rate,
  coalesce(lr.closed_won_count, 0) as closed_won_count,
  coalesce(lr.closed_lost_count, 0) as closed_lost_count
from campaigns c
left join lead_rollup lr on lr.campaign_id = c.id
left join outreach_rollup oroll on oroll.campaign_id = c.id
left join reply_rollup rr on rr.campaign_id = c.id;

create or replace view analytics_daily_rollup as
with dates as (
  select created_at::date as metric_date from leads
  union
  select sent_at::date as metric_date from outreach_events where sent_at is not null
  union
  select reply_received_at::date as metric_date from reply_events
  union
  select created_at::date as metric_date from lead_scores
),
lead_daily as (
  select created_at::date as metric_date, campaign_id, niche, country, count(*) as leads_discovered
  from leads
  group by created_at::date, campaign_id, niche, country
),
score_daily as (
  select ls.created_at::date as metric_date, l.campaign_id, l.niche, l.country, count(*) as leads_scored
  from lead_scores ls
  join leads l on l.id = ls.lead_id
  group by ls.created_at::date, l.campaign_id, l.niche, l.country
),
outreach_daily as (
  select oe.sent_at::date as metric_date, l.campaign_id, l.niche, l.country, count(*) as emails_sent
  from outreach_events oe
  join leads l on l.id = oe.lead_id
  where coalesce(oe.event_type, oe.status) in ('sent', 'email_sent')
    and oe.sent_at is not null
  group by oe.sent_at::date, l.campaign_id, l.niche, l.country
),
reply_daily as (
  select
    re.reply_received_at::date as metric_date,
    l.campaign_id,
    l.niche,
    l.country,
    count(*) as replies,
    count(*) filter (where re.intent_classification in ('positive_interest', 'interested', 'pricing_request', 'call_request')) as positive_replies
  from reply_events re
  join leads l on l.id = re.lead_id
  group by re.reply_received_at::date, l.campaign_id, l.niche, l.country
),
keys as (
  select metric_date, campaign_id, niche, country from lead_daily
  union
  select metric_date, campaign_id, niche, country from score_daily
  union
  select metric_date, campaign_id, niche, country from outreach_daily
  union
  select metric_date, campaign_id, niche, country from reply_daily
)
select
  k.metric_date,
  k.campaign_id,
  c.name as campaign_name,
  k.niche,
  k.country,
  coalesce(ld.leads_discovered, 0) as leads_discovered,
  coalesce(sd.leads_scored, 0) as leads_scored,
  coalesce(od.emails_sent, 0) as emails_sent,
  coalesce(rd.replies, 0) as replies,
  coalesce(rd.positive_replies, 0) as positive_replies
from keys k
left join campaigns c on c.id = k.campaign_id
left join lead_daily ld on ld.metric_date = k.metric_date and ld.campaign_id is not distinct from k.campaign_id and ld.niche is not distinct from k.niche and ld.country is not distinct from k.country
left join score_daily sd on sd.metric_date = k.metric_date and sd.campaign_id is not distinct from k.campaign_id and sd.niche is not distinct from k.niche and sd.country is not distinct from k.country
left join outreach_daily od on od.metric_date = k.metric_date and od.campaign_id is not distinct from k.campaign_id and od.niche is not distinct from k.niche and od.country is not distinct from k.country
left join reply_daily rd on rd.metric_date = k.metric_date and rd.campaign_id is not distinct from k.campaign_id and rd.niche is not distinct from k.niche and rd.country is not distinct from k.country;

create or replace view sequence_step_funnel as
select
  s.id as sequence_id,
  s.name as sequence_name,
  s.band,
  st.step_number,
  st.delay_days,
  st.template_type,
  count(distinct oe.id) filter (where coalesce(oe.event_type, oe.status) in ('sent', 'email_sent')) as sent,
  count(distinct re.id) as replies,
  count(distinct re.id) filter (where re.intent_classification in ('positive_interest', 'interested', 'pricing_request', 'call_request')) as positive_replies,
  case
    when count(distinct oe.id) filter (where coalesce(oe.event_type, oe.status) in ('sent', 'email_sent')) = 0 then 0
    else round(count(distinct re.id)::numeric / count(distinct oe.id) filter (where coalesce(oe.event_type, oe.status) in ('sent', 'email_sent')) * 100, 2)
  end as reply_rate
from outreach_sequences s
join outreach_steps st on st.sequence_id = s.id
left join outreach_events oe on oe.sequence_id = s.id and oe.step_number = st.step_number
left join reply_events re on re.lead_id = oe.lead_id and re.reply_received_at >= coalesce(oe.sent_at, oe.created_at)
group by s.id, s.name, s.band, st.step_number, st.delay_days, st.template_type;

create or replace view campaign_run_log as
select
  id,
  campaign_id,
  started_at as run_started_at,
  completed_at as run_completed_at,
  candidates_promoted as leads_found,
  duplicates_skipped,
  case when error_message is null then 0 else 1 end as errors,
  error_details,
  duration_seconds,
  triggered_by,
  n8n_execution_id,
  status
from discovery_runs;

alter table founder_profiles enable row level security;
alter table crm_action_log enable row level security;
alter table saved_filters enable row level security;
alter table lead_notes enable row level security;

drop policy if exists "authenticated read founder profiles" on founder_profiles;
drop policy if exists "founders write founder profiles" on founder_profiles;
drop policy if exists "authenticated read crm action log" on crm_action_log;
drop policy if exists "founders write crm action log" on crm_action_log;
drop policy if exists "authenticated read saved filters" on saved_filters;
drop policy if exists "founders write saved filters" on saved_filters;
drop policy if exists "authenticated read lead notes" on lead_notes;
drop policy if exists "founders write lead notes" on lead_notes;

create policy "authenticated read founder profiles" on founder_profiles
for select to authenticated
using (is_dashboard_user());

create policy "founders write founder profiles" on founder_profiles
for all to authenticated
using (is_dashboard_user(array['founder', 'admin']))
with check (is_dashboard_user(array['founder', 'admin']));

create policy "authenticated read crm action log" on crm_action_log
for select to authenticated
using (is_dashboard_user());

create policy "founders write crm action log" on crm_action_log
for insert to authenticated
with check (is_dashboard_user(array['founder', 'admin']));

create policy "authenticated read saved filters" on saved_filters
for select to authenticated
using (
  is_dashboard_user()
  and (is_shared or created_by_user_id = auth.uid())
);

create policy "founders write saved filters" on saved_filters
for all to authenticated
using (is_dashboard_user(array['founder', 'admin'])) 
with check (is_dashboard_user(array['founder', 'admin']));

create policy "authenticated read lead notes" on lead_notes
for select to authenticated
using (is_dashboard_user());

create policy "founders write lead notes" on lead_notes
for all to authenticated
using (is_dashboard_user(array['founder', 'admin']))
with check (is_dashboard_user(array['founder', 'admin']));

grant select on
  founder_profiles,
  crm_action_log,
  saved_filters,
  lead_notes,
  pipeline_view,
  inbox_reply_view,
  campaign_analytics,
  analytics_daily_rollup,
  sequence_step_funnel,
  campaign_run_log
to authenticated;

grant insert, update, delete on founder_profiles, saved_filters, lead_notes to authenticated;
grant insert on crm_action_log to authenticated;

grant all privileges on founder_profiles, crm_action_log, saved_filters, lead_notes to service_role;
grant select on
  pipeline_view,
  inbox_reply_view,
  campaign_analytics,
  analytics_daily_rollup,
  sequence_step_funnel,
  campaign_run_log
to service_role;

do $$
declare
  target_table text;
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    foreach target_table in array array[
      'reply_events',
      'manual_review_queue',
      'outreach_queue',
      'email_drafts',
      'app_settings',
      'crm_action_log',
      'saved_filters',
      'lead_notes',
      'campaigns'
    ]
    loop
      if not exists (
        select 1
        from pg_publication_tables
        where pubname = 'supabase_realtime'
          and schemaname = 'public'
          and tablename = target_table
      ) then
        execute format('alter publication supabase_realtime add table public.%I', target_table);
      end if;
    end loop;
  end if;
end;
$$;
