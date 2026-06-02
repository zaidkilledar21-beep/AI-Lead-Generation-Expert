import { notFound } from "next/navigation";
import { CampaignLeadsTable } from "@/components/crm/campaign-leads-table";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { MetricCard } from "@/components/ui/metric-card";
import { getCampaignRunDetailData } from "@/lib/crm/queries";

type RunDetailParams = Promise<{ campaign_id: string; run_id: string }>;
type CampaignRunDetail = NonNullable<Awaited<ReturnType<typeof getCampaignRunDetailData>>>;
type RunLead = CampaignRunDetail["leads"][number];
type RunEvent = CampaignRunDetail["events"][number];
type MetricItem = { label: string; value: string | number };

function formatDateTime(value: string | null) {
  return value ? new Date(value).toLocaleString() : "--";
}

function formatStatus(value: string | null | undefined) {
  return value ? value.replaceAll("_", " ") : "--";
}

function statusTone(status: string, isStale = false) {
  const normalized = status.toLowerCase();
  if (isStale || normalized.includes("failed") || normalized.includes("stuck")) return "danger" as const;
  if (normalized.includes("awaiting")) return "info" as const;
  if (normalized.includes("complete")) return "success" as const;
  if (
    normalized.includes("processing") ||
    normalized.includes("running") ||
    normalized.includes("quota") ||
    normalized.includes("paused")
  ) {
    return "warning" as const;
  }
  return "muted" as const;
}

function eventTone(status: string) {
  if (status === "failed") return "danger" as const;
  if (status === "blocked") return "warning" as const;
  if (status === "completed") return "success" as const;
  return "muted" as const;
}

function runWarningItems(detail: CampaignRunDetail) {
  return [
    detail.run.duplicatesSkipped > 0 ? `${detail.run.duplicatesSkipped} duplicates skipped.` : null,
    detail.run.rejected > 0 ? `${detail.run.rejected} candidates rejected.` : null,
    detail.run.crawlFailures > 0 ? `${detail.run.crawlFailures} crawl failure${detail.run.crawlFailures === 1 ? "" : "s"}.` : null,
    detail.run.missingEmailBlocks > 0 ? `${detail.run.missingEmailBlocks} missing-email queue block${detail.run.missingEmailBlocks === 1 ? "" : "s"}.` : null,
    detail.run.userStatus.toLowerCase().includes("quota") ? `Quota reached after ${detail.run.candidatesChecked} checked candidates.` : null,
    detail.run.errorMessage ? detail.run.errorMessage : null,
    ...detail.supportWarnings
  ].filter(Boolean) as string[];
}

function MetricGrid({ items }: { items: MetricItem[] }) {
  return (
    <div className="campaign-detail-metric-grid">
      {items.map((item) => (
        <MetricCard label={item.label} value={item.value} key={item.label} />
      ))}
    </div>
  );
}

function runMetricRows(run: CampaignRunDetail["run"]) {
  return [
    [
      { label: "Candidates checked", value: run.candidatesChecked },
      { label: "Leads created", value: run.promoted },
      { label: "Duplicates skipped", value: run.duplicatesSkipped },
      { label: "Manual review", value: run.manualReview }
    ],
    [
      { label: "Places calls", value: run.totalPlacesCalls },
      { label: "Rejected", value: run.rejected },
      { label: "Crawl failures", value: run.crawlFailures },
      { label: "Duration", value: run.durationSeconds ? `${run.durationSeconds}s` : "--" }
    ]
  ];
}

function RunFactRow({ run }: { run: CampaignRunDetail["run"] }) {
  const facts = [
    ["Started", formatDateTime(run.startedAt)],
    ["Completed", formatDateTime(run.completedAt)],
    ["Run ID", run.id]
  ];

  return (
    <div className="grid gap-2 text-sm sm:grid-cols-3">
      {facts.map(([label, value]) => (
        <span className="muted" key={label}>{label}: <strong className={label === "Run ID" ? "mono" : undefined}>{value}</strong></span>
      ))}
    </div>
  );
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
        {runMetricRows(run).map((items, index) => (
          <MetricGrid items={items} key={index} />
        ))}
        <RunFactRow run={run} />
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
        <CampaignLeadsTable
          leads={leads}
          emptyTitle="No leads created in this run"
          emptyDescription="This run did not produce any campaign leads."
        />
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
