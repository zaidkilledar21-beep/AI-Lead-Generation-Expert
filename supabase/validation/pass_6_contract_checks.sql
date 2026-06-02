-- Pass 6 RPC contract validation.
-- Run after applying migrations against a Supabase/Postgres database.

with required_functions(function_name, identity_arguments) as (
  values
    ('route_scored_lead', 'p_lead_id uuid, p_band text, p_niche text'),
    ('load_draft_context', 'p_queue_id uuid'),
    ('persist_draft_or_block', 'p_queue_id uuid, p_lead_id uuid, p_is_valid boolean, p_subject text, p_body text, p_channel text, p_approval_status text, p_block_reason text, p_raw_draft jsonb'),
    ('weekly_founder_report_metrics', 'p_start_at timestamp with time zone, p_end_at timestamp with time zone'),
    ('dashboard_update_lead_status', 'target_lead_id uuid, next_status text'),
    ('pause_queue_after_reply', 'p_lead_id uuid, p_intent_classification text, p_sentiment text, p_requires_human_review boolean, p_reply_event_id uuid, p_summary text, p_suggested_next_action text, p_ai_draft_reply text, p_raw_classifier_response jsonb'),
    ('queue_manual_review_item', 'p_lead_id uuid, p_reason text, p_priority text'),
    ('queue_manual_review_item_sync', 'p_lead_id uuid, p_reason text, p_priority text, p_force boolean'),
    ('queue_manual_review_item_force', 'p_lead_id uuid, p_reason text, p_priority text'),
    ('sync_run_review_pending', 'p_discovery_run_id uuid'),
    ('select_approved_due_email_draft', ''),
    ('update_email_send_state', 'p_draft_id uuid, p_queue_id uuid, p_lead_id uuid, p_inbox_id uuid, p_gmail_message_id text, p_gmail_thread_id text'),
    ('sending_global_outreach_allowed', ''),
    ('select_available_sending_inbox', ''),
    ('insert_reply_event', 'p_lead_id uuid, p_from_email text, p_to_email text, p_reply_body text, p_provider_message_id text, p_provider_thread_id text'),
    ('match_reply_to_lead', 'p_from_email text, p_provider_message_id text, p_provider_thread_id text'),
    ('reserve_places_quota', 'target_campaign_id uuid, counter_name text, increment_by integer, counter_max_allowed integer, total_max_allowed integer')
    ,('acquire_discovery_recovery_lease', 'p_discovery_run_id uuid, p_lease_token uuid, p_lease_seconds integer')
    ,('release_discovery_recovery_lease', 'p_discovery_run_id uuid, p_lease_token uuid')
    ,('sync_wf05_queue_action', 'p_queue_id uuid, p_action text')
),
actual_functions as (
  select
    p.oid,
    p.proname as function_name,
    pg_get_function_identity_arguments(p.oid) as identity_arguments
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
)
select
  'missing_required_function' as check_name,
  rf.function_name,
  rf.identity_arguments
from required_functions rf
left join actual_functions af
  on af.function_name = rf.function_name
 and af.identity_arguments = rf.identity_arguments
where af.oid is null;

with sensitive_functions(function_name) as (
  values
    ('route_scored_lead'),
    ('load_draft_context'),
    ('persist_draft_or_block'),
    ('weekly_founder_report_metrics'),
    ('pause_queue_after_reply'),
    ('queue_manual_review_item'),
    ('select_approved_due_email_draft'),
    ('update_email_send_state'),
    ('sending_global_outreach_allowed'),
    ('select_available_sending_inbox'),
    ('insert_reply_event'),
    ('match_reply_to_lead'),
    ('reserve_places_quota')
    ,('acquire_discovery_recovery_lease')
    ,('release_discovery_recovery_lease')
    ,('sync_wf05_queue_action')
    ,('queue_manual_review_item_sync')
    ,('queue_manual_review_item_force')
    ,('sync_run_review_pending')
),
actual_functions as (
  select p.oid, p.oid::regprocedure as signature, p.proname as function_name
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  join sensitive_functions sf on sf.function_name = p.proname
  where n.nspname = 'public'
)
select
  'sensitive_function_bad_grant' as check_name,
  signature::text,
  has_function_privilege('public', oid, 'execute') as public_execute,
  has_function_privilege('anon', oid, 'execute') as anon_execute,
  has_function_privilege('authenticated', oid, 'execute') as authenticated_execute,
  has_function_privilege('service_role', oid, 'execute') as service_role_execute
from actual_functions
where has_function_privilege('public', oid, 'execute')
   or has_function_privilege('anon', oid, 'execute')
   or has_function_privilege('authenticated', oid, 'execute')
   or not has_function_privilege('service_role', oid, 'execute');

select
  'dashboard_grant_missing' as check_name,
  not has_function_privilege('authenticated', 'public.dashboard_update_lead_status(uuid, text)', 'execute') as authenticated_missing,
  not has_function_privilege('service_role', 'public.dashboard_update_lead_status(uuid, text)', 'execute') as service_role_missing,
  has_function_privilege('public', 'public.dashboard_update_lead_status(uuid, text)', 'execute') as public_execute,
  has_function_privilege('anon', 'public.dashboard_update_lead_status(uuid, text)', 'execute') as anon_execute
where not has_function_privilege('authenticated', 'public.dashboard_update_lead_status(uuid, text)', 'execute')
   or not has_function_privilege('service_role', 'public.dashboard_update_lead_status(uuid, text)', 'execute')
   or has_function_privilege('public', 'public.dashboard_update_lead_status(uuid, text)', 'execute')
   or has_function_privilege('anon', 'public.dashboard_update_lead_status(uuid, text)', 'execute');

select 'missing_required_view' as check_name, required_view
from (values ('wf04_scored_leads'), ('wf05_due_queue_items')) required(required_view)
where to_regclass('public.' || required_view) is null;

-- Issue #52 RPC ambiguity guard: there must be exactly ONE function named queue_manual_review_item
-- so PostgREST/route_scored_lead can resolve it without "function is not unique" errors.
select 'ambiguous_queue_manual_review_item' as check_name, proname, count(*) as overload_count
from pg_proc
where pronamespace = 'public'::regnamespace
  and proname = 'queue_manual_review_item'
group by proname
having count(*) <> 1;
