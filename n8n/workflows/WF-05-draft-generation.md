# WF-05 Draft Generation

Purpose: generate and validate personalized email drafts before sending.

Trigger:

1. Schedule Trigger every 30 minutes.
2. Manual Trigger for a single `lead_id`.

Safe source query:

```sql
select *
from wf05_due_queue_items
order by next_send_at asc
limit 25;
```

`wf05_due_queue_items` exposes queue, lead, campaign, discovery-run, existing-draft, pending-review, and `wf05_action` fields. Manual production testing may add `campaign_id` or `discovery_run_id` filters.

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

3. Switch `wf05_action`
   - `generate_draft`: continue to context loading and DeepSeek.
   - `archive_unusable_email`: archive the lead, block any active queue row, and reject pending pre-outreach review items.
   - `skip_existing_draft`: sync queue and lead drafted.
   - `skip_existing_manual_review`: sync queue blocked and lead review pending without inserting another review.
   - `block_invalid_lead_status`: block and create or reuse one review item.
   - `block_missing_lead`: block the orphaned queue item.

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
   - Processes every input item and returns one output item per DeepSeek response.
   - Preserves stable `queue_id` and `lead_id` from the matched context.
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
- Stale, duplicate, and missing-email queue rows are synchronized before DeepSeek and cannot crash the eligible batch.
- Founder regeneration requests are persisted as `approval_status = regeneration_requested`; they are not represented as sent.
