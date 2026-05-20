import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { MetricCard } from "@/components/ui/metric-card";
import { getCampaignRunDetailData } from "@/lib/crm/queries";

type RunDetailParams = Promise<{ campaign_id: string; run_id: string }>;
type CampaignRunDetail = NonNullable<Awaited<ReturnType<typeof getCampaignRunDetailData>>>;
type RunLead = CampaignRunDetail["leads"][number];
type RunEvent = CampaignRunDetail["events"][number];

function formatDateTime(value: string | null) {
  return value ? new Date(value).toLocaleString() : "--";
}

function formatStatus(value: string | null | undefined) {
  return value ? value.replaceAll("_", " ") : "--";
}

function statusTone(status: string, isStale = false) {
  const normalized = status.toLowerCase();
  if (isStale || normalized.includes("failed") || normalized.includes("stuck")) return "danger" as const;
  if (normalized.includes("completed")) return "success" as const;
  if (normalized.includes("running") || normalized.includes("quota") || normalized.includes("paused")) return "warning" as const;
  return "muted" as const;
}

function eventTone(status: string) {
  if (status === "failed") return "danger" as const;
  if (status === "blocked") return "warning" as const;
  if (status === "completed") return "success" as const;
  return "muted" as const;
}

function operatorTone(value: string) {
  if (value === "Needs review" || value === "Blocked" || value === "Missing contact") return "warning" as const;
  if (value === "Draft ready" || value === "Queued" || value === "In sequence") return "success" as const;
  if (value === "Replied" || value === "Closed") return "info" as const;
  return "muted" as const;
}

function runWarningItems(detail: CampaignRunDetail) {
  return [
    detail.run.duplicatesSkipped > 0 ? `${detail.run.duplicatesSkipped} duplicates skipped.` : null,
    detail.run.rejected > 0 ? `${detail.run.rejected} candidates rejected.` : null,
    detail.run.crawlFailures > 0 ? `${detail.run.crawlFailures} crawl failure${detail.run.crawlFailures === 1 ? "" : "s"}.` : null,
    detail.run.userStatus.toLowerCase().includes("quota") ? `Quota reached after ${detail.run.candidatesChecked} checked candidates.` : null,
    detail.run.errorMessage ? detail.run.errorMessage : null,
    ...detail.supportWarnings
  ].filter(Boolean) as string[];
}

function RunSummary({ detail }: { detail: CampaignRunDetail }) {
  const { run } = detail;

  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <h2>Run summary</h2>
          <p>Discovery outcome, quota interpretation, and lead creation counters.</p>
        </div>
        <Badge tone={statusTone(run.userStatus, run.isStale)}>{run.userStatus}</Badge>
      </div>
      <div className="panel-body grid gap-4">
        <div className="campaign-detail-metric-grid">
          <MetricCard label="Candidates checked" value={run.candidatesChecked} />
          <MetricCard label="Leads created" value={run.promoted} />
          <MetricCard label="Duplicates skipped" value={run.duplicatesSkipped} />
          <MetricCard label="Manual review" value={run.manualReview} />
        </div>
        <div className="campaign-detail-metric-grid">
          <MetricCard label="Places calls" value={run.totalPlacesCalls} />
          <MetricCard label="Rejected" value={run.rejected} />
          <MetricCard label="Crawl failures" value={run.crawlFailures} />
          <MetricCard label="Duration" value={run.durationSeconds ? `${run.durationSeconds}s` : "--"} />
        </div>
        <div className="grid gap-2 text-sm sm:grid-cols-3">
          <span className="muted">Started: <strong>{formatDateTime(run.startedAt)}</strong></span>
          <span className="muted">Completed: <strong>{formatDateTime(run.completedAt)}</strong></span>
          <span className="muted">Run ID: <strong className="mono">{run.id}</strong></span>
        </div>
      </div>
    </section>
  );
}

function RunWarnings({ detail }: { detail: CampaignRunDetail }) {
  const warnings = runWarningItems(detail);
  if (warnings.length === 0) return null;

  return (
    <section className="crm-state-card">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold">Warnings and errors</h3>
        <Badge tone={detail.run.errorMessage ? "danger" : "warning"}>{warnings.length}</Badge>
      </div>
      <div className="mt-3 grid gap-2">
        {warnings.map((warning) => (
          <p className="muted text-sm" key={warning}>{warning}</p>
        ))}
      </div>
    </section>
  );
}

function RunTimeline({ events }: { events: RunEvent[] }) {
  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <h2>Run timeline</h2>
          <p>Stage-by-stage workflow events for this discovery run.</p>
        </div>
        <Badge tone="info">{events.length}</Badge>
      </div>
      <div className="panel-body">
        {events.length > 0 ? (
          <div className="grid gap-3">
            {events.map((event) => (
              <section className="crm-state-card" key={event.id}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <strong className="text-sm">{event.label}</strong>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone={eventTone(event.status)}>{event.status}</Badge>
                    <span className="muted text-xs">{formatDateTime(event.createdAt)}</span>
                  </div>
                </div>
                {event.errorMessage ? <p className="mt-2 text-sm text-red-300">{event.errorMessage}</p> : null}
                {event.summary ? <p className="muted mt-2 text-sm leading-6">{event.summary}</p> : null}
              </section>
            ))}
          </div>
        ) : (
          <EmptyState title="No timeline events" description="No workflow events were recorded for this run." />
        )}
      </div>
    </section>
  );
}

function RunLeadsTable({ leads }: { leads: RunLead[] }) {
  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <h2>Run leads</h2>
          <p>Leads created by this run with score, routing, review, queue, and draft outcomes.</p>
        </div>
        <Badge tone="info">{leads.length}</Badge>
      </div>
      <div className="panel-body">
        {leads.length > 0 ? (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Business</th>
                  <th>Contact</th>
                  <th>Score</th>
                  <th>Band</th>
                  <th>Confidence</th>
                  <th>Operator state</th>
                  <th>Review</th>
                  <th>Queue / draft</th>
                  <th>Why / next action</th>
                  <th>Open</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((lead) => (
                  <tr key={lead.id}>
                    <td>
                      <div className="grid gap-1">
                        <a href={`/pipeline/${lead.id}`}>{lead.businessName}</a>
                        <span className="muted text-xs">{formatStatus(lead.status)}</span>
                      </div>
                    </td>
                    <td>
                      <div className="grid gap-1 text-xs">
                        <span>{lead.email ?? "No email"}</span>
                        <span className="muted">{lead.phone ?? "No phone"}</span>
                        {lead.website ? <a href={lead.website} target="_blank" rel="noreferrer">Website</a> : <span className="muted">No website</span>}
                      </div>
                    </td>
                    <td className="mono">{lead.score ?? "--"}</td>
                    <td>{lead.effectiveBand ?? lead.band ?? "--"}</td>
                    <td>{lead.confidence ?? "--"}</td>
                    <td>
                      <div className="grid gap-1">
                        <Badge tone={operatorTone(lead.operatorState)}>{lead.operatorState}</Badge>
                        <span className="muted text-xs">{lead.operatorReason}</span>
                      </div>
                    </td>
                    <td>
                      <div className="grid gap-1 text-xs">
                        <span>{formatStatus(lead.manualReviewStatus)}</span>
                        <span className="muted">{formatStatus(lead.manualReviewReason)}</span>
                      </div>
                    </td>
                    <td>
                      <div className="grid gap-1 text-xs">
                        <span>Queue: {formatStatus(lead.queueStatus)}</span>
                        <span>Draft: {formatStatus(lead.draftStatus)}</span>
                        {lead.nextSendAt ? <span className="muted">Next {formatDateTime(lead.nextSendAt)}</span> : null}
                      </div>
                    </td>
                    <td>
                      <p className="muted max-w-[320px] text-xs leading-5">{lead.why ?? lead.latestAction ?? "--"}</p>
                    </td>
                    <td>
                      <a href={`/pipeline/${lead.id}`}>Open</a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState title="No leads created in this run" description="This run did not produce any campaign leads." />
        )}
      </div>
    </section>
  );
}

export default async function CampaignRunDetailPage({
  params
}: Readonly<{
  params: RunDetailParams;
}>) {
  const { campaign_id: campaignId, run_id: runId } = await params;
  if (!campaignId || !runId) notFound();

  const detail = await getCampaignRunDetailData(campaignId, runId);
  if (!detail) notFound();

  return (
    <div className="grid gap-5">
      <section className="panel campaign-detail-hero-shell">
        <div className="campaign-detail-hero-copy">
          <span className="crm-shell-eyebrow">Run detail</span>
          <div className="grid gap-3">
            <h1>{detail.campaign.name}</h1>
            <p>
              Inspect one discovery run, its workflow timeline, created leads, and routing outcomes.
            </p>
          </div>
          <div className="pipeline-chip-row">
            <Badge tone={statusTone(detail.run.userStatus, detail.run.isStale)}>{detail.run.userStatus}</Badge>
            <span className="pipeline-chip">Run <strong className="mono">{detail.run.id.slice(0, 8)}</strong></span>
            <span className="pipeline-chip">Campaign <strong>{formatStatus(detail.campaign.status)}</strong></span>
            <a className="pipeline-chip" href={`/campaigns/${detail.campaign.id}?tab=runs`}>Back to campaign</a>
          </div>
        </div>
      </section>

      <RunSummary detail={detail} />
      <RunWarnings detail={detail} />
      <RunTimeline events={detail.events} />
      <RunLeadsTable leads={detail.leads} />
    </div>
  );
}
