import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { MetricCard } from "@/components/ui/metric-card";
import { EditCampaignForm } from "../edit-campaign-form";
import { CampaignDetailControls } from "./campaign-detail-controls";
import { SettingsDiagnosticsCard } from "@/components/crm/settings-diagnostics-card";
import { getCampaignDetailData, getSettingsData } from "@/lib/crm/queries";

function readinessTone(status: string) {
  if (status === "Ready") return "success" as const;
  if (status === "Blocked") return "danger" as const;
  return "warning" as const;
}

function statusTone(status: string) {
  if (status === "active") return "success" as const;
  if (status === "paused") return "warning" as const;
  if (status === "draft") return "muted" as const;
  return "info" as const;
}

function runStatusTone(status: string, isStale: boolean) {
  const normalized = status.toLowerCase();
  if (isStale || normalized.includes("failed") || normalized.includes("stuck")) return "danger" as const;
  if (normalized.includes("completed")) return "success" as const;
  if (normalized.includes("running") || normalized.includes("quota") || normalized.includes("paused")) return "warning" as const;
  return "muted" as const;
}

function runStatusLabel(status: string, isStale: boolean) {
  if (isStale) return "stale running";
  return status.replaceAll("_", " ");
}

function frequencyLabel(value: string) {
  if (value === "every_3_days") return "Every 3 days";
  return value.charAt(0).toUpperCase() + value.slice(1).replaceAll("_", " ");
}

function sourceLabel(value: string) {
  if (value === "google_places") return "Google Places";
  if (value === "manual_import") return "Manual import";
  return value.replaceAll("_", " ");
}

function formatDateTime(value: string | null) {
  return value ? new Date(value).toLocaleString() : "--";
}

function displayValue(value: string | number | null | undefined, fallback = "None") {
  if (value == null || value === "") return fallback;
  return String(value);
}

function formatStatus(value: string | null | undefined) {
  return value ? value.replaceAll("_", " ") : "--";
}

function groupItems(value: string[]) {
  return value.length > 0 ? value.join(", ") : "None";
}

function operatorTone(value: string) {
  if (value === "Needs review" || value === "Blocked" || value === "Missing contact") return "warning" as const;
  if (value === "Draft ready" || value === "Queued" || value === "In sequence") return "success" as const;
  if (value === "Replied" || value === "Closed") return "info" as const;
  return "muted" as const;
}

type CampaignDetailSearchParams = { tab?: string | string[] };
type CampaignDetail = NonNullable<Awaited<ReturnType<typeof getCampaignDetailData>>>;
type SettingsData = Awaited<ReturnType<typeof getSettingsData>>;

const CAMPAIGN_DETAIL_TABS = [
  { key: "overview", label: "Overview" },
  { key: "leads", label: "Leads" },
  { key: "runs", label: "Run history" },
  { key: "edit", label: "Edit" }
] as const;

function normalizeTab(tab: CampaignDetailSearchParams["tab"]) {
  if (Array.isArray(tab)) return tab[0] ?? "overview";
  return tab ?? "overview";
}

async function resolveCampaignDetailParams(
  params: Promise<{ campaign_id: string }>,
  searchParams?: Promise<CampaignDetailSearchParams>
) {
  const searchParamsPromise: Promise<CampaignDetailSearchParams> =
    searchParams ?? Promise.resolve({});
  const [{ campaign_id: campaignId }, resolvedSearchParams] = await Promise.all([
    params,
    searchParamsPromise
  ]);

  return {
    campaignId,
    tab: normalizeTab(resolvedSearchParams.tab)
  };
}

function buildOverviewGroups(detail: CampaignDetail, settings: SettingsData) {
  const sequences = settings.sequences as unknown as Array<{ id: string; name?: string | null }>;
  const inboxes = settings.inboxes as unknown as Array<{ id: string; email_address?: string | null }>;
  const inboxLabelMap = new Map(inboxes.map((inbox) => [inbox.id, inbox.email_address ?? inbox.id]));
  const sequenceLabelMap = new Map(
    sequences.map((sequence) => [sequence.id, sequence.name ?? `Sequence ${sequence.id.slice(0, 8)}`])
  );

  return [
    {
      title: "Identity",
      description: "Core campaign identity, launch state, and ownership.",
      items: [
        { label: "Status", value: <Badge tone={statusTone(detail.campaign.status)}>{detail.campaign.status}</Badge> },
        { label: "Lead source", value: sourceLabel(detail.campaign.leadSource) },
        { label: "Primary niche", value: displayValue(detail.campaign.primaryNiche ?? detail.campaign.niche, "Not set") },
        { label: "Assigned inbox", value: displayValue(inboxLabelMap.get(detail.campaign.assignedInboxId ?? "") ?? null, "Not set") }
      ]
    },
    {
      title: "Targeting",
      description: "Where discovery should look and what to exclude.",
      items: [
        { label: "Target countries", value: groupItems(detail.campaign.targetCountries) },
        { label: "Target cities", value: groupItems(detail.campaign.targetCities) },
        { label: "Exclude cities", value: groupItems(detail.campaign.excludeCities) },
        { label: "Business languages", value: groupItems(detail.campaign.languageOfBusiness) }
      ]
    },
    {
      title: "Scoring",
      description: "The thresholds that shape qualification and routing.",
      items: [
        { label: "Band A / B", value: `A ${detail.campaign.minScoreBandA} / B ${detail.campaign.minScoreBandB}` },
        { label: "Confidence required", value: displayValue(detail.campaign.confidenceRequired, "Not set") },
        { label: "Min Google rating", value: detail.campaign.minGoogleRating },
        { label: "Min review count", value: detail.campaign.minReviewCount }
      ]
    },
    {
      title: "Automation",
      description: "Cadence, quotas, and operational limits.",
      items: [
        { label: "Run frequency", value: frequencyLabel(detail.campaign.runFrequency) },
        { label: "Next run", value: formatDateTime(detail.campaign.nextRunAt) },
        { label: "Leads per run", value: detail.campaign.maxLeadsPerRun },
        { label: "Candidates per day", value: detail.campaign.maxCandidatesPerDay }
      ]
    },
    {
      title: "Routing & notes",
      description: "Sequence mapping and internal context.",
      items: [
        { label: "Band A sequence", value: displayValue(sequenceLabelMap.get(detail.campaign.sequenceBandA ?? "") ?? null, "Default routing") },
        { label: "Band B sequence", value: displayValue(sequenceLabelMap.get(detail.campaign.sequenceBandB ?? "") ?? null, "Default routing") },
        { label: "Band C sequence", value: displayValue(sequenceLabelMap.get(detail.campaign.sequenceBandC ?? "") ?? null, "Default routing") },
        { label: "Notes", value: displayValue(detail.campaign.notes, "No notes") }
      ]
    }
  ];
}

function buildReadinessGroups(detail: CampaignDetail) {
  return [
    { title: "Blocking issues", items: detail.readiness.blockers, tone: "danger" as const },
    { title: "Warnings", items: detail.readiness.warnings, tone: "warning" as const },
    { title: "Info", items: detail.readiness.info, tone: "info" as const }
  ];
}

function getSendingLabel(detail: CampaignDetail) {
  if (detail.globalOutreachPaused) return "Paused globally";
  if (detail.campaign.status === "paused") return "Campaign paused";
  if (!detail.campaign.assignedInboxId) return "Blocked: no inbox";
  return "Enabled";
}

function getMissingSequences(detail: CampaignDetail) {
  return [
    detail.campaign.sequenceBandA ? null : "Band A sequence is not set.",
    detail.campaign.sequenceBandB ? null : "Band B sequence is not set.",
    detail.campaign.sequenceBandC ? null : "Band C sequence is not set."
  ].filter(Boolean);
}

function CampaignDetailHero({ detail }: { detail: CampaignDetail }) {
  return (
    <section className="panel campaign-detail-hero-shell">
      <div className="campaign-detail-hero-copy">
        <span className="crm-shell-eyebrow">Campaign detail</span>
        <div className="grid gap-3">
          <h1>{detail.campaign.name}</h1>
          <p>
            {detail.campaign.description ??
              `${detail.campaign.primaryNiche ?? detail.campaign.niche} / ${detail.campaign.targetCountries.join(", ") || detail.campaign.region}`}
          </p>
        </div>
        <div className="pipeline-chip-row">
          <Badge tone={statusTone(detail.campaign.status)}>{detail.campaign.status}</Badge>
          <Badge tone={readinessTone(detail.readiness.status)}>{detail.readiness.status}</Badge>
          <span className="pipeline-chip">
            <strong>{sourceLabel(detail.campaign.leadSource)}</strong>
          </span>
          <span className="pipeline-chip">{frequencyLabel(detail.campaign.runFrequency)}</span>
          <span className="pipeline-chip">
            Next run <strong>{formatDateTime(detail.campaign.nextRunAt)}</strong>
          </span>
        </div>
        <div className="pipeline-chip-row">
          <span className="pipeline-chip">
            <strong>{groupItems(detail.campaign.targetCountries)}</strong>
          </span>
          <span className="pipeline-chip">{groupItems(detail.campaign.targetCities)}</span>
          <span className="pipeline-chip">
            Band target <strong>A {detail.campaign.minScoreBandA}</strong> / <strong>B {detail.campaign.minScoreBandB}</strong>
          </span>
          <span className="pipeline-chip">
            Inbox <strong>{displayValue(detail.campaign.assignedInboxId, "Unassigned")}</strong>
          </span>
        </div>
      </div>

      <div className="campaign-detail-hero-aside">
        <div className="campaign-detail-metric-grid">
          <MetricCard label="Leads" value={detail.campaign.leads} />
          <MetricCard label="Scored" value={detail.campaign.scored} />
          <MetricCard label="Replies" value={detail.campaign.replies} />
          <MetricCard label="Band A / B" value={`${detail.campaign.bandA} / ${detail.campaign.bandB}`} />
        </div>
        <section className="crm-state-card">
          <div className="campaign-controls-stack">
            <div>
              <h3 className="text-sm font-semibold">Operational actions</h3>
              <p className="muted mt-1 text-sm">
                Manual discovery, import, pause, duplicate, and archive remain available from here.
              </p>
            </div>
            <CampaignDetailControls
              campaignId={detail.campaign.id}
              status={detail.campaign.status}
              manualRunBlocked={detail.readiness.status === "Blocked"}
            />
          </div>
        </section>
      </div>
    </section>
  );
}

function SupportWarnings({ warnings }: { warnings: string[] }) {
  if (warnings.length === 0) return null;

  return (
    <section className="crm-state-card">
      <h3 className="text-sm font-semibold">Supporting data warnings</h3>
      <div className="mt-3 grid gap-2">
        {warnings.map((warning) => (
          <p className="muted text-sm" key={warning}>{warning}</p>
        ))}
      </div>
    </section>
  );
}

function LatestRunSummary({
  campaignId,
  latestRun
}: {
  campaignId: string;
  latestRun: CampaignDetail["runs"][number] | null;
}) {
  if (!latestRun) return null;

  return (
    <section className="crm-state-card">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold">Latest run summary</h3>
          <p className="muted mt-1 text-sm">
            Started {formatDateTime(latestRun.startedAt)} / Completed {formatDateTime(latestRun.completedAt)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={runStatusTone(latestRun.userStatus, latestRun.isStale)}>{latestRun.userStatus}</Badge>
          <a href={`/campaigns/${campaignId}/runs/${latestRun.id}`}>Open run detail</a>
        </div>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Candidates checked" value={latestRun.candidatesChecked} />
        <MetricCard label="Duplicates skipped" value={latestRun.duplicatesSkipped} />
        <MetricCard label="Leads created" value={latestRun.leadsFound} />
        <MetricCard label="Scored / queued / drafted" value={`${latestRun.scored} / ${latestRun.queued} / ${latestRun.drafted}`} />
      </div>
      <div className="mt-3 grid gap-2 text-sm sm:grid-cols-3">
        <span className="muted">Rejected: <strong>{latestRun.rejected}</strong></span>
        <span className="muted">Manual review: <strong>{latestRun.manualReview}</strong></span>
        <span className="muted">Errors/warnings: <strong>{latestRun.errorMessage ?? (latestRun.crawlFailures ? `${latestRun.crawlFailures} crawl failure` : "None")}</strong></span>
      </div>
    </section>
  );
}

function OperatorCockpit({ detail }: { detail: CampaignDetail }) {
  const latestRun = detail.runs[0] ?? null;
  const sendingBlocked = detail.campaign.status === "archived" || !detail.campaign.assignedInboxId || detail.globalOutreachPaused;
  const sendingLabel = getSendingLabel(detail);
  const missingSequences = getMissingSequences(detail);

  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <h2>Operator cockpit</h2>
          <p>Plain-language campaign state, latest discovery outcome, and sending readiness.</p>
        </div>
        {detail.supportWarnings.length > 0 ? <Badge tone="warning">{detail.supportWarnings.length} data warning{detail.supportWarnings.length === 1 ? "" : "s"}</Badge> : null}
      </div>
      <div className="panel-body grid gap-4">
        <SupportWarnings warnings={detail.supportWarnings} />
        <div className="campaign-detail-readiness-grid">
          <section className="crm-state-card">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold">Campaign status</h3>
              <Badge tone={statusTone(detail.campaign.status)}>{formatStatus(detail.campaign.status)}</Badge>
            </div>
            <p className="muted mt-2 text-sm">
              {detail.campaign.status === "active"
                ? "This campaign can run discovery when readiness checks pass."
                : `This campaign is ${formatStatus(detail.campaign.status)}.`}
            </p>
          </section>
          <section className="crm-state-card">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold">Global outreach</h3>
              <Badge tone={detail.globalOutreachPaused ? "warning" : "success"}>
                {detail.globalOutreachPaused ? "Paused" : "Enabled"}
              </Badge>
            </div>
            <p className="muted mt-2 text-sm">
              {detail.globalOutreachPaused ? "Discovery can still create leads, but sending should remain paused." : "Global outreach is enabled for eligible queued leads."}
            </p>
          </section>
          <section className="crm-state-card">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold">Discovery</h3>
              <Badge tone={latestRun ? runStatusTone(latestRun.userStatus, latestRun.isStale) : readinessTone(detail.readiness.status)}>
                {latestRun ? latestRun.userStatus : detail.readiness.status}
              </Badge>
            </div>
            <p className="muted mt-2 text-sm">
              {latestRun
                ? `${latestRun.leadsFound} leads created from ${latestRun.candidatesChecked} checked candidates.`
                : "No discovery run has been recorded for this campaign yet."}
            </p>
          </section>
          <section className="crm-state-card">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold">Sending</h3>
              <Badge tone={sendingBlocked ? "warning" : "success"}>{sendingLabel}</Badge>
            </div>
            <p className="muted mt-2 text-sm">
              {missingSequences.length > 0 ? missingSequences.join(" ") : "Band routing sequences are configured."}
            </p>
          </section>
        </div>
        <LatestRunSummary campaignId={detail.campaign.id} latestRun={latestRun} />
      </div>
    </section>
  );
}

function ReadinessIssueCard({ group }: { group: ReturnType<typeof buildReadinessGroups>[number] }) {
  return (
    <section className="crm-state-card">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold">{group.title}</h3>
        <Badge tone={group.tone}>{group.items.length}</Badge>
      </div>
      <div className="mt-3 grid gap-3">
        {group.items.length > 0 ? (
          group.items.map((item) => (
            <div key={`${group.title}-${item.label}-${item.message}`} className="rounded-xl border border-white/10 bg-white/3 px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <strong className="text-sm">{item.label}</strong>
                <Badge tone={item.severity === "blocker" ? "danger" : item.severity === "warning" ? "warning" : "info"}>
                  {item.severity}
                </Badge>
              </div>
              <p className="muted mt-2 text-sm leading-6">{item.message}</p>
            </div>
          ))
        ) : (
          <p className="muted text-sm">No {group.title.toLowerCase()}.</p>
        )}
      </div>
    </section>
  );
}

function ReadinessPanel({ detail }: { detail: CampaignDetail }) {
  const readinessGroups = buildReadinessGroups(detail);
  const hasReadinessItems = readinessGroups.some((group) => group.items.length > 0);

  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <h2>Readiness</h2>
          <p>Server-side checks for discovery, routing, inbox, n8n, and the global pause state.</p>
        </div>
        <Badge tone={readinessTone(detail.readiness.status)}>{detail.readiness.status}</Badge>
      </div>
      <div className="panel-body">
        {hasReadinessItems ? (
          <div className="campaign-detail-readiness-grid">
            {readinessGroups.map((group) => (
              <ReadinessIssueCard group={group} key={group.title} />
            ))}
          </div>
        ) : (
          <EmptyState
            title="Campaign is ready"
            description="No blocking issues, warnings, or informational notices are currently preventing discovery."
          />
        )}
      </div>
    </section>
  );
}

function OverviewTab({ overviewGroups }: { overviewGroups: ReturnType<typeof buildOverviewGroups> }) {
  return (
    <div className="campaign-detail-group-grid">
      {overviewGroups.map((group) => (
        <section className="crm-state-card campaign-detail-group-card" key={group.title}>
          <div className="campaign-detail-group-header">
            <div>
              <h3>{group.title}</h3>
              <p>{group.description}</p>
            </div>
          </div>
          <div className="campaign-detail-field-grid">
            {group.items.map((item) => (
              <div className="campaign-detail-field" key={`${group.title}-${item.label}`}>
                <span>{item.label}</span>
                <strong>{item.value}</strong>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function LeadsTab({ leads }: { leads: CampaignDetail["leads"] }) {
  return (
    <section className="stack-list">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold">Campaign leads</h3>
          <p className="muted mt-1 text-sm">
            {leads.length} lead{leads.length === 1 ? "" : "s"} currently routed through this campaign.
          </p>
        </div>
      </div>
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
        <EmptyState
          title="No leads yet"
          description="Once discovery runs, this campaignâ€™s lead list will appear here with banding, owner, and reply context."
        />
      )}
    </section>
  );
}

function RunCheckpoints({ events }: { events: CampaignDetail["runEvents"] }) {
  return (
    <section className="crm-state-card">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold">Latest run checkpoints</h3>
          <p className="muted mt-1 text-sm">Recent WF-10 workflow events for diagnosing the current discovery stage.</p>
        </div>
        <Badge tone="info">{events.length}</Badge>
      </div>
      {events.length > 0 ? (
        <div className="mt-4 grid gap-3">
          {events.map((event) => (
            <div key={event.id} className="rounded-xl border border-white/10 bg-white/3 px-4 py-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <strong className="text-sm">{event.label}</strong>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={event.status === "failed" ? "danger" : event.status === "blocked" ? "warning" : "muted"}>
                    {event.status}
                  </Badge>
                  <span className="muted text-xs">{formatDateTime(event.createdAt)}</span>
                </div>
              </div>
              {event.errorMessage ? <p className="mt-2 text-sm text-red-300">{event.errorMessage}</p> : null}
              {event.summary ? <p className="muted mt-2 text-sm leading-6">{event.summary}</p> : null}
            </div>
          ))}
        </div>
      ) : (
        <p className="muted mt-4 text-sm">No workflow events are recorded for this campaign yet.</p>
      )}
    </section>
  );
}

function RunHistoryTab({ detail }: { detail: CampaignDetail }) {
  return (
    <section className="stack-list">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold">Run history</h3>
          <p className="muted mt-1 text-sm">
            Recent discovery executions with lead counts, duplicates, and error totals.
          </p>
        </div>
      </div>
      {detail.runs.length > 0 ? (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Started</th>
                <th>Candidates</th>
                <th>Leads</th>
                <th>Review</th>
                <th>Rejected</th>
                <th>Places</th>
                <th>Duration</th>
                <th>Status</th>
                <th>Open</th>
              </tr>
            </thead>
            <tbody>
              {detail.runs.map((run) => (
                <tr key={run.id}>
                  <td className="mono">{run.startedAt ? new Date(run.startedAt).toLocaleString() : "--"}</td>
                  <td className="mono">{run.candidatesChecked}</td>
                  <td className="mono">{run.leadsFound}</td>
                  <td className="mono">{run.manualReview}</td>
                  <td className="mono">{run.rejected + run.crawlFailures}</td>
                  <td className="mono">{run.totalPlacesCalls}</td>
                  <td className="mono">{run.durationSeconds ? `${run.durationSeconds}s` : "--"}</td>
                  <td>
                    <div className="grid gap-1">
                      <Badge tone={runStatusTone(run.userStatus, run.isStale)}>{runStatusLabel(run.userStatus, run.isStale)}</Badge>
                      {run.errorMessage ? <span className="text-xs text-red-300">{run.errorMessage}</span> : null}
                    </div>
                  </td>
                  <td>
                    <a href={`/campaigns/${detail.campaign.id}/runs/${run.id}`}>Open run</a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState
          title="No runs recorded yet"
          description="Trigger a manual discovery run to populate the execution history and see the campaignâ€™s operational trail."
        />
      )}
      <RunCheckpoints events={detail.runEvents} />
    </section>
  );
}

function EditTab({ detail, settings }: { detail: CampaignDetail; settings: SettingsData }) {
  return (
    <section className="stack-list">
      <div>
        <h3 className="text-sm font-semibold">Edit campaign</h3>
        <p className="muted mt-1 text-sm">
          Adjust targeting, thresholds, routing, and automation behavior without changing the campaignâ€™s history.
        </p>
      </div>
      <section className="panel">
        <div className="panel-body">
          <EditCampaignForm
            campaign={detail.campaign as any}
            sequences={settings.sequences as any}
            inboxes={settings.inboxes as any}
            profiles={settings.profiles as any}
          />
        </div>
      </section>
    </section>
  );
}

function renderWorkspaceTab(
  tab: string,
  detail: CampaignDetail,
  settings: SettingsData,
  overviewGroups: ReturnType<typeof buildOverviewGroups>
): ReactNode {
  if (tab === "leads") return <LeadsTab leads={detail.leads} />;
  if (tab === "runs") return <RunHistoryTab detail={detail} />;
  if (tab === "edit") return <EditTab detail={detail} settings={settings} />;
  if (tab === "overview") return <OverviewTab overviewGroups={overviewGroups} />;
  return null;
}

function CampaignWorkspace({
  detail,
  settings,
  tab
}: {
  detail: CampaignDetail;
  settings: SettingsData;
  tab: string;
}) {
  const overviewGroups = buildOverviewGroups(detail, settings);

  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <h2>Campaign workspace</h2>
          <p>Move between the configuration, lead list, run history, and edit flow without losing context.</p>
        </div>
        <div className="campaign-detail-tabs">
          {CAMPAIGN_DETAIL_TABS.map((item) => (
            <a
              key={item.key}
              className={`campaign-detail-tab ${tab === item.key ? "is-active" : ""}`.trim()}
              aria-current={tab === item.key ? "page" : undefined}
              href={`/campaigns/${detail.campaign.id}?tab=${item.key}`}
            >
              {item.label}
            </a>
          ))}
        </div>
      </div>

      <div className="panel-body grid gap-5">
        {renderWorkspaceTab(tab, detail, settings, overviewGroups)}
      </div>
    </section>
  );
}

function CampaignDetailRail({ detail, settings }: { detail: CampaignDetail; settings: SettingsData }) {
  return (
    <aside className="campaign-detail-rail">
      <SettingsDiagnosticsCard diagnostics={settings.diagnostics} title="Campaign dependencies" />
      <section className="crm-state-card">
        <div className="grid gap-3">
          <div>
            <h3 className="text-sm font-semibold">Campaign snapshot</h3>
            <p className="muted mt-1 text-sm">A quick read on pace, thresholds, and routing without opening the full config.</p>
          </div>
          <div className="grid gap-3 text-sm">
            <div className="flex items-center justify-between gap-3 border-t border-white/10 pt-3">
              <span className="muted">Last run</span>
              <strong>{formatDateTime(detail.campaign.lastRunAt)}</strong>
            </div>
            <div className="flex items-center justify-between gap-3 border-t border-white/10 pt-3">
              <span className="muted">Next run</span>
              <strong>{formatDateTime(detail.campaign.nextRunAt)}</strong>
            </div>
            <div className="flex items-center justify-between gap-3 border-t border-white/10 pt-3">
              <span className="muted">Confidence</span>
              <strong>{displayValue(detail.campaign.confidenceRequired, "Not set")}</strong>
            </div>
            <div className="flex items-center justify-between gap-3 border-t border-white/10 pt-3">
              <span className="muted">Quota</span>
              <strong>{detail.campaign.maxLeadsPerRun} / run</strong>
            </div>
          </div>
        </div>
      </section>
      <section className="crm-state-card">
        <div className="grid gap-3">
          <div>
            <h3 className="text-sm font-semibold">Operational actions</h3>
            <p className="muted mt-1 text-sm">Use the buttons below for manual control, duplication, or archival.</p>
          </div>
          <CampaignDetailControls
            campaignId={detail.campaign.id}
            status={detail.campaign.status}
            manualRunBlocked={detail.readiness.status === "Blocked"}
          />
        </div>
      </section>
    </aside>
  );
}

function CampaignDetailContent({
  detail,
  settings,
  tab
}: {
  detail: CampaignDetail;
  settings: SettingsData;
  tab: string;
}) {
  return (
    <div className="grid gap-5">
      <CampaignDetailHero detail={detail} />
      <OperatorCockpit detail={detail} />
      <div className="campaign-detail-layout">
        <main className="campaign-detail-main">
          <ReadinessPanel detail={detail} />
          <CampaignWorkspace detail={detail} settings={settings} tab={tab} />
        </main>
        <CampaignDetailRail detail={detail} settings={settings} />
      </div>
    </div>
  );
}

export default async function CampaignDetailPage({
  params,
  searchParams
}: Readonly<{
  params: Promise<{ campaign_id: string }>;
  searchParams?: Promise<CampaignDetailSearchParams>;
}>) {
  const { campaignId, tab } = await resolveCampaignDetailParams(params, searchParams);
  if (!campaignId) notFound();

  const [detail, settings] = await Promise.all([
    getCampaignDetailData(campaignId),
    getSettingsData()
  ]);
  if (!detail) notFound();

  return <CampaignDetailContent detail={detail} settings={settings} tab={tab} />;
}
