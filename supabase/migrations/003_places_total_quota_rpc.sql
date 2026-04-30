create or replace function reserve_places_quota(
  target_campaign_id uuid,
  counter_name text,
  increment_by integer,
  counter_max_allowed integer,
  total_max_allowed integer
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  selected_counter integer;
  selected_total integer;
begin
  if increment_by < 1 then
    raise exception 'increment_by must be positive';
  end if;

  insert into discovery_quota_counters (campaign_id, quota_date)
  values (target_campaign_id, current_date)
  on conflict (campaign_id, quota_date) do nothing;

  select total_places_calls
  into selected_total
  from discovery_quota_counters
  where campaign_id = target_campaign_id
    and quota_date = current_date
  for update;

  if counter_name in ('places_text_search_calls', 'places_details_calls')
    and selected_total + increment_by > total_max_allowed then
    return false;
  end if;

  if counter_name = 'run_count' then
    select run_count into selected_counter from discovery_quota_counters where campaign_id = target_campaign_id and quota_date = current_date;
    if selected_counter + increment_by > counter_max_allowed then return false; end if;
    update discovery_quota_counters set run_count = run_count + increment_by, updated_at = now() where campaign_id = target_campaign_id and quota_date = current_date;
  elsif counter_name = 'candidates_checked' then
    select candidates_checked into selected_counter from discovery_quota_counters where campaign_id = target_campaign_id and quota_date = current_date;
    if selected_counter + increment_by > counter_max_allowed then return false; end if;
    update discovery_quota_counters set candidates_checked = candidates_checked + increment_by, updated_at = now() where campaign_id = target_campaign_id and quota_date = current_date;
  elsif counter_name = 'places_text_search_calls' then
    select places_text_search_calls into selected_counter from discovery_quota_counters where campaign_id = target_campaign_id and quota_date = current_date;
    if selected_counter + increment_by > counter_max_allowed then return false; end if;
    update discovery_quota_counters
    set places_text_search_calls = places_text_search_calls + increment_by,
        total_places_calls = total_places_calls + increment_by,
        updated_at = now()
    where campaign_id = target_campaign_id and quota_date = current_date;
  elsif counter_name = 'places_details_calls' then
    select places_details_calls into selected_counter from discovery_quota_counters where campaign_id = target_campaign_id and quota_date = current_date;
    if selected_counter + increment_by > counter_max_allowed then return false; end if;
    update discovery_quota_counters
    set places_details_calls = places_details_calls + increment_by,
        total_places_calls = total_places_calls + increment_by,
        updated_at = now()
    where campaign_id = target_campaign_id and quota_date = current_date;
  elsif counter_name = 'final_leads' then
    select final_leads into selected_counter from discovery_quota_counters where campaign_id = target_campaign_id and quota_date = current_date;
    if selected_counter + increment_by > counter_max_allowed then return false; end if;
    update discovery_quota_counters set final_leads = final_leads + increment_by, updated_at = now() where campaign_id = target_campaign_id and quota_date = current_date;
  else
    raise exception 'Unsupported discovery quota counter: %', counter_name;
  end if;

  return true;
end;
$$;

revoke all on function reserve_places_quota(uuid, text, integer, integer, integer) from public;
grant execute on function reserve_places_quota(uuid, text, integer, integer, integer) to service_role;
