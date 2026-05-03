import { PageHeader } from "@/components/crm/page-header";
import { MetricCard } from "@/components/ui/metric-card";
import { getAnalyticsData } from "@/lib/crm/queries";

export default async function AnalyticsPage({
  searchParams
}: {
  searchParams?: { days?: string };
}) {
  const days = Math.max(7, Math.min(90, Number(searchParams?.days ?? "30") || 30));
  const analytics = await getAnalyticsData(days);

  return (
    <>
      <PageHeader
        title="Analytics"
        description="Campaign performance, delivery throughput, reply performance, and sequence funnel health."
        actions={
          <form>
            <select className="field" name="days" defaultValue={String(days)}>
              {[7, 14, 30, 60, 90].map((value) => <option key={value} value={value}>{value} days</option>)}
            </select>
          </form>
        }
      />
      <section className="metric-grid">
        {analytics.metrics.map((metric) => <MetricCard key={metric.label} label={metric.label} value={metric.value} />)}
      </section>

      <section className="panel">
        <div className="panel-header"><h2>Campaign performance</h2></div>
        <div className="table-wrap">
          <table className="data-table">
            <thead><tr><th>Campaign</th><th>Status</th><th>Leads</th><th>Scored</th><th>Band A</th><th>Band B</th><th>Replies</th><th>Positive</th><th>Reply rate</th></tr></thead>
            <tbody>
              {analytics.campaigns.map((campaign: any) => (
                <tr key={campaign.campaign_id}>
                  <td>{campaign.name}</td>
                  <td>{campaign.status}</td>
                  <td className="mono">{campaign.total_leads ?? 0}</td>
                  <td className="mono">{campaign.scored_leads ?? 0}</td>
                  <td className="mono">{campaign.band_a_count ?? 0}</td>
                  <td className="mono">{campaign.band_b_count ?? 0}</td>
                  <td className="mono">{campaign.replies ?? 0}</td>
                  <td className="mono">{campaign.positive_replies ?? 0}</td>
                  <td className="mono">{campaign.reply_rate ?? 0}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="two-column analytics-grid">
        <section className="panel">
          <div className="panel-header"><h2>Daily rollup</h2></div>
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr><th>Date</th><th>Campaign</th><th>Leads</th><th>Scored</th><th>Emails</th><th>Replies</th><th>Positive</th></tr></thead>
              <tbody>
                {analytics.daily.map((row: any, index: number) => (
                  <tr key={`${row.metric_date}-${row.campaign_id ?? "all"}-${index}`}>
                    <td className="mono">{row.metric_date}</td>
                    <td>{row.campaign_name ?? "All campaigns"}</td>
                    <td className="mono">{row.leads_discovered ?? 0}</td>
                    <td className="mono">{row.leads_scored ?? 0}</td>
                    <td className="mono">{row.emails_sent ?? 0}</td>
                    <td className="mono">{row.replies ?? 0}</td>
                    <td className="mono">{row.positive_replies ?? 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
        <aside className="panel">
          <div className="panel-header"><h2>Sequence funnel</h2></div>
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr><th>Sequence</th><th>Step</th><th>Sent</th><th>Replies</th><th>Positive</th><th>Reply rate</th></tr></thead>
              <tbody>
                {analytics.sequenceFunnel.map((step: any) => (
                  <tr key={`${step.sequence_id}-${step.step_number}`}>
                    <td>{step.sequence_name}</td>
                    <td className="mono">{step.step_number}</td>
                    <td className="mono">{step.sent ?? 0}</td>
                    <td className="mono">{step.replies ?? 0}</td>
                    <td className="mono">{step.positive_replies ?? 0}</td>
                    <td className="mono">{step.reply_rate ?? 0}%</td>
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
