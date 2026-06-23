# WF-04 Routing

Purpose: route scored leads into manual review, outreach queue, nurture, or archive.

Trigger:

1. Schedule Trigger every 30 minutes.
2. Manual Trigger after scoring test batches.

Supabase source query:

```sql
select *
from wf04_scored_leads
order by updated_at asc
limit 50;
```

`wf04_scored_leads` is the committed safe source view. It returns only scored leads that have a persisted `lead_scores` row and flattens latest band, confidence, manual-review requirement, contact paths, and outreach hook for deterministic routing. Manual production testing may apply `campaign_id` or `discovery_run_id` filters without changing the global scheduled source.

Node Skeleton:

1. Schedule Trigger

2. Supabase Select scored leads

3. Split In Batches
   - Batch size: `10`.

4. Supabase Select latest `lead_scores`

5. Supabase Select latest `automation_hypotheses`

6. IF Manual Review Required
   - Conditions:
     - Band A
     - confidence = low
     - missing/weak `outreach_hook`
     - `manual_review_required = true`

   Before this branch, `email_usable = false` must bypass manual review and call
   `route_scored_lead`, which archives the lead through the canonical email gate.

7. Manual Review Branch
   - RPC `queue_manual_review_item`
     - One pending row per lead.
     - If a pending row already exists for a different reason, update and reuse it.
     - `priority = high` for Band A.
   - Supabase Update `leads.status = review_pending`.

8. Band B Auto Queue Branch
   - Only if reachable and no manual review trigger.
   - Check `app_settings.global_outreach.paused`.
   - If global pause is true, create review/pause event, do not queue live sending.
   - If global pause is false, insert/update `outreach_queue`.

9. Band C Branch
   - MVP default: `leads.status = paused`.
   - No live outreach unless explicitly enabled later.

10. Band D Branch
   - `leads.status = archived`.

11. Supabase Insert `workflow_events`

Success criteria:

- Reruns do not duplicate pending review rows.
- Reruns do not duplicate outreach queue rows.
- Only leads with a usable business email can enter manual review or `outreach_queue`.
- Band A always goes through founder review first.
- WF-01/WF-02/WF-03 remain backend-owned. n8n begins at WF-04.
