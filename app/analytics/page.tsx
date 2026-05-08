import { PageHeader } from "@/components/crm/page-header";
import { MetricCard } from "@/components/ui/metric-card";
import { LinkButton } from "@/components/ui/button";
import { AnalyticsDiagnosticsPanel } from "@/components/crm/analytics-diagnostics-panel";
import { getAnalyticsData, getAnalyticsDiagnostics, type AnalyticsExportKind } from "@/lib/crm/queries";
import { AnalyticsFilters } from "@/components/crm/analytics-filters";
import { CountryPerformanceBar, DailyRollupChart, SequenceFunnelChart, ReplyBreakdownDonut, NichePerformanceBar } from "@/components/crm/analytics-charts";

const EXPORTS: Array<{ kind: AnalyticsExportKind; label: string }> = [
  { kind: "campaign-performance", label: "Campaign CSV" },
  { kind: "daily-rollup", label: "Daily CSV" },
  { kind: "sequence-funnel", label: "Sequence CSV" },
  { kind: "reply-intent-breakdown", label: "Replies CSV" }
];

function analyticsExportHref(kind: AnalyticsExportKind, days: number, from?: string, to?: string) {
  const params = new URLSearchParams({ kind, days: days > 90 ? "all" : String(days) });
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  return `/analytics/export?${params.toString()}`;
}

export default async function AnalyticsPage({
  searchParams
}: Readonly<{
  searchParams?: { days?: string; from?: string; to?: string };
}>) {
  const days = searchParams?.days === "all" ? 3650 : Math.max(7, Math.min(90, Number(searchParams?.days ?? "30") || 30));
  const from = searchParams?.from;
  const to = searchParams?.to;

  const [analytics, diagnostics] = await Promise.all([
    getAnalyticsData(days, from, to),
    getAnalyticsDiagnostics(days, from, to)
  ]);
  const { comparison } = analytics;

  return (
    <>
      <PageHeader
        title="Analytics"
        description="Campaign performance, delivery throughput, reply performance, and sequence funnel health."
        actions={
          <div className="flex flex-col items-end gap-3">
            <AnalyticsFilters from={from} to={to} days={days} />
            <div className="flex flex-wrap justify-end gap-2">
              {EXPORTS.map((item) => (
                <LinkButton key={item.kind} href={analyticsExportHref(item.kind, days, from, to)} variant="secondary">
                  {item.label}
                </LinkButton>
              ))}
            </div>
          </div>
        }
      />

      <section className="glass-panel p-4 text-sm text-white/60">
        <span className="font-semibold text-white/85">Selected range:</span> {analytics.dateRange.label}
        <span className="mx-2 text-white/20">|</span>
        <span className="font-semibold text-white/85">Timezone assumption:</span> {analytics.dateRange.timezoneLabel}
      </section>

      <section className="metric-grid">
        {analytics.metrics.map((metric) => <MetricCard key={metric.label} label={metric.label} value={metric.value} />)}
      </section>

      <AnalyticsDiagnosticsPanel diagnostics={diagnostics} />

      {comparison && (
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
          <div className="glass-panel p-6 flex flex-col gap-1 border-t border-t-purple-500/20">
            <div className="text-xs font-bold text-white/40 uppercase tracking-widest">Outreach Volume</div>
            <div className="flex items-baseline gap-3">
              <span className="text-3xl font-bold text-white/90">{comparison.emails.current.toLocaleString()}</span>
              <span className={`text-sm font-bold ${comparison.emails.change >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                {comparison.emails.change >= 0 ? "+" : ""}{comparison.emails.change.toFixed(1)}%
              </span>
            </div>
            <div className="text-[10px] text-white/20">vs {comparison.emails.prev.toLocaleString()} last period</div>
          </div>
          
          <div className="glass-panel p-6 flex flex-col gap-1 border-t border-t-emerald-500/20">
            <div className="text-xs font-bold text-white/40 uppercase tracking-widest">Total Replies</div>
            <div className="flex items-baseline gap-3">
              <span className="text-3xl font-bold text-white/90">{comparison.replies.current.toLocaleString()}</span>
              <span className={`text-sm font-bold ${comparison.replies.change >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                {comparison.replies.change >= 0 ? "+" : ""}{comparison.replies.change.toFixed(1)}%
              </span>
            </div>
            <div className="text-[10px] text-white/20">vs {comparison.replies.prev.toLocaleString()} last period</div>
          </div>
          
          <div className="glass-panel p-6 flex flex-col gap-1 border-t border-t-amber-500/20">
            <div className="text-xs font-bold text-white/40 uppercase tracking-widest">Positive Interest</div>
            <div className="flex items-baseline gap-3">
              <span className="text-3xl font-bold text-white/90">{comparison.positive.current.toLocaleString()}</span>
              <span className={`text-sm font-bold ${comparison.positive.change >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                {comparison.positive.change >= 0 ? "+" : ""}{comparison.positive.change.toFixed(1)}%
              </span>
            </div>
            <div className="text-[10px] text-white/20">vs {comparison.positive.prev.toLocaleString()} last period</div>
          </div>
        </section>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <section className="panel glass-panel">
          <div className="panel-header"><h2>Reply Intent Breakdown</h2></div>
          <ReplyBreakdownDonut data={analytics.replyIntentBreakdown} />
        </section>
        <section className="panel glass-panel">
          <div className="panel-header"><h2>Performance by Niche</h2></div>
          <NichePerformanceBar data={analytics.performanceByNiche} />
        </section>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <section className="panel glass-panel">
          <div className="panel-header"><h2>Performance by Country</h2></div>
          <CountryPerformanceBar data={analytics.performanceByCountry} />
        </section>
        <section className="panel glass-panel">
          <div className="panel-header"><h2>Weekly snapshot</h2></div>
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr><th>Week</th><th>Leads</th><th>Emails</th><th>Replies</th><th>Positive</th></tr></thead>
              <tbody>
                {analytics.weeklySnapshot.map((week) => (
                  <tr key={week.week}>
                    <td className="mono">{week.week}</td>
                    <td className="mono">{week.leads}</td>
                    <td className="mono">{week.emails}</td>
                    <td className="mono">{week.replies}</td>
                    <td className="mono">{week.positive}</td>
                  </tr>
                ))}
                {analytics.weeklySnapshot.length === 0 ? (
                  <tr><td colSpan={5} className="muted text-center">No emails were sent in this date range.</td></tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <section className="panel glass-panel mt-6">
        <div className="panel-header"><h2>Campaign performance</h2></div>
        <div className="table-wrap">
          <table className="data-table">
            <thead><tr><th>Campaign</th><th>Niche</th><th>Status</th><th>Leads</th><th>Scored</th><th>Replies</th><th>Positive</th><th>Reply rate</th></tr></thead>
            <tbody>
              {analytics.campaigns.map((campaign) => (
                <tr key={campaign.campaign_id}>
                  <td>{campaign.name}</td>
                  <td className="text-[10px] font-medium uppercase tracking-wider text-white/40">{campaign.primary_niche ?? "N/A"}</td>
                  <td>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest ${
                      campaign.status === 'active' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-white/5 text-white/40'
                    }`}>
                      {campaign.status}
                    </span>
                  </td>
                  <td className="mono">{campaign.total_leads ?? 0}</td>
                  <td className="mono">{campaign.scored_leads ?? 0}</td>
                  <td className="mono">{campaign.replies ?? 0}</td>
                  <td className="mono">{campaign.positive_replies ?? 0}</td>
                  <td className="mono font-bold text-emerald-400">{campaign.reply_rate ?? 0}%</td>
                </tr>
              ))}
              {analytics.campaigns.length === 0 ? (
                <tr><td colSpan={8} className="muted text-center">No active campaigns have lead activity in this range.</td></tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <div className="two-column analytics-grid mt-6">
        <section className="panel glass-panel">
          <div className="panel-header"><h2>Daily rollup</h2></div>
          <DailyRollupChart data={analytics.daily} />
          <div className="table-wrap mt-6 max-h-[400px] overflow-y-auto">
            <table className="data-table">
              <thead><tr><th>Date</th><th>Campaign</th><th>Leads</th><th>Emails</th><th>Replies</th><th>Positive</th></tr></thead>
              <tbody>
                {analytics.daily.map((row, index) => (
                  <tr key={`${row.metric_date}-${row.campaign_id ?? "all"}-${index}`}>
                    <td className="mono">{row.metric_date}</td>
                    <td className="text-xs">{row.campaign_name ?? "All campaigns"}</td>
                    <td className="mono text-xs">{row.leads_discovered ?? 0}</td>
                    <td className="mono text-xs font-bold text-purple-400">{row.emails_sent ?? 0}</td>
                    <td className="mono text-xs">{row.replies ?? 0}</td>
                    <td className="mono text-xs text-emerald-400">{row.positive_replies ?? 0}</td>
                  </tr>
                ))}
                {analytics.daily.length === 0 ? (
                  <tr><td colSpan={6} className="muted text-center">No emails were sent in this date range.</td></tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>
        <aside className="panel glass-panel">
          <div className="panel-header"><h2>Sequence funnel</h2></div>
          <SequenceFunnelChart data={analytics.sequenceFunnel} />
          <div className="table-wrap mt-6 max-h-[400px] overflow-y-auto">
            <table className="data-table">
              <thead><tr><th>Sequence</th><th>Step</th><th>Sent</th><th>Replies</th><th>Positive</th><th>Reply rate</th></tr></thead>
              <tbody>
                {analytics.sequenceFunnel.map((step) => (
                  <tr key={`${step.sequence_id}-${step.step_number}`}>
                    <td className="text-xs">{step.sequence_name}</td>
                    <td className="mono text-xs">{step.step_number}</td>
                    <td className="mono text-xs">{step.sent ?? 0}</td>
                    <td className="mono text-xs">{step.replies ?? 0}</td>
                    <td className="mono text-xs">{step.positive_replies ?? 0}</td>
                    <td className="mono text-xs font-bold text-emerald-400">{step.reply_rate ?? 0}%</td>
                  </tr>
                ))}
                {analytics.sequenceFunnel.length === 0 ? (
                  <tr><td colSpan={6} className="muted text-center">No sequence funnel events are available yet.</td></tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </aside>
      </div>
    </>
  );
}
