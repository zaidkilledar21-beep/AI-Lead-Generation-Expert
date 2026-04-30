# WF-04 Routing

Purpose: route scored leads into manual review, outreach queue, nurture, or archive.

Trigger:

1. Schedule Trigger every 30 minutes.
2. Manual Trigger after scoring test batches.

Supabase source query:

```sql
select id
from leads
where status = 'scored'
order by updated_at asc
limit 50;
```

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
     - missing usable contact
     - missing/weak `outreach_hook`
     - `manual_review_required = true`

7. Manual Review Branch
   - Supabase Upsert `manual_review_queue`
     - One pending row per lead.
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
- Only eligible Band B leads enter `outreach_queue`.
- Band A always goes through founder review first.
