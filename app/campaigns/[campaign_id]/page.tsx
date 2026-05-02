import { notFound } from "next/navigation";
import { PageHeader } from "@/components/crm/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getCampaignRows, getPipelineRows } from "@/lib/crm/queries";
import { updateCampaignStatus } from "../actions";

export default async function CampaignDetailPage({ params }: { params: { campaign_id: string } }) {
  const [campaigns, leads] = await Promise.all([getCampaignRows(), getPipelineRows(250)]);
  const campaign = campaigns.find((item) => item.id === params.campaign_id);
  if (!campaign) notFound();
  const campaignLeads = leads.filter((lead) => lead.campaignName === campaign.name);

  return (
    <>
      <PageHeader
        title={campaign.name}
        description={`${campaign.primaryNiche ?? campaign.niche} / ${campaign.targetCountries.join(", ") || campaign.region}`}
        actions={
          <div className="button-row">
            <form action={async () => { "use server"; await updateCampaignStatus(campaign.id, "active"); }}>
              <Button type="submit">Resume</Button>
            </form>
            <form action={async () => { "use server"; await updateCampaignStatus(campaign.id, "paused"); }}>
              <Button type="submit" variant="secondary">Pause</Button>
            </form>
          </div>
        }
      />
      <section className="metric-grid">
        <div className="metric-card"><div className="metric-label">Status</div><div className="metric-value"><Badge>{campaign.status}</Badge></div></div>
        <div className="metric-card"><div className="metric-label">Leads</div><div className="metric-value">{campaign.leads}</div></div>
        <div className="metric-card"><div className="metric-label">Replies</div><div className="metric-value">{campaign.replies}</div></div>
        <div className="metric-card"><div className="metric-label">Frequency</div><div className="metric-value">{campaign.runFrequency ?? "daily"}</div></div>
      </section>
      <section className="panel">
        <div className="panel-header"><h2>Campaign leads</h2></div>
        <div className="table-wrap">
          <table className="data-table">
            <thead><tr><th>Lead</th><th>Band</th><th>Status</th><th>Reply</th><th>Owner</th></tr></thead>
            <tbody>
              {campaignLeads.map((lead) => (
                <tr key={lead.id}>
                  <td><a href={`/pipeline/${lead.id}`}>{lead.businessName}</a></td>
                  <td>{lead.effectiveBand ?? "--"}</td>
                  <td>{lead.status}</td>
                  <td>{lead.replyIntent ?? "--"}</td>
                  <td>{lead.assignedTo ?? "--"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
