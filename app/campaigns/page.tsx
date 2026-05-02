import { PageHeader } from "@/components/crm/page-header";
import { Badge } from "@/components/ui/badge";
import { LinkButton } from "@/components/ui/button";
import { getCampaignRows } from "@/lib/crm/queries";

export default async function CampaignsPage() {
  const campaigns = await getCampaignRows();

  return (
    <>
      <PageHeader
        title="Campaigns"
        description="Control lead discovery, qualification criteria, run cadence, and campaign-level performance."
        actions={<LinkButton href="/campaigns/new">New campaign</LinkButton>}
      />
      <section className="panel">
        <div className="panel-header">
          <h2>Campaign manager</h2>
          <span className="muted">{campaigns.length} campaigns</span>
        </div>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Status</th>
                <th>Niche</th>
                <th>Region</th>
                <th>Leads</th>
                <th>Replies</th>
                <th>Frequency</th>
                <th>Last run</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map((campaign) => (
                <tr key={campaign.id}>
                  <td><a href={`/campaigns/${campaign.id}`}><strong>{campaign.name}</strong></a></td>
                  <td><Badge tone={campaign.status === "active" ? "success" : campaign.status === "paused" ? "warning" : "muted"}>{campaign.status}</Badge></td>
                  <td>{campaign.primaryNiche ?? campaign.niche}</td>
                  <td>{campaign.targetCountries.join(", ") || campaign.region}</td>
                  <td className="mono">{campaign.leads}</td>
                  <td className="mono">{campaign.replies}</td>
                  <td>{campaign.runFrequency ?? "daily"}</td>
                  <td className="mono">{campaign.lastRunAt ? new Date(campaign.lastRunAt).toLocaleDateString() : "--"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
