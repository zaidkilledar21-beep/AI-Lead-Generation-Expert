# Supabase Manual Setup

Run these scripts manually in the Supabase SQL Editor after creating the project.

## Order

1. Run `supabase/migrations/001_initial_schema.sql`
2. Run `supabase/seed.sql`

## After Running

- Create founder users in Supabase Auth for the dashboard.
- Add each founder Auth user to `dashboard_users`.
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
```

## Enabling Live Outreach Later

Only after test batches pass:

```sql
update app_settings
set value = jsonb_set(value, '{paused}', 'false'::jsonb)
where key = 'global_outreach';
```
