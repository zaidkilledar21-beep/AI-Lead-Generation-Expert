-- Adds an idempotent database-side recovery hook for discovery runs that have
-- fetched candidates but did not reach the normal lead promotion stage.

create or replace function public.recover_stranded_discovery_candidates(
  p_discovery_run_id uuid,
  p_limit integer default 100
)
returns table (
  created_count integer,
  duplicate_count integer,
  remaining_count integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_candidate public.lead_candidates%rowtype;
  v_lead_id uuid;
  v_created integer := 0;
  v_duplicates integer := 0;
  v_limit integer := greatest(1, least(coalesce(p_limit, 100), 500));
  v_campaign_id uuid;
begin
  if p_discovery_run_id is null then
    raise exception 'p_discovery_run_id is required';
  end if;

  select dr.campaign_id
  into v_campaign_id
  from public.discovery_runs as dr
  where dr.id = p_discovery_run_id;

  if v_campaign_id is null then
    raise exception 'Discovery run not found: %', p_discovery_run_id;
  end if;

  for v_candidate in
    select *
    from public.lead_candidates as lc
    where lc.discovery_run_id = p_discovery_run_id
      and lc.candidate_status = 'details_fetched'
      and lc.final_lead_id is null
    order by lc.created_at asc, lc.id asc
    limit v_limit
  loop
    select l.id
    into v_lead_id
    from public.leads as l
    where (v_candidate.google_place_id is not null and l.google_place_id = v_candidate.google_place_id)
       or (v_candidate.dedupe_key is not null and l.dedupe_key = v_candidate.dedupe_key)
       or (
            l.business_name = v_candidate.business_name
            and coalesce(l.city, '') = coalesce(v_candidate.city, '')
            and coalesce(l.country, '') = coalesce(v_candidate.country, '')
          )
    order by l.created_at asc
    limit 1;

    if v_lead_id is not null then
      update public.lead_candidates as lc
      set candidate_status = 'duplicate',
          rejection_reason = coalesce(lc.rejection_reason, 'duplicate_recovered_lead'),
          final_lead_id = v_lead_id
      where lc.id = v_candidate.id;
      v_duplicates := v_duplicates + 1;
      continue;
    end if;

    insert into public.leads (
      business_name,
      website,
      country,
      city,
      niche,
      source,
      google_maps_url,
      phone,
      rating,
      review_count,
      address,
      status,
      campaign_id,
      candidate_id,
      discovery_run_id,
      google_place_id,
      dedupe_key,
      source_attribution
    )
    values (
      v_candidate.business_name,
      v_candidate.website,
      v_candidate.country,
      v_candidate.city,
      v_candidate.niche,
      v_candidate.source,
      v_candidate.google_maps_url,
      v_candidate.phone,
      v_candidate.rating,
      v_candidate.review_count,
      v_candidate.address,
      'new',
      v_candidate.campaign_id,
      v_candidate.id,
      v_candidate.discovery_run_id,
      v_candidate.google_place_id,
      v_candidate.dedupe_key,
      coalesce(v_candidate.source_attribution, '{}'::jsonb)
    )
    returning id into v_lead_id;

    update public.lead_candidates as lc
    set candidate_status = 'promoted',
        final_lead_id = v_lead_id
    where lc.id = v_candidate.id;

    v_created := v_created + 1;
  end loop;

  select count(*)::integer
  into remaining_count
  from public.lead_candidates as lc
  where lc.discovery_run_id = p_discovery_run_id
    and lc.candidate_status = 'details_fetched'
    and lc.final_lead_id is null;

  insert into public.workflow_events (
    workflow_name,
    campaign_id,
    discovery_run_id,
    event_type,
    status,
    payload
  )
  values (
    'Discovery Candidate Recovery',
    v_campaign_id,
    p_discovery_run_id,
    'stranded_candidates_recovered',
    'completed',
    jsonb_build_object(
      'discovery_run_id', p_discovery_run_id,
      'created', v_created,
      'duplicates', v_duplicates,
      'remaining', remaining_count
    )
  );

  update public.discovery_runs as dr
  set candidates_promoted = greatest(coalesce(dr.candidates_promoted, 0), v_created),
      completed_at = null,
      status = case when v_created > 0 then 'running' else dr.status end
  where dr.id = p_discovery_run_id
    and v_created > 0;

  created_count := v_created;
  duplicate_count := v_duplicates;
  return next;
end;
$$;

revoke all on function public.recover_stranded_discovery_candidates(uuid, integer) from public, anon, authenticated;
grant execute on function public.recover_stranded_discovery_candidates(uuid, integer) to service_role;
