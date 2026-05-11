import { PageHeader } from "@/components/crm/page-header";
import { Badge } from "@/components/ui/badge";
import { LinkButton } from "@/components/ui/button";
import { CrmSelect } from "@/components/ui/crm-select";
import { getCampaignRows } from "@/lib/crm/queries";
import { archiveCampaignAction, duplicateCampaignFormAction, triggerCampaignManualRun, updateCampaignStatus } from "./actions";

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
  const status = searchParams?.status ?? "operating";
  const source = searchParams?.source ?? "all";
  const q = (searchParams?.q ?? "").trim().toLowerCase();
  const filtered = campaigns.filter((campaign) => {
    if (status === "operating" && campaign.status === "archived") return false;
    if (status !== "all" && status !== "operating" && campaign.status !== status) return false;
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
          <label className="field-group">
            <span className="field-label">Status</span>
            <CrmSelect
              name="status"
              defaultValue={status}
              options={[
                { value: "operating", label: "Active operating views" },
                { value: "all", label: "All statuses" },
                { value: "draft", label: "Draft" },
                { value: "active", label: "Active" },
                { value: "paused", label: "Paused" },
                { value: "completed", label: "Completed" },
                { value: "archived", label: "Archived" }
              ]}
            />
          </label>
          <label className="field-group">
            <span className="field-label">Source</span>
            <CrmSelect
              name="source"
              defaultValue={source}
              options={[
                { value: "all", label: "All sources" },
                { value: "google_places", label: "Google Places" },
                { value: "manual_import", label: "Manual Import" }
              ]}
            />
          </label>
          <label className="field-group">
            <span className="field-label">Search</span>
            <input className="field" name="q" defaultValue={searchParams?.q ?? ""} placeholder="Name, niche, country, city" />
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
                        <button className="ui-button ui-button-secondary" type="submit" disabled={campaign.status === "archived"}>
                          Trigger manual n8n discovery run
                        </button>
                      </form>
                      {campaign.status !== "archived" ? (
                        <form action={updateCampaignStatus.bind(null, campaign.id, campaign.status === "active" ? "paused" : "active")}>
                          <button className="ui-button ui-button-secondary" type="submit">{campaign.status === "active" ? "Pause" : "Resume"}</button>
                        </form>
                      ) : null}
                      <form action={duplicateCampaignFormAction.bind(null, campaign.id)}>
                        <button className="ui-button ui-button-secondary" type="submit">Duplicate</button>
                      </form>
                      {campaign.status !== "archived" ? (
                        <form action={archiveCampaignAction.bind(null, campaign.id)}>
                          <button className="ui-button ui-button-secondary" type="submit">Archive</button>
                        </form>
                      ) : null}
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
