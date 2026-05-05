# WF-06 Sending Scheduler

Purpose: send approved/auto-approved due emails through one Google Workspace inbox.

Trigger:

1. Schedule Trigger every 15 minutes during sending window.
2. Manual Trigger for controlled testing.

Source query:

```sql
select q.*
from outreach_queue q
where q.status = 'queued'
  and q.next_send_at <= now()
order by q.next_send_at asc
limit 10;
```

Node Skeleton:

1. Schedule Trigger

2. Supabase Select `app_settings.global_outreach`
   - IF paused: stop workflow and log `skipped`.

3. Supabase Select active inbox
   - `active = true`
   - `current_daily_sent < daily_send_limit`
   - order by `last_sent_at nulls first`.

4. IF No Inbox Capacity
   - Log `blocked`.
   - Stop.

5. Supabase Select due `outreach_queue`

6. Split In Batches
   - Batch size: `1` to reduce accidental bursts.

7. Safety Checks
   - Lead email present.
   - Lead status not blocked.
   - No reply exists.
   - `app_settings.global_outreach.paused` is not true.
   - No unresolved send block.
   - Inbox daily limit still available.

8. Supabase Select Draft
   - Matching `lead_id`, `sequence_id`, `step_number`.
   - `validation_passed = true`.
   - `approval_status in ('approved', 'auto_approved')`.
   - `sent = false`.

9. IF No Draft
   - Execute/call `WF-05 Draft Generation` or log blocked.
   - Do not send.

10. Gmail Send
    - From configured Google Workspace inbox.
    - To lead email.
    - Subject/body from `email_drafts`.
    - No attachments.

11. Supabase Insert `outreach_events`
    - `status = sent`
    - provider message/thread ID.

12. Supabase Update `email_drafts`
    - `sent = true`.

13. Supabase Update `inboxes`
    - increment `current_daily_sent`.
    - set `last_sent_at = now()`.

14. Supabase Select next `outreach_steps`
    - If next step exists:
      - update `outreach_queue.current_step`
      - update `next_send_at = now() + delay_days`
    - Else:
      - update `outreach_queue.status = completed`.

Success criteria:

- Daily send limits are enforced.
- One email at a time.
- Follow-ups never send after a reply.
- Only WF-06 sends outreach; CRM pages only approve, reject, pause, and edit drafts.
