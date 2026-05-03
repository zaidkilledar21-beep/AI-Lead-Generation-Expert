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
        description="Founders configure discovery here. Campaign configuration is the canonical driver of lead discovery, scoring thresholds, and outreach routing."
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
                <th>Countries</th>
                <th>Source</th>
                <th>Leads</th>
                <th>Scored</th>
                <th>Band A/B</th>
                <th>Replies</th>
                <th>Next run</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map((campaign) => (
                <tr key={campaign.id}>
                  <td>
                    <a href={`/campaigns/${campaign.id}`}><strong>{campaign.name}</strong></a>
                    <div className="muted">{campaign.description ?? "No description"}</div>
                  </td>
                  <td><Badge tone={campaign.status === "active" ? "success" : campaign.status === "paused" ? "warning" : "muted"}>{campaign.status}</Badge></td>
                  <td>{campaign.primaryNiche ?? campaign.niche}</td>
                  <td>{campaign.targetCountries.join(", ") || campaign.region}</td>
                  <td>{campaign.leadSource}</td>
                  <td className="mono">{campaign.leads}</td>
                  <td className="mono">{campaign.scored}</td>
                  <td className="mono">{campaign.bandA}/{campaign.bandB}</td>
                  <td className="mono">{campaign.replies}</td>
                  <td className="mono">{campaign.nextRunAt ? new Date(campaign.nextRunAt).toLocaleString() : "--"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
