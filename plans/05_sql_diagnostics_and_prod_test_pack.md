# Phase 5: SQL Diagnostics and Production Test Pack

## Goal

Provide repeatable SQL diagnostics for production runs so failures can be understood in minutes.

## Required diagnostic queries

### Latest discovery runs for campaign

```sql
select
  id,
  campaign_id,
  status,
  candidates_checked,
  places_text_search_calls,
  places_details_calls,
  total_places_calls,
  candidates_promoted,
  duplicates_skipped,
  manual_review_candidates,
  crawl_failures,
  error_message,
  started_at,
  completed_at
from discovery_runs
where campaign_id = '<campaign_id>'
order by started_at desc
limit 5;
```

### Checkpoint trail

```sql
select
  event_type,
  status,
  error_message,
  payload,
  created_at
from workflow_events
where discovery_run_id = '<run_id>'
order by created_at asc;
```

### Candidate/lead consistency

```sql
select
  candidate_status,
  count(*) as count,
  count(final_lead_id) as with_final_lead
from lead_candidates
where discovery_run_id = '<run_id>'
group by candidate_status
order by candidate_status;
```

### Leads created by run

```sql
select
  id,
  business_name,
  website,
  email,
  phone,
  status,
  campaign_id,
  candidate_id,
  discovery_run_id,
  created_at
from leads
where discovery_run_id = '<run_id>'
order by created_at desc;
```

### Enrichment/scoring/routing status

```sql
select
  l.id,
  l.business_name,
  l.email,
  l.status,
  exists(select 1 from lead_enrichment e where e.lead_id = l.id) as has_enrichment,
  exists(select 1 from lead_scores s where s.lead_id = l.id) as has_score,
  exists(select 1 from manual_review_queue r where r.lead_id = l.id and r.review_status = 'pending') as has_pending_review,
  exists(select 1 from outreach_queue q where q.lead_id = l.id) as has_outreach_queue
from leads l
where l.discovery_run_id = '<run_id>'
order by l.created_at desc;
```

## Production test sequence

1. Deploy Phase 1.
2. Recover/mark the old stuck run safely.
3. Create a fresh test campaign.
4. Run Now once.
5. Do not click repeatedly.
6. Watch frontend run status.
7. Run diagnostics above.
8. Only proceed to Phase 2/3 if the run terminal state and counts are correct.
