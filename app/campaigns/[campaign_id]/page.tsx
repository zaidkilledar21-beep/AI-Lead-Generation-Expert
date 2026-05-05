import { notFound } from "next/navigation";
import { PageHeader } from "@/components/crm/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { triggerCampaignManualRun, updateCampaignStatus } from "../actions";
import { EditCampaignForm } from "../edit-campaign-form";
import { getCampaignDetailData, getSettingsData } from "@/lib/crm/queries";

export default async function CampaignDetailPage({
  params,
  searchParams
}: Readonly<{
  params: { campaign_id: string };
  searchParams?: { tab?: string };
}>) {
  const [detail, settings] = await Promise.all([
    getCampaignDetailData(params.campaign_id),
    getSettingsData()
  ]);
  if (!detail) notFound();
  const tab = searchParams?.tab ?? "overview";

  return (
    <>
      <PageHeader
        title={detail.campaign.name}
        description={`${detail.campaign.primaryNiche ?? detail.campaign.niche} / ${detail.campaign.targetCountries.join(", ") || detail.campaign.region}`}
        actions={
          <div className="button-row">
            <form action={triggerCampaignManualRun.bind(null, detail.campaign.id)}>
              <Button type="submit">Trigger manual run</Button>
            </form>
            <form action={async () => { "use server"; await updateCampaignStatus(detail.campaign.id, detail.campaign.status === "active" ? "paused" : "active"); }}>
              <Button type="submit" variant="secondary">{detail.campaign.status === "active" ? "Pause" : "Resume"}</Button>
            </form>
          </div>
        }
      />

      <section className="metric-grid">
        <div className="metric-card"><div className="metric-label">Status</div><div className="metric-value"><Badge>{detail.campaign.status}</Badge></div></div>
        <div className="metric-card"><div className="metric-label">Leads discovered</div><div className="metric-value">{detail.campaign.leads}</div></div>
        <div className="metric-card"><div className="metric-label">Scored</div><div className="metric-value">{detail.campaign.scored}</div></div>
        <div className="metric-card"><div className="metric-label">Band A / B</div><div className="metric-value">{detail.campaign.bandA} / {detail.campaign.bandB}</div></div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <h2>Tabs</h2>
          <div className="button-row">
            {["overview", "leads", "runs", "edit"].map((key) => (
              <a className={`ui-button ${tab === key ? "ui-button-primary" : "ui-button-secondary"}`} href={`/campaigns/${detail.campaign.id}?tab=${key}`} key={key}>{key}</a>
            ))}
          </div>
        </div>
      </section>

      {tab === "overview" ? (
        <section className="panel">
          <div className="panel-header"><h2>Campaign configuration</h2></div>
          <div className="panel-body detail-grid">
            <div><span className="metric-label">Lead source</span><strong>{detail.campaign.leadSource}</strong></div>
            <div><span className="metric-label">Run frequency</span><strong>{detail.campaign.runFrequency}</strong></div>
            <div><span className="metric-label">Target countries</span><strong>{detail.campaign.targetCountries.join(", ") || "None"}</strong></div>
            <div><span className="metric-label">Target cities</span><strong>{detail.campaign.targetCities.join(", ") || "All cities"}</strong></div>
            <div><span className="metric-label">Exclude cities</span><strong>{detail.campaign.excludeCities.join(", ") || "None"}</strong></div>
            <div><span className="metric-label">Languages</span><strong>{detail.campaign.languageOfBusiness.join(", ") || "Not set"}</strong></div>
            <div><span className="metric-label">Leads per run</span><strong>{detail.campaign.maxLeadsPerRun}</strong></div>
            <div><span className="metric-label">Min rating / reviews</span><strong>{detail.campaign.minGoogleRating} / {detail.campaign.minReviewCount}</strong></div>
            <div><span className="metric-label">Score thresholds</span><strong>A {detail.campaign.minScoreBandA} / B {detail.campaign.minScoreBandB}</strong></div>
            <div><span className="metric-label">Confidence required</span><strong>{detail.campaign.confidenceRequired}</strong></div>
            <div><span className="metric-label">Assigned inbox</span><strong>{detail.campaign.assignedInboxId ?? "Not set"}</strong></div>
            <div><span className="metric-label">Tags</span><strong>{detail.campaign.tags.join(", ") || "None"}</strong></div>
            <div className="detail-span-2"><span className="metric-label">Notes</span><strong>{detail.campaign.notes ?? "No notes"}</strong></div>
          </div>
        </section>
      ) : null}

      {tab === "leads" ? (
        <section className="panel">
          <div className="panel-header"><h2>Campaign leads</h2></div>
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr><th>Lead</th><th>Band</th><th>Status</th><th>Reply</th><th>Owner</th></tr></thead>
              <tbody>
                {detail.leads.map((lead) => (
                  <tr key={lead.id}>
                    <td><a href={`/pipeline/${lead.id}`}>{lead.businessName}</a></td>
                    <td>{lead.effectiveBand ?? "--"}</td>
                    <td>{lead.status}</td>
                    <td>{lead.latestReplyIntent ?? "--"}</td>
                    <td>{lead.assignedTo ?? "--"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {tab === "runs" ? (
        <section className="panel">
          <div className="panel-header"><h2>Run history</h2></div>
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr><th>Started</th><th>Leads found</th><th>Duplicates</th><th>Errors</th><th>Duration</th><th>Triggered by</th><th>Status</th></tr></thead>
              <tbody>
                {detail.runs.map((run) => (
                  <tr key={run.id}>
                    <td className="mono">{run.startedAt ? new Date(run.startedAt).toLocaleString() : "--"}</td>
                    <td className="mono">{run.leadsFound}</td>
                    <td className="mono">{run.duplicatesSkipped}</td>
                    <td className="mono">{run.errors}</td>
                    <td className="mono">{run.durationSeconds ? `${run.durationSeconds}s` : "--"}</td>
                    <td>{run.triggeredBy}</td>
                    <td>{run.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {tab === "edit" ? (
        <section className="panel">
          <div className="panel-header"><h2>Edit campaign</h2></div>
          <div className="panel-body">
            <EditCampaignForm campaign={detail.campaign as any} sequences={settings.sequences as any} inboxes={settings.inboxes as any} />
          </div>
        </section>
      ) : null}
    </>
  );
}
