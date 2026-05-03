-- Supabase flagged these CRM views as SECURITY DEFINER. They should evaluate
-- with the querying user's permissions so RLS remains in effect.

alter view if exists public.campaign_run_log set (security_invoker = true);
alter view if exists public.inbox_reply_view set (security_invoker = true);
alter view if exists public.campaign_analytics set (security_invoker = true);
alter view if exists public.pipeline_view set (security_invoker = true);
alter view if exists public.analytics_daily_rollup set (security_invoker = true);
alter view if exists public.sequence_step_funnel set (security_invoker = true);
