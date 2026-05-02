import { PageHeader } from "@/components/crm/page-header";
import { MetricCard } from "@/components/ui/metric-card";
import { getCampaignRows, getCrmHomeMetrics, getPipelineRows } from "@/lib/crm/queries";

export default async function AnalyticsPage() {
  const [metrics, campaigns, leads] = await Promise.all([getCrmHomeMetrics(), getCampaignRows(), getPipelineRows(500)]);
  const bandCounts = ["A", "B", "C", "D"].map((band) => ({ band, count: leads.filter((lead) => lead.effectiveBand === band).length }));

  return (
    <>
      <PageHeader title="Analytics" description="Founder-level performance intelligence for campaigns, bands, replies, sequence health, and pipeline quality." />
      <section className="metric-grid">
        {metrics.map((metric) => <MetricCard key={metric.label} label={metric.label} value={metric.value} />)}
      </section>
      <div className="two-column">
        <section className="panel">
          <div className="panel-header"><h2>Campaign performance</h2></div>
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr><th>Campaign</th><th>Status</th><th>Leads</th><th>Replies</th><th>Reply rate</th></tr></thead>
              <tbody>
                {campaigns.map((campaign) => (
                  <tr key={campaign.id}>
                    <td>{campaign.name}</td>
                    <td>{campaign.status}</td>
                    <td className="mono">{campaign.leads}</td>
                    <td className="mono">{campaign.replies}</td>
                    <td className="mono">{campaign.leads ? `${Math.round((campaign.replies / campaign.leads) * 100)}%` : "0%"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
        <aside className="panel">
          <div className="panel-header"><h2>Band distribution</h2></div>
          <div className="panel-body">
            {bandCounts.map((item) => (
              <div key={item.band} className="panel-header">
                <span>Band {item.band}</span>
                <strong className="mono">{item.count}</strong>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </>
  );
}
