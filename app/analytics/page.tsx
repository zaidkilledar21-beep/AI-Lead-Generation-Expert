import { PageHeader } from "@/components/crm/page-header";
import { MetricCard } from "@/components/ui/metric-card";
import { getAnalyticsData } from "@/lib/crm/queries";
import { DailyRollupChart, SequenceFunnelChart, ReplyBreakdownDonut, NichePerformanceBar } from "@/components/crm/analytics-charts";

export default async function AnalyticsPage({
  searchParams
}: Readonly<{
  searchParams?: { days?: string; from?: string; to?: string };
}>) {
  const days = Math.max(7, Math.min(90, Number(searchParams?.days ?? "30") || 30));
  const from = searchParams?.from;
  const to = searchParams?.to;

  const analytics = await getAnalyticsData(days, from, to);
  const { comparison } = analytics;

  return (
    <>
      <PageHeader
        title="Analytics"
        description="Campaign performance, delivery throughput, reply performance, and sequence funnel health."
        actions={
          <form className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Custom Range</span>
              <input 
                type="date" 
                name="from" 
                defaultValue={from} 
                className="field text-xs py-1 px-2 h-8 w-32"
                onChange={(e) => e.target.form?.submit()}
              />
              <span className="text-white/20">to</span>
              <input 
                type="date" 
                name="to" 
                defaultValue={to} 
                className="field text-xs py-1 px-2 h-8 w-32"
                onChange={(e) => e.target.form?.submit()}
              />
            </div>
            <div className="w-[1px] h-4 bg-white/10" />
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Presets</span>
              <select 
                className="field text-xs py-1 px-2 h-8" 
                name="days" 
                defaultValue={String(days)} 
                onChange={(e) => {
                  // Clear custom dates if preset is selected
                  const form = e.target.form;
                  if (form) {
                    const fromInput = form.querySelector('input[name="from"]') as HTMLInputElement;
                    const toInput = form.querySelector('input[name="to"]') as HTMLInputElement;
                    if (fromInput) fromInput.value = "";
                    if (toInput) toInput.value = "";
                    form.submit();
                  }
                }}
              >
                {[7, 14, 30, 60, 90].map((value) => <option key={value} value={value}>{value} days</option>)}
              </select>
            </div>
          </form>
        }
      />

      <section className="metric-grid">
        {analytics.metrics.map((metric) => <MetricCard key={metric.label} label={metric.label} value={metric.value} />)}
      </section>

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
              </tbody>
            </table>
          </div>
        </aside>
      </div>
    </>
  );
}

