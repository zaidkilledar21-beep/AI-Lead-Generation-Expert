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
8. Run `supabase/seed.sql`

If the live Supabase project already contains the WF-04 through WF-08 RPCs, do not overwrite them from memory. Export or inspect the live definitions first, then commit them as a separate migration if they are not already represented in this repo.

## After Running

- Create founder users in Supabase Auth for the dashboard.
- Add each founder Auth user to `dashboard_users`.
- In Supabase Auth URL Configuration, set the Site URL to `https://ai-lead-generation-expert.vercel.app` and add `https://ai-lead-generation-expert.vercel.app/**` to Redirect URLs before enabling email-link or OAuth login.
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
    'weekly_founder_report_metrics'
  )
order by routine_name;
```

## Enabling Live Outreach Later

Only after test batches pass:

```sql
update app_settings
set value = jsonb_set(value, '{paused}', 'false'::jsonb)
where key = 'global_outreach';
```
