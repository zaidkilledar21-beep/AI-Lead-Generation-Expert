# WF-07 Reply Detection

Purpose: detect inbound replies, save them, classify intent, pause future sends, and notify founders.

Trigger:

1. Gmail Trigger for new inbound email.
2. Backup Schedule Trigger polling unread/recent inbox messages.

Node Skeleton:

1. Gmail Trigger
   - Watch inbox.
   - Exclude sent mail.
   - Ignore newsletters/automated bounces if Gmail labels allow.

2. Normalize Message
   - `from_email`
   - `to_email`
   - `reply_body`
   - `provider_message_id`
   - `provider_thread_id`
   - received timestamp.

3. Match Lead
   - Priority:
     1. `outreach_events.provider_thread_id`
     2. `outreach_events.provider_message_id`
     3. `leads.email = from_email`

4. IF No Match
   - Insert `workflow_events.status = skipped`.
   - Notify founders with unmatched reply.
   - Stop.

5. Supabase Insert `reply_events`
   - Store raw body and provider metadata.
   - Use `requires_human_review = true`.

6. DeepSeek Reply Classification
   - Response format: JSON object.
   - Must return PRD Section 15.2 schema.

7. Supabase Update `reply_events`
   - `intent_classification`
   - `sentiment`
   - `requires_human_review`

8. Pause Lead
   - Supabase Update `outreach_queue`
     - `status = replied`
     - `pause_reason = inbound_reply`
   - Supabase Update `leads.status`
     - `replied`, `unsubscribed`, `bounced`, or `not_interested` depending on classification.

9. Manual Review Queue
   - Upsert pending review for:
     - positive interest
     - neutral question
     - objection
     - wrong person
     - manual review required

10. Founder Notification
    - Include:
      - Business name
      - Reply excerpt
      - Classification
      - Score/band if available
      - Dashboard lead link

Success criteria:

- Any reply pauses future sends.
- Positive or ambiguous replies require human takeover.
- No AI reply is auto-sent.
