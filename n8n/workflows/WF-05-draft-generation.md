# WF-05 Draft Generation

Purpose: generate and validate personalized email drafts before sending.

Trigger:

1. Schedule Trigger every 30 minutes.
2. Manual Trigger for a single `lead_id`.

Source query:

```sql
select q.*
from outreach_queue q
where q.status = 'queued'
  and q.next_send_at <= now()
order by q.next_send_at asc
limit 25;
```

Regeneration source query:

```sql
select d.*
from email_drafts d
where d.approval_status = 'regeneration_requested'
  and coalesce(d.sent, false) = false
order by d.updated_at asc
limit 25;
```

Node Skeleton:

1. Schedule Trigger

2. Supabase Select due `outreach_queue`

3. Split In Batches
   - Batch size: `5`.

4. Safety Checks
   - Lead exists.
   - Lead email exists.
   - Lead status not blocked.
   - No `reply_events` row exists.
   - No unresolved `send_blocks`.
   - Global outreach not paused unless draft-only mode.

5. Supabase Select context
   - `leads`
   - latest `lead_enrichment`
   - latest `lead_scores`
   - `score_evidence`
   - latest `automation_hypotheses`
   - `outreach_steps`

6. DeepSeek HTTP Request
   - Model: `deepseek-chat`.
   - Response format: JSON object.
   - Must return PRD Section 15.3 schema.

7. Function `Validate Draft`
   - Subject present.
   - Body present.
   - Word limit by band/step.
   - One specific observation.
   - One automation idea.
   - One CTA unless D informational.
   - No false claims.
   - Step 1 link count = 0.
   - Later link count <= 2.
   - Forbidden phrases absent.

8. IF Validation Failed
   - Insert `send_blocks`.
   - Insert `email_drafts` with:
     - `validation_passed = false`
     - `approval_status = blocked`
   - Insert `outreach_events.status = blocked`.
   - Continue next queue item.

9. IF Validation Passed
   - Insert/Upsert `email_drafts`.
   - Approval status:
     - Band A Step 1: `pending`
     - Band B if configured: `pending`
     - Otherwise: `auto_approved`
   - If regenerating, replace subject/body on the same draft or create a superseding pending draft and clear the old `regeneration_requested` item.

10. If pending
   - Upsert `manual_review_queue`.
   - Notify founders.

Success criteria:

- No email is sent by this workflow.
- All drafts are stored before sending.
- Blocked drafts are auditable.
- Founder regeneration requests are persisted as `approval_status = regeneration_requested`; they are not represented as sent.
