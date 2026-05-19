import { Badge } from "@/components/ui/badge";
import { Button, LinkButton } from "@/components/ui/button";
import { CrmSelect } from "@/components/ui/crm-select";
import { EmptyState } from "@/components/ui/empty-state";
import { MetricCard } from "@/components/ui/metric-card";
import { getCampaignRows } from "@/lib/crm/queries";
import { archiveCampaignAction, duplicateCampaignFormAction, updateCampaignStatus } from "./actions";
import { RunNowButton } from "./run-now-button";

function statusTone(status: string) {
  if (status === "active") return "success" as const;
  if (status === "paused") return "warning" as const;
  if (status === "draft") return "muted" as const;
  if (status === "completed") return "info" as const;
  return "muted" as const;
}

function formatFrequency(value: string) {
  if (value === "every_3_days") return "Every 3 days";
  return value.charAt(0).toUpperCase() + value.slice(1).replaceAll("_", " ");
}

function formatSource(value: string) {
  if (value === "manual_import") return "Manual import";
  if (value === "google_places") return "Google Places";
  return value.replaceAll("_", " ");
}

function formatDateTime(value: string | null) {
  return value ? new Date(value).toLocaleString() : "--";
}

function runStatusTone(status: string | null, isStale: boolean) {
  if (isStale || status === "failed") return "danger" as const;
  if (status === "completed") return "success" as const;
  if (status === "running") return "warning" as const;
  if (status === "quota_exhausted" || status === "blocked") return "warning" as const;
  return "muted" as const;
}

function formatRunStatus(status: string | null, isStale: boolean) {
  if (isStale) return "stale running";
  return status ? status.replaceAll("_", " ") : "no run";
}

function buildHref(
  base: string,
  params: Readonly<{
    status?: string;
    source?: string;
    q?: string;
  }>
) {
  const url = new URL(base, "https://local");
  if (params.status) url.searchParams.set("status", params.status);
  if (params.source) url.searchParams.set("source", params.source);
  if (params.q) url.searchParams.set("q", params.q);
  return `${url.pathname}${url.search}`;
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

  const statusCounts = {
    operating: campaigns.filter((campaign) => campaign.status !== "archived").length,
    all: campaigns.length,
    active: campaigns.filter((campaign) => campaign.status === "active").length,
    draft: campaigns.filter((campaign) => campaign.status === "draft").length,
    paused: campaigns.filter((campaign) => campaign.status === "paused").length,
    completed: campaigns.filter((campaign) => campaign.status === "completed").length,
    archived: campaigns.filter((campaign) => campaign.status === "archived").length
  };

  const totals = campaigns.reduce(
    (accumulator, campaign) => ({
      leads: accumulator.leads + campaign.leads,
      replies: accumulator.replies + campaign.replies,
      scored: accumulator.scored + campaign.scored,
      bandA: accumulator.bandA + campaign.bandA,
      bandB: accumulator.bandB + campaign.bandB,
      scheduled: accumulator.scheduled + (campaign.runFrequency === "manual" ? 0 : 1)
    }),
    { leads: 0, replies: 0, scored: 0, bandA: 0, bandB: 0, scheduled: 0 }
  );

  const statusViews = [
    { id: "operating", label: "Operating", count: statusCounts.operating },
    { id: "active", label: "Active", count: statusCounts.active },
    { id: "draft", label: "Drafts", count: statusCounts.draft },
    { id: "paused", label: "Paused", count: statusCounts.paused },
    { id: "completed", label: "Completed", count: statusCounts.completed },
    { id: "archived", label: "Archived", count: statusCounts.archived }
  ] as const;

  return (
    <div className="grid gap-5">
      <section className="panel campaigns-hero-shell">
        <div className="campaigns-hero-copy">
          <span className="crm-shell-eyebrow">Campaign command center</span>
          <div className="grid gap-3">
            <h1>Campaigns</h1>
            <p>
              Configure discovery programs, check readiness at a glance, and jump straight into the next operational action.
            </p>
          </div>
          <div className="pipeline-chip-row">
            <span className="pipeline-chip">
              <strong>{statusCounts.operating}</strong> operating
            </span>
            <span className="pipeline-chip">
              <strong>{totals.scheduled}</strong> scheduled cadence
            </span>
            <span className="pipeline-chip">
              <strong>{totals.replies}</strong> replies
            </span>
            <span className="pipeline-chip">
              <strong>{totals.bandA + totals.bandB}</strong> band A/B
            </span>
          </div>
          <div className="campaigns-hero-actions">
            <LinkButton href="/campaigns/new">New campaign</LinkButton>
            <LinkButton href={buildHref("/campaigns", { status: "active", source, q: searchParams?.q })} variant="secondary">
              Active programs
            </LinkButton>
          </div>
        </div>

        <div className="campaigns-hero-aside">
          <MetricCard label="Total leads" value={totals.leads} delta={`${filtered.length} visible`} />
          <MetricCard label="Replies" value={totals.replies} delta={`${totals.scored} scored`} />
          <MetricCard label="Band A / B" value={`${totals.bandA} / ${totals.bandB}`} delta="Qualification depth" />
          <MetricCard label="Scheduled" value={totals.scheduled} delta="Non-manual cadence" />
        </div>
      </section>

      <section className="saved-view-panel">
        <div className="saved-view-header">
          <div>
            <h3>Quick views</h3>
            <p>Jump into the operating slice you care about most.</p>
          </div>
          <span>{filtered.length} visible</span>
        </div>
        <div className="saved-filter-row">
          {statusViews.map((view) => (
            <a
              key={view.id}
              className={`saved-filter-chip ${status === view.id ? "is-active" : ""}`.trim()}
              href={buildHref("/campaigns", {
                status: view.id,
                source,
                q: searchParams?.q
              })}
              aria-current={status === view.id ? "page" : undefined}
            >
              <span>{view.label}</span>
              <strong>{view.count}</strong>
            </a>
          ))}
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Filter campaigns</h2>
            <p>Search by name, niche, geography, or lead source. Narrow to the exact discovery program you need.</p>
          </div>
          <span className="muted">
            Showing {filtered.length} of {campaigns.length}
          </span>
        </div>
        <form className="panel-body filter-grid" method="get">
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
            <Button type="submit">Apply filters</Button>
            <LinkButton href="/campaigns" variant="secondary">
              Reset
            </LinkButton>
          </div>
        </form>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Campaign roster</h2>
            <p>Each card surfaces readiness, pacing, and the next operational move without forcing a drill-down.</p>
          </div>
          <span className="muted">
            {filtered.length === 0 ? "No matching campaigns" : `${filtered.length} campaign${filtered.length === 1 ? "" : "s"}`}
          </span>
        </div>
        <div className="panel-body">
          {filtered.length > 0 ? (
            <div className="campaign-card-grid">
              {filtered.map((campaign) => {
                const geography = campaign.targetCountries.join(", ") || campaign.region;
                const cities = campaign.targetCities.join(", ") || "All cities";
                const nextRunLabel = formatDateTime(campaign.nextRunAt);
                const lastRunLabel = formatDateTime(campaign.lastRunAt);
                const latestRunAt = campaign.latestRunCompletedAt ?? campaign.latestRunStartedAt ?? campaign.lastRunAt;
                const latestRunLabel = formatDateTime(latestRunAt);
                const isArchived = campaign.status === "archived";
                const isActive = campaign.status === "active";
                const geographyLabel = geography || "Unspecified";

                return (
                  <article className="panel campaign-card" key={campaign.id}>
                    <div className="campaign-card-header">
                      <div className="campaign-card-title">
                        <div className="flex flex-wrap items-center gap-2">
                          <a href={`/campaigns/${campaign.id}`}>
                            <h3>{campaign.name}</h3>
                          </a>
                          <Badge tone={statusTone(campaign.status)}>{campaign.status}</Badge>
                        </div>
                        <p>{campaign.description ?? "No description yet. Use this campaign to frame a new discovery program."}</p>
                      </div>
                      <div className="campaign-card-badges">
                        <Badge tone={campaign.runFrequency === "manual" ? "muted" : "info"}>{formatFrequency(campaign.runFrequency)}</Badge>
                        <Badge tone={campaign.leadSource === "manual_import" ? "warning" : "success"}>
                          {formatSource(campaign.leadSource)}
                        </Badge>
                      </div>
                    </div>

                    <div className="campaign-card-summary">
                      <span className="pipeline-chip">
                        <strong>{campaign.primaryNiche ?? campaign.niche}</strong>
                      </span>
                      <span className="pipeline-chip">{geographyLabel}</span>
                      <span className="pipeline-chip">{cities}</span>
                      <span className="pipeline-chip">
                        Band target <strong>A {campaign.minScoreBandA}</strong> / <strong>B {campaign.minScoreBandB}</strong>
                      </span>
                    </div>

                    <div className="campaign-card-metrics">
                      <div className="campaign-card-metric">
                        <span>Leads</span>
                        <strong>{campaign.leads}</strong>
                      </div>
                      <div className="campaign-card-metric">
                        <span>Scored</span>
                        <strong>{campaign.scored}</strong>
                      </div>
                      <div className="campaign-card-metric">
                        <span>Band A / B</span>
                        <strong>
                          {campaign.bandA} / {campaign.bandB}
                        </strong>
                      </div>
                      <div className="campaign-card-metric">
                        <span>Replies</span>
                        <strong>{campaign.replies}</strong>
                      </div>
                    </div>

                    <div className="campaign-card-footer">
                      <div className="campaign-card-footline">
                        <span>Last run {lastRunLabel}</span>
                        <span>Next run {nextRunLabel}</span>
                      </div>
                      {campaign.latestRunStatus ? (
                        <div className="grid gap-2 rounded-xl border border-white/10 bg-white/3 p-3 text-xs">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="muted">Latest run {latestRunLabel}</span>
                            <Badge tone={runStatusTone(campaign.latestRunStatus, campaign.latestRunIsStale)}>
                              {formatRunStatus(campaign.latestRunStatus, campaign.latestRunIsStale)}
                            </Badge>
                          </div>
                          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                            <span>
                              <strong>{campaign.latestRunCandidatesChecked}</strong> candidates
                            </span>
                            <span>
                              <strong>{campaign.latestRunCandidatesPromoted}</strong> leads
                            </span>
                            <span>
                              <strong>{campaign.latestRunManualReviewCandidates}</strong> review
                            </span>
                            <span>
                              <strong>{campaign.latestRunRejected + campaign.latestRunCrawlFailures}</strong> rejected/fail
                            </span>
                          </div>
                          {campaign.latestRunCheckpoint ? (
                            <div className="muted">
                              Last checkpoint: <strong>{campaign.latestRunCheckpoint}</strong>
                              {campaign.latestRunCheckpointStatus ? ` (${campaign.latestRunCheckpointStatus})` : ""}
                              {campaign.latestRunCheckpointSummary ? ` - ${campaign.latestRunCheckpointSummary}` : ""}
                            </div>
                          ) : null}
                          <div className="muted">
                            Queue: {campaign.queuedOutreach} queued / {campaign.pausedOutreach} paused / {campaign.blockedOutreach} blocked.
                            Manual review: {campaign.pendingManualReviews}
                            {campaign.latestManualReviewReason ? ` (${campaign.latestManualReviewReason})` : ""}.
                          </div>
                          {campaign.latestRunError ? <span className="text-red-300">{campaign.latestRunError}</span> : null}
                        </div>
                      ) : null}
                      <div className="campaign-card-actions">
                        <RunNowButton campaignId={campaign.id} disabled={isArchived} />
                        <LinkButton href={`/campaigns/${campaign.id}`} variant="secondary">
                          Open
                        </LinkButton>
                        {!isArchived ? (
                          <form action={updateCampaignStatus.bind(null, campaign.id, isActive ? "paused" : "active")}>
                            <Button type="submit" variant="secondary">
                              {isActive ? "Pause" : "Resume"}
                            </Button>
                          </form>
                        ) : null}
                        <form action={duplicateCampaignFormAction.bind(null, campaign.id)}>
                          <Button type="submit" variant="secondary">
                            Duplicate
                          </Button>
                        </form>
                        {!isArchived ? (
                          <form action={archiveCampaignAction.bind(null, campaign.id)}>
                            <Button type="submit" variant="danger">
                              Archive
                            </Button>
                          </form>
                        ) : null}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <EmptyState
              title={campaigns.length === 0 ? "No campaigns yet" : "No campaigns match these filters"}
              description={
                campaigns.length === 0
                  ? "Create the first discovery program to start building a premium operational control center."
                  : "Relax the status, source, or search filters to bring the matching campaign back into view."
              }
              action={
                <div className="empty-state-action">
                  <LinkButton href="/campaigns/new">New campaign</LinkButton>
                  <LinkButton href="/campaigns" variant="secondary">
                    Reset filters
                  </LinkButton>
                </div>
              }
            />
          )}
        </div>
      </section>
    </div>
  );
}
