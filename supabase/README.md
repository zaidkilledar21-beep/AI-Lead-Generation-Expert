# Supabase Manual Setup

Run these scripts manually in the Supabase SQL Editor after creating the project.

## Order

1. Run `supabase/migrations/001_initial_schema.sql`
2. Run `supabase/migrations/002_near_zero_discovery.sql`
3. Run `supabase/migrations/003_places_total_quota_rpc.sql`
4. Run `supabase/migrations/004_scoring_metadata.sql`
5. Run `supabase/migrations/005_n8n_backend_contract_alignment.sql`
6. Run `supabase/migrations/006_crm_action_foundations.sql`
7. Run `supabase/migrations/007_crm_prd_compatibility.sql`
8. Run `supabase/migrations/008_pass_4_crm_frontend_completion.sql`
9. Run `supabase/migrations/009_pass_4_crm_workflow_contracts.sql`
10. Run `supabase/migrations/010_pass_5_reply_contract_security_sync.sql`
11. Run `supabase/seed.sql`

If the live Supabase project already contains workflow RPCs, compare the signatures before applying changes. `010_pass_5_reply_contract_security_sync.sql` is the version-controlled Pass 5 sync point for canonical reply intents, WF-07 pause ownership, Gmail thread ID persistence, and sensitive RPC grants.

## After Running

- Create founder users in Supabase Auth for the dashboard.
- Add each founder Auth user to `dashboard_users`.
- In Supabase Auth URL Configuration, set the Site URL to the deployed app URL and add `<APP_BASE_URL>/**` to Redirect URLs before enabling email-link or OAuth login.
- Keep `global_outreach.paused` set to `true` until test sending is complete.
- Use the service role key only in server/n8n environments.
- Use the anon key only for the dashboard client.

## Add Founder Dashboard Access

After creating a user in Supabase Auth, copy that user's UUID and run:

```sql
insert into dashboard_users (user_id, role, active)
values ('PASTE_AUTH_USER_UUID_HERE', 'founder', true)
on conflict (user_id) do update
set role = excluded.role,
    active = excluded.active;
```

## Validation Queries

```sql
select table_name
from information_schema.tables
where table_schema = 'public'
order by table_name;

select key, value
from app_settings
order by key;

select name, band, active
from outreach_sequences
order by band, name;

select s.name, st.step_number, st.delay_days, st.template_type
from outreach_sequences s
join outreach_steps st on st.sequence_id = s.id
order by s.band, st.step_number;

select routine_name
from information_schema.routines
where routine_schema = 'public'
  and routine_name in (
    'reserve_places_quota',
    'queue_manual_review_item',
    'route_scored_lead',
    'load_draft_context',
    'persist_draft_or_block',
    'sending_global_outreach_allowed',
    'select_available_sending_inbox',
    'select_approved_due_email_draft',
    'update_email_send_state',
    'match_reply_to_lead',
    'insert_reply_event',
    'pause_queue_after_reply',
    'dashboard_update_lead_status',
    'weekly_founder_report_metrics'
  )
order by routine_name;
```

Check sensitive RPC grants after applying Pass 5:

```sql
select routine_schema, routine_name, grantee, privilege_type
from information_schema.routine_privileges
where routine_schema = 'public'
  and routine_name in (
    'insert_reply_event',
    'match_reply_to_lead',
    'pause_queue_after_reply',
    'queue_manual_review_item',
    'select_approved_due_email_draft',
    'select_available_sending_inbox',
    'sending_global_outreach_allowed',
    'update_email_send_state',
    'weekly_founder_report_metrics',
    'route_scored_lead',
    'load_draft_context',
    'persist_draft_or_block',
    'reserve_places_quota'
  )
  and grantee in ('PUBLIC', 'anon')
order by routine_name, grantee;
```

This query should return no rows. Workflow execution uses the Supabase service role from n8n credentials; browser clients must not receive direct execute grants for these workflow RPCs.

Check the synchronized WF-06/WF-07 signatures:

```sql
select p.proname, pg_get_function_identity_arguments(p.oid) as arguments, pg_get_function_result(p.oid) as returns
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in ('pause_queue_after_reply', 'update_email_send_state', 'queue_manual_review_item')
order by p.proname, arguments;
```

## WF-06/WF-07 Smoke Path

Before first real outreach:

1. Create or import one test lead under a test campaign.
2. Run enrichment, scoring, routing, and WF-05 draft generation.
3. Edit and approve the draft in the CRM; approval must not mark it sent.
4. Temporarily unpause global outreach for the controlled test only.
5. Run WF-06 and verify exactly one Gmail send plus `email_drafts.sent = true`, `provider_message_id`, and `provider_thread_id` when Gmail returns them.
6. Send a test reply to that thread.
7. Run WF-07 and verify `reply_events.intent_classification` is canonical, all future outreach for the lead is paused, and any human review row is queued exactly once by `pause_queue_after_reply`.
8. Mark the reply handled, won, or lost in the CRM and verify pending reply review rows close with valid `review_status`.
9. Re-check analytics and WF-08 weekly report metrics.

## Enabling Live Outreach Later

Only after test batches pass:

```sql
update app_settings
set value = jsonb_set(value, '{paused}', 'false'::jsonb)
where key = 'global_outreach';
```
