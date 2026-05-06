# Troubleshooting

## n8n auth failure

Verify the app and n8n share the same `N8N_API_KEY` or compatibility `N8N_WORKFLOW_API_KEY`. App workflow routes require `x-n8n-api-key` or `Authorization: Bearer ...`.

## Supabase RPC missing

Apply migrations through `011_pass_6_contract_closure.sql`, then run `supabase/validation/pass_6_contract_checks.sql`. Any returned rows identify missing signatures or unsafe grants.

## Campaign run not starting

Confirm the CRM has `N8N_BASE_URL` and `N8N_DISCOVERY_WEBHOOK_PATH` or a full webhook URL if your deployment uses one. In n8n, WF-10 must expose the `wf-10-lead-discovery` webhook and then call `POST {{APP_BASE_URL}}/api/workflows/discovery/run`.

## WF-05 draft not generated

Check `outreach_queue.status = queued`, `next_send_at <= now()`, score evidence exists, and `load_draft_context` returns lead, score, evidence, step, and campaign context.

## WF-06 not sending

Check global pause, inbox active state, inbox daily limit, approved/auto-approved draft state, and existing reply events for the lead. WF-06 should not send if any reply already exists.

## Provider message or thread ID missing

Inspect the Gmail node output and `update_email_send_state` payload. WF-06 maps `threadId`, `thread_id`, or `thread.id` into `p_gmail_thread_id`.

## WF-07 reply not detected

Check Gmail trigger credentials and `match_reply_to_lead` matching inputs. Replies should match by provider thread/message IDs first, then sender email fallback.

## Inbox AI draft missing

WF-07 must pass `p_ai_draft_reply` into `pause_queue_after_reply`. CRM inbox and lead detail read `reply_events.ai_draft_reply`; if it is empty, the UI should show that no AI draft was generated.

## Analytics empty

Verify views exist, workflow events are being written, and the selected date range includes recent leads, drafts, sends, or replies.

## Protected route redirects unexpectedly

Confirm the user is signed in through Supabase Auth and has an active `dashboard_users` row with a supported role. Missing or inactive records are denied even if the Auth session is valid.
