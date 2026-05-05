import { PageHeader } from "@/components/crm/page-header";
import { Badge } from "@/components/ui/badge";
import { LinkButton } from "@/components/ui/button";
import { getCampaignRows } from "@/lib/crm/queries";
import { duplicateCampaignAction, triggerCampaignManualRun, updateCampaignStatus } from "./actions";

function statusTone(status: string) {
  if (status === "active") return "success" as const;
  if (status === "paused") return "warning" as const;
  return "muted" as const;
}

export default async function CampaignsPage({
  searchParams
}: Readonly<{
  searchParams?: { status?: string; q?: string; source?: string };
}>) {
  const campaigns = await getCampaignRows();
  const status = searchParams?.status ?? "all";
  const source = searchParams?.source ?? "all";
  const q = (searchParams?.q ?? "").trim().toLowerCase();
  const filtered = campaigns.filter((campaign) => {
    if (status !== "all" && campaign.status !== status) return false;
    if (source !== "all" && campaign.leadSource !== source) return false;
    if (!q) return true;
    return [campaign.name, campaign.primaryNiche, campaign.niche, campaign.region, ...campaign.targetCountries, ...campaign.targetCities]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(q);
  });

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
          <span className="muted">{filtered.length} of {campaigns.length} campaigns</span>
        </div>
        <form className="panel-body form-grid">
          <label>
            <span>Status</span>
            <select name="status" defaultValue={status}>
              <option value="all">All statuses</option>
              <option value="draft">Draft</option>
              <option value="active">Active</option>
              <option value="paused">Paused</option>
              <option value="completed">Completed</option>
              <option value="archived">Archived</option>
            </select>
          </label>
          <label>
            <span>Source</span>
            <select name="source" defaultValue={source}>
              <option value="all">All sources</option>
              <option value="google_maps">Google Maps</option>
              <option value="google_search">Google Search</option>
              <option value="directory">Directory</option>
              <option value="manual_import">Manual Import</option>
            </select>
          </label>
          <label>
            <span>Search</span>
            <input name="q" defaultValue={searchParams?.q ?? ""} placeholder="Name, niche, country, city" />
          </label>
          <div className="button-row self-end">
            <button className="ui-button ui-button-secondary" type="submit">Apply</button>
            <a className="ui-button ui-button-secondary" href="/campaigns">Reset</a>
          </div>
        </form>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Status</th>
                <th>Niche</th>
                <th>Countries</th>
                <th>Cities</th>
                <th>Band target</th>
                <th>Source</th>
                <th>Leads</th>
                <th>Scored</th>
                <th>Band A/B</th>
                <th>Replies</th>
                <th>Last run</th>
                <th>Next run</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((campaign) => (
                <tr key={campaign.id}>
                  <td>
                    <a href={`/campaigns/${campaign.id}`}><strong>{campaign.name}</strong></a>
                    <div className="muted">{campaign.description ?? "No description"}</div>
                  </td>
                  <td><Badge tone={statusTone(campaign.status)}>{campaign.status}</Badge></td>
                  <td>{campaign.primaryNiche ?? campaign.niche}</td>
                  <td>{campaign.targetCountries.join(", ") || campaign.region}</td>
                  <td>{campaign.targetCities.join(", ") || "All"}</td>
                  <td className="mono">A {campaign.minScoreBandA} / B {campaign.minScoreBandB}</td>
                  <td>{campaign.leadSource}</td>
                  <td className="mono">{campaign.leads}</td>
                  <td className="mono">{campaign.scored}</td>
                  <td className="mono">{campaign.bandA}/{campaign.bandB}</td>
                  <td className="mono">{campaign.replies}</td>
                  <td className="mono">{campaign.lastRunAt ? new Date(campaign.lastRunAt).toLocaleString() : "--"}</td>
                  <td className="mono">{campaign.nextRunAt ? new Date(campaign.nextRunAt).toLocaleString() : "--"}</td>
                  <td>
                    <div className="button-row">
                      <form action={triggerCampaignManualRun.bind(null, campaign.id)}>
                        <button className="ui-button ui-button-secondary" type="submit">Run</button>
                      </form>
                      <form action={updateCampaignStatus.bind(null, campaign.id, campaign.status === "active" ? "paused" : "active")}>
                        <button className="ui-button ui-button-secondary" type="submit">{campaign.status === "active" ? "Pause" : "Resume"}</button>
                      </form>
                      <form action={duplicateCampaignAction.bind(null, campaign.id)}>
                        <button className="ui-button ui-button-secondary" type="submit">Duplicate</button>
                      </form>
                      <form action={updateCampaignStatus.bind(null, campaign.id, "archived")}>
                        <button className="ui-button ui-button-secondary" type="submit">Archive</button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={14} className="muted text-center">No campaigns match the current filters.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
