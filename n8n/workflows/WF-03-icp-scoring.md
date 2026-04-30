# WF-03 ICP Scoring

Purpose: score enriched leads, save evidence, and generate an automation hypothesis.

Trigger:

1. Schedule Trigger every 30-60 minutes.
2. Manual Trigger for testing.

Supabase source query:

```sql
select l.id
from leads l
where l.status = 'enriched'
order by l.updated_at asc
limit 25;
```

Node Skeleton:

1. Schedule Trigger

2. Supabase Select `leads`
   - `status = enriched`.

3. Split In Batches
   - Batch size: `5`.

4. Supabase Select latest `lead_enrichment`
   - `lead_id = current lead`.

5. Supabase Select `app_settings`
   - `key = icp_config`
   - `key = routing_config`

6. DeepSeek HTTP Request
   - Model: `deepseek-chat`.
   - Response format: JSON object.
   - Prompt must include:
     - Lead profile
     - Enrichment
     - ICP config
     - Required scoring schema
   - Must return PRD Section 15.1 shape.

7. Function `Validate Score JSON`
   - `total_score` between `0` and `100`.
   - Every metric score within max.
   - Metric max values match config.
   - `automation_hypothesis.outreach_hook` present.
   - Reject invalid JSON.

8. Supabase Insert `lead_scores`

9. Supabase Insert Many `score_evidence`
   - One row per metric.

10. Supabase Insert `automation_hypotheses`

11. Supabase Update `leads`
    - `status = scored`.

12. Supabase Insert `workflow_events`

Failure behavior:

- Invalid DeepSeek output creates `workflow_events.status = failed`.
- Do not save partial score/evidence without hypothesis.

Success criteria:

- Every scored lead has score evidence.
- Every scored lead has an automation hypothesis.
