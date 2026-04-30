# WF-08 Weekly Report

Purpose: send founders a weekly operating report and learning loop.

Trigger:

1. Schedule Trigger weekly, Monday morning.

Node Skeleton:

1. Schedule Trigger

2. Supabase Queries
   - Leads discovered last 7 days.
   - Leads enriched last 7 days.
   - Leads scored last 7 days.
   - Band distribution.
   - Emails sent last 7 days.
   - Replies received last 7 days.
   - Positive replies last 7 days.
   - Manual review pending.
   - Top niches by Band A/B ratio.
   - Top countries/cities by Band A/B ratio.
   - Sequence performance.

3. Function Build Report
   - Keep concise.
   - Include blockers and next actions.

4. Notification
   - Email founders.
   - Optional Telegram/Discord summary.

5. Supabase Insert `workflow_events`
   - `workflow_name = WF-08 Weekly Report`
   - `status = completed`

Success criteria:

- Founders know weekly volume, reply quality, and which niche/message to improve.
