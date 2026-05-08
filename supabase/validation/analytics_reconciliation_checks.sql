-- Analytics reconciliation checks.
-- Read-only validation for comparing analytics rollups/views against source tables.
-- Default window: the previous 30 complete UTC date boundaries through tomorrow.

with bounds as (
  select
    (current_date - interval '30 days')::date as start_date,
    (current_date + interval '1 day')::date as end_date
),
rollup as (
  select
    coalesce(sum(leads_discovered), 0)::bigint as leads_discovered,
    coalesce(sum(emails_sent), 0)::bigint as emails_sent,
    coalesce(sum(replies), 0)::bigint as replies,
    coalesce(sum(positive_replies), 0)::bigint as positive_replies
  from analytics_daily_rollup adr
  cross join bounds b
  where adr.metric_date >= b.start_date
    and adr.metric_date < b.end_date
),
source_counts as (
  select
    (select count(*) from leads l cross join bounds b where l.created_at >= b.start_date and l.created_at < b.end_date) as leads_discovered,
    (select count(*) from outreach_events oe cross join bounds b where oe.event_type = 'email_sent' and coalesce(oe.sent_at, oe.created_at) >= b.start_date and coalesce(oe.sent_at, oe.created_at) < b.end_date) as emails_sent,
    (select count(*) from reply_events re cross join bounds b where re.reply_received_at >= b.start_date and re.reply_received_at < b.end_date) as replies,
    (select count(*) from email_drafts ed cross join bounds b where ed.created_at >= b.start_date and ed.created_at < b.end_date) as drafts,
    (select count(*) from workflow_events we cross join bounds b where we.created_at >= b.start_date and we.created_at < b.end_date) as workflow_events
)
select
  'leads_discovered' as check_name,
  source_counts.leads_discovered as source_count,
  rollup.leads_discovered as analytics_count,
  source_counts.leads_discovered - rollup.leads_discovered as difference
from source_counts, rollup
union all
select
  'emails_sent' as check_name,
  source_counts.emails_sent as source_count,
  rollup.emails_sent as analytics_count,
  source_counts.emails_sent - rollup.emails_sent as difference
from source_counts, rollup
union all
select
  'replies' as check_name,
  source_counts.replies as source_count,
  rollup.replies as analytics_count,
  source_counts.replies - rollup.replies as difference
from source_counts, rollup
union all
select
  'email_drafts_source_only' as check_name,
  source_counts.drafts as source_count,
  null::bigint as analytics_count,
  null::bigint as difference
from source_counts
union all
select
  'workflow_events_source_only' as check_name,
  source_counts.workflow_events as source_count,
  null::bigint as analytics_count,
  null::bigint as difference
from source_counts;
