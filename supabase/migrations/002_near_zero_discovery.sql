create table if not exists campaigns (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  niche text not null,
  region text not null,
  keywords text[] not null default '{}',
  excluded_keywords text[] not null default '{}',
  target_business_types text[] not null default '{}',
  max_leads_per_day integer not null default 30 check (max_leads_per_day between 1 and 30),
  max_candidates_per_day integer not null default 75 check (max_candidates_per_day between 1 and 75),
  max_details_calls_per_day integer not null default 100 check (max_details_calls_per_day between 1 and 100),
  max_total_places_calls_per_day integer not null default 150 check (max_total_places_calls_per_day between 1 and 150),
  max_discovery_runs_per_day integer not null default 1 check (max_discovery_runs_per_day = 1),
  crawl_website boolean not null default true,
  fallback_search_enabled boolean not null default false,
  apify_enabled boolean not null default false,
  serpapi_enabled boolean not null default false,
  brave_enabled boolean not null default false,
  paid_scraping_enabled boolean not null default false,
  schedule text not null default 'daily',
  timezone text not null default 'UTC',
  status text not null default 'paused' check (status in ('active', 'paused', 'archived')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists campaign_search_queries (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references campaigns(id) on delete cascade,
  query_text text not null,
  region text not null,
  business_type text,
  status text not null default 'active' check (status in ('pending', 'active', 'paused', 'exhausted', 'failed')),
  next_page_token text,
  last_run_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (campaign_id, query_text, region)
);

create table if not exists discovery_runs (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references campaigns(id) on delete cascade,
  status text not null default 'running' check (status in ('running', 'completed', 'failed', 'quota_exhausted', 'paused')),
  trigger_type text not null default 'manual' check (trigger_type in ('manual', 'schedule', 'webhook')),
  source text not null default 'google_places',
  candidates_checked integer not null default 0,
  places_text_search_calls integer not null default 0,
  places_details_calls integer not null default 0,
  total_places_calls integer not null default 0,
  duplicates_skipped integer not null default 0,
  candidates_rejected integer not null default 0,
  candidates_promoted integer not null default 0,
  manual_review_candidates integer not null default 0,
  crawl_failures integer not null default 0,
  error_message text,
  started_at timestamptz default now(),
  completed_at timestamptz
);

create table if not exists lead_candidates (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references campaigns(id) on delete cascade,
  discovery_run_id uuid not null references discovery_runs(id) on delete cascade,
  search_query_id uuid references campaign_search_queries(id) on delete set null,
  source text not null default 'google_places',
  google_place_id text,
  business_name text not null,
  website text,
  domain text,
  country text,
  city text,
  niche text,
  google_maps_url text,
  phone text,
  rating numeric,
  review_count integer,
  address text,
  dedupe_key text,
  source_attribution jsonb not null default '{}'::jsonb,
  raw_place_payload jsonb not null default '{}'::jsonb,
  normalized_payload jsonb not null default '{}'::jsonb,
  website_crawl_status text not null default 'skipped' check (website_crawl_status in ('pending', 'skipped', 'success', 'failed')),
  website_crawl_summary text,
  candidate_status text not null default 'discovered' check (
    candidate_status in ('discovered', 'details_fetched', 'duplicate', 'rejected', 'manual_review', 'promoted', 'error')
  ),
  rejection_reason text,
  final_lead_id uuid references leads(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists discovery_quota_counters (
  campaign_id uuid not null references campaigns(id) on delete cascade,
  quota_date date not null default current_date,
  run_count integer not null default 0,
  candidates_checked integer not null default 0,
  places_text_search_calls integer not null default 0,
  places_details_calls integer not null default 0,
  total_places_calls integer not null default 0,
  final_leads integer not null default 0,
  lock_expires_at timestamptz,
  updated_at timestamptz default now(),
  primary key (campaign_id, quota_date)
);

create table if not exists suppression_list (
  id uuid primary key default gen_random_uuid(),
  normalized_email text,
  normalized_domain text,
  normalized_phone text,
  company_name text,
  reason text not null check (reason in ('unsubscribe', 'bounce', 'complaint', 'not_interested', 'manual_block')),
  source text,
  created_at timestamptz default now()
);

alter table leads add column if not exists campaign_id uuid references campaigns(id) on delete set null;
alter table leads add column if not exists candidate_id uuid references lead_candidates(id) on delete set null;
alter table leads add column if not exists discovery_run_id uuid references discovery_runs(id) on delete set null;
alter table leads add column if not exists google_place_id text;
alter table leads add column if not exists dedupe_key text;
alter table leads add column if not exists source_attribution jsonb not null default '{}'::jsonb;

alter table workflow_events add column if not exists campaign_id uuid references campaigns(id) on delete set null;
alter table workflow_events add column if not exists discovery_run_id uuid references discovery_runs(id) on delete set null;
alter table workflow_events add column if not exists candidate_id uuid references lead_candidates(id) on delete set null;

drop trigger if exists campaigns_touch_updated_at on campaigns;
create trigger campaigns_touch_updated_at before update on campaigns
for each row execute function touch_updated_at();

drop trigger if exists campaign_search_queries_touch_updated_at on campaign_search_queries;
create trigger campaign_search_queries_touch_updated_at before update on campaign_search_queries
for each row execute function touch_updated_at();

drop trigger if exists lead_candidates_touch_updated_at on lead_candidates;
create trigger lead_candidates_touch_updated_at before update on lead_candidates
for each row execute function touch_updated_at();

create unique index if not exists leads_unique_google_place_id_idx on leads (google_place_id) where google_place_id is not null;
create index if not exists leads_campaign_idx on leads (campaign_id, created_at desc);
create index if not exists campaigns_status_idx on campaigns (status, created_at desc);
create index if not exists discovery_runs_campaign_created_idx on discovery_runs (campaign_id, started_at desc);
create unique index if not exists lead_candidates_google_place_idx on lead_candidates (google_place_id) where google_place_id is not null;
create index if not exists lead_candidates_campaign_status_idx on lead_candidates (campaign_id, candidate_status, created_at desc);
create index if not exists lead_candidates_dedupe_idx on lead_candidates (dedupe_key) where dedupe_key is not null;
create index if not exists suppression_email_idx on suppression_list (normalized_email) where normalized_email is not null;
create index if not exists suppression_domain_idx on suppression_list (normalized_domain) where normalized_domain is not null;
create index if not exists suppression_phone_idx on suppression_list (normalized_phone) where normalized_phone is not null;

alter table campaigns enable row level security;
alter table campaign_search_queries enable row level security;
alter table discovery_runs enable row level security;
alter table lead_candidates enable row level security;
alter table discovery_quota_counters enable row level security;
alter table suppression_list enable row level security;

drop policy if exists "authenticated read campaigns" on campaigns;
drop policy if exists "founders write campaigns" on campaigns;
drop policy if exists "authenticated read search queries" on campaign_search_queries;
drop policy if exists "authenticated read discovery runs" on discovery_runs;
drop policy if exists "authenticated read lead candidates" on lead_candidates;
drop policy if exists "authenticated read quota counters" on discovery_quota_counters;
drop policy if exists "authenticated read suppression list" on suppression_list;

create policy "authenticated read campaigns" on campaigns for select to authenticated using (is_dashboard_user());
create policy "founders write campaigns" on campaigns for all to authenticated using (is_dashboard_user(array['founder', 'admin'])) with check (is_dashboard_user(array['founder', 'admin']));
create policy "authenticated read search queries" on campaign_search_queries for select to authenticated using (is_dashboard_user());
create policy "authenticated read discovery runs" on discovery_runs for select to authenticated using (is_dashboard_user());
create policy "authenticated read lead candidates" on lead_candidates for select to authenticated using (is_dashboard_user());
create policy "authenticated read quota counters" on discovery_quota_counters for select to authenticated using (is_dashboard_user(array['founder', 'admin']));
create policy "authenticated read suppression list" on suppression_list for select to authenticated using (is_dashboard_user(array['founder', 'admin']));

grant select on campaigns, campaign_search_queries, discovery_runs, lead_candidates, discovery_quota_counters, suppression_list to authenticated;
grant insert, update on campaigns to authenticated;

grant all privileges on campaigns, campaign_search_queries, discovery_runs, lead_candidates, discovery_quota_counters, suppression_list to service_role;

create or replace function reserve_discovery_quota(
  target_campaign_id uuid,
  counter_name text,
  increment_by integer,
  max_allowed integer
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  current_value integer;
begin
  if increment_by < 1 then
    raise exception 'increment_by must be positive';
  end if;

  insert into discovery_quota_counters (campaign_id, quota_date)
  values (target_campaign_id, current_date)
  on conflict (campaign_id, quota_date) do nothing;

  if counter_name = 'run_count' then
    select run_count into current_value from discovery_quota_counters where campaign_id = target_campaign_id and quota_date = current_date for update;
    if current_value + increment_by > max_allowed then return false; end if;
    update discovery_quota_counters set run_count = run_count + increment_by, updated_at = now() where campaign_id = target_campaign_id and quota_date = current_date;
  elsif counter_name = 'candidates_checked' then
    select candidates_checked into current_value from discovery_quota_counters where campaign_id = target_campaign_id and quota_date = current_date for update;
    if current_value + increment_by > max_allowed then return false; end if;
    update discovery_quota_counters set candidates_checked = candidates_checked + increment_by, updated_at = now() where campaign_id = target_campaign_id and quota_date = current_date;
  elsif counter_name = 'places_text_search_calls' then
    select places_text_search_calls into current_value from discovery_quota_counters where campaign_id = target_campaign_id and quota_date = current_date for update;
    if current_value + increment_by > max_allowed then return false; end if;
    update discovery_quota_counters set places_text_search_calls = places_text_search_calls + increment_by, total_places_calls = total_places_calls + increment_by, updated_at = now() where campaign_id = target_campaign_id and quota_date = current_date;
  elsif counter_name = 'places_details_calls' then
    select places_details_calls into current_value from discovery_quota_counters where campaign_id = target_campaign_id and quota_date = current_date for update;
    if current_value + increment_by > max_allowed then return false; end if;
    update discovery_quota_counters set places_details_calls = places_details_calls + increment_by, total_places_calls = total_places_calls + increment_by, updated_at = now() where campaign_id = target_campaign_id and quota_date = current_date;
  elsif counter_name = 'final_leads' then
    select final_leads into current_value from discovery_quota_counters where campaign_id = target_campaign_id and quota_date = current_date for update;
    if current_value + increment_by > max_allowed then return false; end if;
    update discovery_quota_counters set final_leads = final_leads + increment_by, updated_at = now() where campaign_id = target_campaign_id and quota_date = current_date;
  else
    raise exception 'Unsupported discovery quota counter: %', counter_name;
  end if;

  return true;
end;
$$;

revoke all on function reserve_discovery_quota(uuid, text, integer, integer) from public;
grant execute on function reserve_discovery_quota(uuid, text, integer, integer) to service_role;

insert into app_settings (key, value)
values
  ('discovery_limits', '{
    "max_final_leads_per_day": 30,
    "max_candidates_checked_per_day": 75,
    "max_places_details_calls_per_day": 100,
    "max_total_places_calls_per_day": 150,
    "max_discovery_runs_per_day": 1,
    "fallback_search_enabled": false,
    "apify_enabled": false,
    "serpapi_enabled": false,
    "brave_enabled": false,
    "paid_scraping_enabled": false
  }'::jsonb),
  ('google_places_field_mask', '{
    "text_search": "places.id,nextPageToken",
    "details": "id,displayName,formattedAddress,nationalPhoneNumber,websiteUri,rating,userRatingCount,googleMapsUri"
  }'::jsonb)
on conflict (key) do update set value = excluded.value;
