import { notFound } from "next/navigation";
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

function groupItems(value: string[]) {
  return value.length > 0 ? value.join(", ") : "None";
}

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
  const sequences = settings.sequences as unknown as Array<{ id: string; name?: string | null }>;
  const inboxes = settings.inboxes as unknown as Array<{ id: string; email_address?: string | null }>;
  const inboxLabelMap = new Map(
    inboxes.map((inbox) => [
      inbox.id,
      inbox.email_address ?? inbox.id
    ])
  );
  const sequenceLabelMap = new Map(
    sequences.map((sequence) => [
      sequence.id,
      sequence.name ?? `Sequence ${sequence.id.slice(0, 8)}`
    ])
  );

  const overviewGroups = [
    {
      title: "Identity",
      description: "Core campaign identity, launch state, and ownership.",
      items: [
        { label: "Status", value: <Badge tone={statusTone(detail.campaign.status)}>{detail.campaign.status}</Badge> },
        { label: "Lead source", value: sourceLabel(detail.campaign.leadSource) },
        { label: "Primary niche", value: displayValue(detail.campaign.primaryNiche ?? detail.campaign.niche, "Not set") },
        {
          label: "Assigned inbox",
          value: displayValue(inboxLabelMap.get(detail.campaign.assignedInboxId ?? "") ?? null, "Not set")
        }
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
        {
          label: "Band A sequence",
          value: displayValue(sequenceLabelMap.get(detail.campaign.sequenceBandA ?? "") ?? null, "Default routing")
        },
        {
          label: "Band B sequence",
          value: displayValue(sequenceLabelMap.get(detail.campaign.sequenceBandB ?? "") ?? null, "Default routing")
        },
        {
          label: "Band C sequence",
          value: displayValue(sequenceLabelMap.get(detail.campaign.sequenceBandC ?? "") ?? null, "Default routing")
        },
        { label: "Notes", value: displayValue(detail.campaign.notes, "No notes") }
      ]
    }
  ];

  const tabs = [
    { key: "overview", label: "Overview" },
    { key: "leads", label: "Leads" },
    { key: "runs", label: "Run history" },
    { key: "edit", label: "Edit" }
  ] as const;

  const readinessGroups = [
    { title: "Blocking issues", items: detail.readiness.blockers, tone: "danger" as const },
    { title: "Warnings", items: detail.readiness.warnings, tone: "warning" as const },
    { title: "Info", items: detail.readiness.info, tone: "info" as const }
  ];

  return (
    <div className="grid gap-5">
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

      <div className="campaign-detail-layout">
        <main className="campaign-detail-main">
          <section className="panel">
            <div className="panel-header">
              <div>
                <h2>Readiness</h2>
                <p>Server-side checks for discovery, routing, inbox, n8n, and the global pause state.</p>
              </div>
              <Badge tone={readinessTone(detail.readiness.status)}>{detail.readiness.status}</Badge>
            </div>
            <div className="panel-body">
              {readinessGroups.some((group) => group.items.length > 0) ? (
                <div className="campaign-detail-readiness-grid">
                  {readinessGroups.map((group) => (
                    <section className="crm-state-card" key={group.title}>
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

          <section className="panel">
            <div className="panel-header">
              <div>
                <h2>Campaign workspace</h2>
                <p>Move between the configuration, lead list, run history, and edit flow without losing context.</p>
              </div>
              <div className="campaign-detail-tabs">
                {tabs.map((item) => (
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
              {tab === "overview" ? (
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
              ) : null}

              {tab === "leads" ? (
                <section className="stack-list">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-semibold">Campaign leads</h3>
                      <p className="muted mt-1 text-sm">
                        {detail.leads.length} lead{detail.leads.length === 1 ? "" : "s"} currently routed through this campaign.
                      </p>
                    </div>
                  </div>
                  {detail.leads.length > 0 ? (
                    <div className="table-wrap">
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th>Lead</th>
                            <th>Band</th>
                            <th>Status</th>
                            <th>Reply</th>
                            <th>Owner</th>
                          </tr>
                        </thead>
                        <tbody>
                          {detail.leads.map((lead) => (
                            <tr key={lead.id}>
                              <td>
                                <a href={`/pipeline/${lead.id}`}>{lead.businessName}</a>
                              </td>
                              <td>{lead.effectiveBand ?? "--"}</td>
                              <td>{lead.status}</td>
                              <td>{lead.latestReplyIntent ?? "--"}</td>
                              <td>{lead.assignedTo ?? "--"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <EmptyState
                      title="No leads yet"
                      description="Once discovery runs, this campaign’s lead list will appear here with banding, owner, and reply context."
                    />
                  )}
                </section>
              ) : null}

              {tab === "runs" ? (
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
                            <th>Leads found</th>
                            <th>Duplicates</th>
                            <th>Errors</th>
                            <th>Duration</th>
                            <th>Triggered by</th>
                            <th>Status</th>
                          </tr>
                        </thead>
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
                  ) : (
                    <EmptyState
                      title="No runs recorded yet"
                      description="Trigger a manual discovery run to populate the execution history and see the campaign’s operational trail."
                    />
                  )}
                </section>
              ) : null}

              {tab === "edit" ? (
                <section className="stack-list">
                  <div>
                    <h3 className="text-sm font-semibold">Edit campaign</h3>
                    <p className="muted mt-1 text-sm">
                      Adjust targeting, thresholds, routing, and automation behavior without changing the campaign’s history.
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
              ) : null}
            </div>
          </section>
        </main>

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
      </div>
    </div>
  );
}
