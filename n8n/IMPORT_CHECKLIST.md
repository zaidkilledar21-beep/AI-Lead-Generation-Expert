# n8n Import Checklist

Updated workflow JSON exports are committed under `n8n/importable-json/`. The project owner still owns importing and activating them in the live n8n instance. Keep API keys redacted in exports.

## Credentials

- Supabase service role credential for all Supabase nodes.
- Google Workspace OAuth credential for WF-06 sending and WF-07 reply detection.
- Google Places API key credential for WF-10 only.
- DeepSeek API key credential for scoring, drafting, and reply classification.
- Notification channel credential for founder alerts and weekly reports.
- App workflow API key for app HTTP endpoints using `x-n8n-api-key`.

## Environment

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `APP_BASE_URL`
- `N8N_WORKFLOW_API_KEY`
- `FOUNDER_NOTIFY_EMAIL`
- `GOOGLE_PLACES_API_KEY` if WF-10 uses env-backed HTTP nodes instead of credentials.
- Global outreach remains paused until WF-06 dry-run and reply tests pass.

## Required Supabase RPCs

- `reserve_places_quota`
- `dashboard_update_lead_status`
- `insert_reply_event`
- `match_reply_to_lead`
- `pause_queue_after_reply`
- `queue_manual_review_item`
- `select_available_sending_inbox`
- `sending_global_outreach_allowed`
- `update_email_send_state`
- `sync_send_block_contract_columns`

`pause_queue_after_reply` must own reply-triggered manual review queueing. `WF-07 Reply Detection` should pause the queue and notify founders after classification; it should not call `queue_manual_review_item` separately for reply classification results.

## Activation Order

1. WF-00 Error Logger
2. WF-10 Lead Discovery - Backend Runner
3. WF-04 Routing
4. WF-05 Draft Generation
5. WF-06 Sending Scheduler
6. WF-07 Reply Detection
7. WF-08 Send Weekly Report

## Safety Checks

- WF-06 send test: use one approved draft, one test inbox, and global pause off only for the controlled test.
- WF-07 reply test: verify a reply creates `reply_events`, pauses `outreach_queue`, and blocks all future sends for that lead.
- WF-07 manual review test: for `positive_interest`, `neutral_question`, `objection`, `wrong_person`, or `manual_review_required`, verify exactly one pending `manual_review_queue` row exists with reason `reply_<canonical_intent>`.
- WF-06 provider ID test: verify `update_email_send_state` receives both `p_gmail_message_id` and `p_gmail_thread_id` from Gmail output when Gmail returns them.
- Global pause test: set `app_settings.global_outreach.paused = true` and confirm WF-06 logs skipped/blocked without sending.
- Band A first-touch test: confirm Step 1 remains pending until founder approval.
- Interested reply test: confirm no auto-answer path exists.

## Canonical Reply Intents

WF-07 must emit only these values:

- `positive_interest`
- `neutral_question`
- `objection`
- `not_interested`
- `unsubscribe`
- `out_of_office`
- `wrong_person`
- `bounce`
- `manual_review_required`

Legacy values such as `interested`, `pricing_request`, `call_request`, `question`, `negative`, `ambiguous`, and `bounce_or_noise` must not be emitted by workflow JSON.

## Forbidden Writes

- Do not write `leads.status = "approved"`.
- Do not write `manual_review_queue.review_status = "handled"`.
- Do not write `outreach_queue.status = "in_sequence"`.
- Do not write `email_drafts.approval_status = "sent"`.
- Store reply state in `reply_events`.
- Store workflow telemetry in `workflow_events`.
