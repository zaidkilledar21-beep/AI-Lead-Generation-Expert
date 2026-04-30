# WF-00 Error Logger

Purpose: centralize failed workflow logging in Supabase.

Trigger:

1. Error Trigger

Nodes:

1. Set `error_context`
   - `workflow_name`: `{{$json.workflow.name}}`
   - `event_type`: `error`
   - `status`: `failed`
   - `error_message`: error message from trigger
   - `payload`: redacted error payload

2. Supabase Insert `workflow_events`
   - `workflow_name`
   - `event_type`
   - `status`
   - `error_message`
   - `payload`

3. Notification
   - Send concise alert to founders.

Required behavior:

- Do not retry the error logger infinitely.
- Notification body must include workflow name, node name, error message, and execution URL.
- Redact API keys, OAuth tokens, auth headers, cookies, service-role keys, raw HTML, full Google payloads, emails, phone numbers, and reply bodies before writing `workflow_events.payload`.
- Include `campaign_id`, `discovery_run_id`, and `candidate_id` when available.
