import { PageHeader } from "@/components/crm/page-header";
import { Badge } from "@/components/ui/badge";
import { LinkButton } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { CrmDateField } from "@/components/ui/crm-date-field";
import { CrmSelect } from "@/components/ui/crm-select";
import { MetricCard } from "@/components/ui/metric-card";
import { deleteFilterAction, saveFilterAction } from "@/lib/crm/actions";
import { getCrmHomeMetrics, getPipelineRows, getSavedFilters, getSettingsData } from "@/lib/crm/queries";
import { OBJECTION_REPLY_INTENTS, POSITIVE_REPLY_INTENTS, formatStatusLabel } from "@/lib/crm/status-contract";
import { KanbanBoard } from "@/components/crm/kanban-board";
import { PipelineListView } from "@/components/crm/pipeline-list-view";
import { 
  Search, 
  Plus, 
  LayoutGrid, 
  List, 
  Globe, 
  Tag, 
  Briefcase, 
  MessageSquare, 
  CheckCircle, 
  User, 
  Save, 
  XCircle,
  Hash
} from "lucide-react";

function matchesFilter(row: Awaited<ReturnType<typeof getPipelineRows>>[number], searchParams: Record<string, string | undefined>) {
  const q = searchParams.q?.toLowerCase().trim();
  const matchesSearch =
    !q ||
    [row.businessName, row.niche, row.city, row.country, row.email, row.phone, row.campaignName]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(q);

  const replyFilter = searchParams.reply;
  const reviewFilter = searchParams.review;
  const minScore = searchParams.min_score ? Number(searchParams.min_score) : null;
  const maxScore = searchParams.max_score ? Number(searchParams.max_score) : null;
  const createdFrom = searchParams.created_from ? new Date(searchParams.created_from).getTime() : null;
  const createdTo = searchParams.created_to ? new Date(`${searchParams.created_to}T23:59:59`).getTime() : null;
  const createdAt = row.createdAt ? new Date(row.createdAt).getTime() : null;
  const score = row.score ?? null;

  return (
    matchesSearch &&
    (!searchParams.band || row.effectiveBand === searchParams.band) &&
    (!searchParams.status || row.status === searchParams.status) &&
    (!searchParams.campaign || row.campaignId === searchParams.campaign) &&
    (!searchParams.country || row.country === searchParams.country) &&
    (!searchParams.niche || row.niche === searchParams.niche) &&
    (!searchParams.assigned || (searchParams.assigned === "unassigned" ? !row.assignedTo : row.assignedTo === searchParams.assigned)) &&
    (!Number.isFinite(minScore) || score === null || score >= Number(minScore)) &&
    (!Number.isFinite(maxScore) || score === null || score <= Number(maxScore)) &&
    (!createdFrom || (createdAt !== null && createdAt >= createdFrom)) &&
    (!createdTo || (createdAt !== null && createdAt <= createdTo)) &&
    (!replyFilter ||
      (replyFilter === "has_reply" && row.replyCount > 0) ||
      (replyFilter === "no_reply" && row.replyCount === 0) ||
      (replyFilter === "positive" && (POSITIVE_REPLY_INTENTS as readonly string[]).includes(row.latestReplyIntent ?? "")) ||
      (replyFilter === "objection" && (OBJECTION_REPLY_INTENTS as readonly string[]).includes(row.latestReplyIntent ?? ""))) &&
    (!reviewFilter ||
      (reviewFilter === "pending" && row.hasPendingReview) ||
      (reviewFilter === "reviewed" && !row.hasPendingReview))
  );
}

function sortRows(rows: Awaited<ReturnType<typeof getPipelineRows>>, searchParams: Record<string, string | undefined>) {
  const sort = searchParams.sort ?? "activity";
  const dir = searchParams.dir === "asc" ? 1 : -1;
  const valueFor = (row: Awaited<ReturnType<typeof getPipelineRows>>[number]) => {
    if (sort === "business") return row.businessName ?? "";
    if (sort === "score") return row.score ?? -1;
    if (sort === "status") return row.status ?? "";
    if (sort === "campaign") return row.campaignName ?? "";
    if (sort === "reply") return row.latestReplyIntent ?? "";
    if (sort === "owner") return row.assignedTo ?? "";
    if (sort === "created") return row.createdAt ? new Date(row.createdAt).getTime() : 0;
    return row.lastActivityAt ? new Date(row.lastActivityAt).getTime() : 0;
  };

  return [...rows].sort((a, b) => {
    const av = valueFor(a);
    const bv = valueFor(b);
    if (typeof av === "number" && typeof bv === "number") return (av - bv) * dir;
    return String(av).localeCompare(String(bv)) * dir;
  });
}

function summarizeRows(rows: Awaited<ReturnType<typeof getPipelineRows>>) {
  return {
    total: rows.length,
    bandA: rows.filter((row) => row.effectiveBand === "A").length,
    bandB: rows.filter((row) => row.effectiveBand === "B").length,
    bandC: rows.filter((row) => row.effectiveBand === "C").length,
    bandD: rows.filter((row) => row.effectiveBand === "D").length,
    awaitingReview: rows.filter((row) => row.hasPendingReview).length
  };
}

const boardColumns = [
  { key: "new", label: "New" },
  { key: "enriched", label: "Enriched" },
  { key: "scored", label: "Scored" },
  { key: "review_pending", label: "Review Pending" },
  { key: "pending_approval", label: "Pending Approval" },
  { key: "queued", label: "Queued" },
  { key: "drafted", label: "Drafted" },
  { key: "in_sequence", label: "In Sequence" },
  { key: "replied_needs_review", label: "Reply Review" },
  { key: "replied_interested", label: "Interested" },
  { key: "replied_not_interested", label: "Not Interested" },
  { key: "closed_won", label: "Closed Won" },
  { key: "closed_lost", label: "Closed Lost" }
];

const metricHrefByLabel: Record<string, string> = {
  Pipeline: "/pipeline",
  "Priority Leads": "/pipeline?band=A",
  "Unhandled Replies": "/inbox?tab=unhandled",
  "Open Reviews": "/review?status=pending"
};

export default async function PipelinePage({
  searchParams
}: Readonly<{
  searchParams: Promise<Record<string, string | undefined>>;
}>) {
  const resolvedParams = await searchParams;
  const [metrics, rows, savedFilters, settings] = await Promise.all([getCrmHomeMetrics(), getPipelineRows(500), getSavedFilters("pipeline"), getSettingsData()]);
  const filtered = sortRows(rows.filter((row) => matchesFilter(row, resolvedParams)), resolvedParams);
  const summary = summarizeRows(filtered);
  const campaigns = [...new Map(rows.filter((row) => row.campaignId).map((row) => [row.campaignId, row])).values()];
  const countries = [...new Set(rows.map((row) => row.country).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  const niches = [...new Set(rows.map((row) => row.niche).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  const view = resolvedParams.view === "board" ? "board" : "list";
  const hasActiveFilters = Object.entries(resolvedParams).some(
    ([key, value]) => key !== "view" && typeof value === "string" && value.length > 0
  );
  const campaignOptions = campaigns.map((row) => ({
    value: row.campaignId ?? "",
    label: row.campaignName ?? "Unnamed campaign",
    description: row.campaignNiche ?? undefined
  }));
  const campaignCount = campaigns.length;
  const nicheOptions = niches.map((niche) => ({ value: niche, label: niche }));
  const countryOptions = countries.map((country) => ({ value: country, label: country }));
  const ownerOptions = [
    ...settings.profiles.map((profile) => ({ value: profile.display_name, label: profile.display_name })),
    { value: "unassigned", label: "Unassigned" }
  ];
  const statusOptions = [...new Set(rows.map((row) => row.status))].map((status) => ({
    value: status,
    label: formatStatusLabel(status)
  }));

  return (
    <>
      <PageHeader
        title="Pipeline"
        description="Operate leads by band, review state, reply state, outreach stage, and campaign context."
        actions={
          <>
            <LinkButton href="/campaigns/new" variant="secondary" className="h-10 px-5 gap-3">
              <Plus className="w-4 h-4 text-brand" />
              <span className="font-semibold">New campaign</span>
            </LinkButton>
            <div className="pipeline-view-toggle" aria-label="Pipeline view switch">
              <LinkButton
                href="/pipeline"
                variant={view === "list" ? "secondary" : "ghost"}
                className="h-10 px-4 gap-2"
              >
                <List className="w-4 h-4" />
                <span className="font-semibold">List</span>
              </LinkButton>
              <LinkButton
                href="/pipeline?view=board"
                variant={view === "board" ? "secondary" : "ghost"}
                className="h-10 px-4 gap-2"
              >
                <LayoutGrid className="w-4 h-4" />
                <span className="font-semibold">Board</span>
              </LinkButton>
            </div>
          </>
        }
      />

      <section className="pipeline-hero crm-surface mb-6">
        <div className="pipeline-hero-shell">
          <div className="space-y-5">
            <div className="pipeline-eyebrow">
              <span className="pipeline-eyebrow-dot" />
              Workflow control
            </div>
            <div className="space-y-4">
              <h2 className="pipeline-title">
                Prioritize the next move without losing workflow context.
              </h2>
              <p className="pipeline-copy">
                Linear-inspired clarity for lead triage, review states, reply intent, and campaign context. Use the filtered list when you want precision, switch to board view when stage movement is the goal.
              </p>
            </div>
            <div className="pipeline-chip-row" aria-label="Pipeline summary">
              <div className="pipeline-chip">
                <span>Visible leads</span>
                <strong>{filtered.length}</strong>
              </div>
              <div className="pipeline-chip">
                <span>Awaiting review</span>
                <strong>{summary.awaitingReview}</strong>
              </div>
              <div className="pipeline-chip">
                <span>Saved views</span>
                <strong>{savedFilters.length}</strong>
              </div>
              <div className="pipeline-chip">
                <span>Campaigns</span>
                <strong>{campaignCount}</strong>
              </div>
            </div>
          </div>

          <div className="pipeline-hero-stats" aria-label="Pipeline quick stats">
            <div className="pipeline-hero-stat">
              <label>Workflow mode</label>
              <strong>{view === "board" ? "Board" : "List"}</strong>
              <span>{view === "board" ? "Move leads across stages with drag and drop." : "Scan rows, triage actions, and bulk-operate quickly."}</span>
            </div>
            <div className="pipeline-hero-stat">
              <label>Filtered scope</label>
              <strong>{filtered.length.toString().padStart(2, "0")}</strong>
              <span>{hasActiveFilters ? "Current filters are narrowing the working set." : "No active filters are trimming the working set."}</span>
            </div>
            <div className="pipeline-hero-stat">
              <label>Review queue</label>
              <strong>{summary.awaitingReview.toString().padStart(2, "0")}</strong>
              <span>These leads still need a human decision before outbound moves on.</span>
            </div>
            <div className="pipeline-hero-stat">
              <label>Priority A</label>
              <strong>{summary.bandA.toString().padStart(2, "0")}</strong>
              <span>Top-band leads stay visible so the team can act without hunting.</span>
            </div>
          </div>
        </div>
      </section>

      <section className="metric-grid" aria-label="Pipeline metrics">
        {metrics.map((metric) => (
          <MetricCard
            key={metric.label}
            label={metric.label}
            value={metric.value}
            href={metricHrefByLabel[metric.label]}
            ariaLabel={`Open ${metric.label.toLowerCase()} view`}
          />
        ))}
      </section>

      <section className="pipeline-panel pipeline-filter-shell crm-surface mb-8">
        <div className="pipeline-panel-header">
          <div>
            <h2>Pipeline controls</h2>
            <p>Search, segment, and save workflow slices without giving up the context of the full pipeline.</p>
          </div>
          <div className="pipeline-panel-actions">
            <Badge tone="muted" className="px-3 py-1.5">{filtered.length} leads in view</Badge>
            <Badge tone="muted" className="px-3 py-1.5">{summary.bandA} priority A</Badge>
            <Badge tone="warning" className="px-3 py-1.5">{summary.awaitingReview} need review</Badge>
            {hasActiveFilters ? (
              <LinkButton href="/pipeline" variant="ghost" className="h-9 px-4 border border-white/10 hover:border-brand/35">
                <XCircle className="w-3.5 h-3.5" />
                Reset filters
              </LinkButton>
            ) : null}
          </div>
        </div>

        <div className="pipeline-filter-grid">
          <form className="pipeline-filter-core">
            <div className="pipeline-filter-grid-core">
              <div className="field-group col-span-2">
                <label htmlFor="filter-q" className="field-label flex items-center gap-2">
                  <Search className="w-3 h-3" /> Keyword search
                </label>
                <input
                  id="filter-q"
                  className="field w-full"
                  name="q"
                  placeholder="Business, email, city, campaign..."
                  defaultValue={resolvedParams.q ?? ""}
                />
              </div>

              <div className="field-group">
                <label htmlFor="filter-band" className="field-label flex items-center gap-2">
                  <Tag className="w-3 h-3" /> Lead band
                </label>
                <CrmSelect
                  name="band"
                  defaultValue={resolvedParams.band ?? ""}
                  placeholder="All bands"
                  options={["A", "B", "C", "D"].map((band) => ({ value: band, label: `Band ${band}` }))}
                />
              </div>

              <div className="field-group">
                <label htmlFor="filter-status" className="field-label flex items-center gap-2">
                  <CheckCircle className="w-3 h-3" /> Lifecycle status
                </label>
                <CrmSelect
                  name="status"
                  defaultValue={resolvedParams.status ?? ""}
                  placeholder="All statuses"
                  options={statusOptions}
                />
              </div>

              <div className="field-group">
                <label htmlFor="filter-campaign" className="field-label flex items-center gap-2">
                  <Briefcase className="w-3 h-3" /> Campaign
                </label>
                <CrmSelect
                  name="campaign"
                  defaultValue={resolvedParams.campaign ?? ""}
                  placeholder="All campaigns"
                  emptyState="No campaigns are available in the current pipeline set."
                  options={campaignOptions}
                />
              </div>

              <div className="field-group">
                <label htmlFor="filter-niche" className="field-label flex items-center gap-2">
                  <Hash className="w-3 h-3" /> Market niche
                </label>
                <CrmSelect
                  name="niche"
                  defaultValue={resolvedParams.niche ?? ""}
                  placeholder="All niches"
                  emptyState="No niches available in the current pipeline set."
                  options={nicheOptions}
                />
              </div>

              <div className="field-group">
                <label htmlFor="filter-country" className="field-label flex items-center gap-2">
                  <Globe className="w-3 h-3" /> Geography
                </label>
                <CrmSelect
                  name="country"
                  defaultValue={resolvedParams.country ?? ""}
                  placeholder="All countries"
                  emptyState="No countries available in the current pipeline set."
                  options={countryOptions}
                />
              </div>

              <div className="field-group">
                <label htmlFor="filter-reply" className="field-label flex items-center gap-2">
                  <MessageSquare className="w-3 h-3" /> Reply intent
                </label>
                <CrmSelect
                  name="reply"
                  defaultValue={resolvedParams.reply ?? ""}
                  placeholder="Any intent"
                  options={[
                    { value: "no_reply", label: "No reply" },
                    { value: "has_reply", label: "Has reply" },
                    { value: "positive", label: "Positive interest" },
                    { value: "objection", label: "Objection / review" }
                  ]}
                />
              </div>

              <div className="field-group">
                <label htmlFor="filter-review" className="field-label flex items-center gap-2">
                  <User className="w-3 h-3" /> Review state
                </label>
                <CrmSelect
                  name="review"
                  defaultValue={resolvedParams.review ?? ""}
                  placeholder="All states"
                  options={[
                    { value: "pending", label: "Pending" },
                    { value: "reviewed", label: "Reviewed" }
                  ]}
                />
              </div>

              <div className="field-group">
                <label htmlFor="filter-owner" className="field-label flex items-center gap-2">
                  <User className="w-3 h-3" /> Assigned owner
                </label>
                <CrmSelect
                  name="assigned"
                  defaultValue={resolvedParams.assigned ?? ""}
                  placeholder="All owners"
                  emptyState="No founder profiles configured."
                  options={ownerOptions}
                />
              </div>
            </div>

            <input type="hidden" name="view" value={view} />

            <div className="button-row justify-end pt-2">
              <button className="ui-button ui-button-primary h-11 px-6" type="submit">
                Apply filters
              </button>
            </div>
          </form>

          <aside className="pipeline-filter-side">
            <div className="pipeline-filter-meta">
              <div className="pipeline-filter-meta-header">
                <div>
                  <h3>Filter depth</h3>
                  <p>Use score and date windows for precision slices; keep them off when scanning broadly.</p>
                </div>
                <Badge tone="muted" className="px-3 py-1.5">{summary.total} total</Badge>
              </div>

              <div className="stack-list">
                <div className="field-group">
                  <label htmlFor="filter-min-score" className="field-label">Min score</label>
                  <input id="filter-min-score" className="field" name="min_score" type="number" min="0" max="100" defaultValue={resolvedParams.min_score ?? ""} />
                </div>

                <div className="field-group">
                  <label htmlFor="filter-max-score" className="field-label">Max score</label>
                  <input id="filter-max-score" className="field" name="max_score" type="number" min="0" max="100" defaultValue={resolvedParams.max_score ?? ""} />
                </div>

                <div className="field-group">
                  <label htmlFor="filter-created-from" className="field-label">Created from</label>
                  <CrmDateField name="created_from" defaultValue={resolvedParams.created_from ?? ""} placeholder="Created from" />
                </div>

                <div className="field-group">
                  <label htmlFor="filter-created-to" className="field-label">Created to</label>
                  <CrmDateField name="created_to" defaultValue={resolvedParams.created_to ?? ""} placeholder="Created to" />
                </div>

                <div className="field-group">
                  <label htmlFor="filter-sort" className="field-label">Sort</label>
                  <CrmSelect
                    name="sort"
                    defaultValue={resolvedParams.sort ?? "activity"}
                    options={[
                      { value: "activity", label: "Last activity" },
                      { value: "business", label: "Business" },
                      { value: "score", label: "Score" },
                      { value: "status", label: "Status" },
                      { value: "campaign", label: "Campaign" },
                      { value: "reply", label: "Reply" },
                      { value: "owner", label: "Owner" },
                      { value: "created", label: "Created" }
                    ]}
                  />
                </div>

                <div className="field-group">
                  <label htmlFor="filter-dir" className="field-label">Direction</label>
                  <CrmSelect
                    name="dir"
                    defaultValue={resolvedParams.dir ?? "desc"}
                    options={[
                      { value: "desc", label: "Descending" },
                      { value: "asc", label: "Ascending" }
                    ]}
                  />
                </div>
              </div>
            </div>

            <div className="pipeline-saved-views">
              <div className="pipeline-saved-views-header">
                <div>
                  <h3>Saved views</h3>
                  <p>Jump back to focused pipeline slices without rebuilding the query.</p>
                </div>
                <Badge tone="muted" className="px-3 py-1.5">{savedFilters.length} saved</Badge>
              </div>
              {savedFilters.length > 0 ? (
                <div className="pipeline-saved-views-row">
                  {savedFilters.map((filter) => (
                    <div className="pipeline-saved-view group" key={filter.id}>
                      <a
                        href={`/pipeline?${new URLSearchParams(filter.filters as Record<string, string>).toString()}`}
                        className="min-w-0 truncate text-white/85 hover:text-white transition-colors"
                      >
                        {filter.name}
                      </a>
                      <form action={deleteFilterAction}>
                        <input type="hidden" name="id" value={filter.id} />
                        <button
                          className="inline-flex h-6 w-6 items-center justify-center border border-white/10 bg-white/5 text-white/45 hover:border-red-400/30 hover:bg-red-500/10 hover:text-red-200"
                          type="submit"
                          aria-label={`Delete saved view ${filter.name}`}
                        >
                          <XCircle className="w-3 h-3" />
                        </button>
                      </form>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="saved-view-empty">No saved views yet.</p>
              )}

              <form action={saveFilterAction} className="save-filter-form">
                <input type="hidden" name="viewKey" value="pipeline" />
                <input
                  type="hidden"
                  name="filters"
                  value={JSON.stringify(
                    Object.fromEntries(Object.entries(resolvedParams).filter(([, value]) => typeof value === "string" && value.length > 0))
                  )}
                />
                <div className="field-group relative flex-1">
                  <label htmlFor="save-view-name" className="field-label">Save view</label>
                  <div className="relative">
                    <Save className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                    <input id="save-view-name" className="field pl-9" name="name" placeholder="Name this view..." required />
                  </div>
                </div>
                <div className="flex items-end">
                  <button className="ui-button ui-button-secondary whitespace-nowrap h-[40px]" type="submit">
                    Save current view
                  </button>
                </div>
              </form>
            </div>
          </aside>
        </div>
      </section>

      {filtered.length === 0 ? (
        <section className="panel">
          <div className="p-6 md:p-8">
            <EmptyState
              title={rows.length === 0 ? "No pipeline leads yet" : "No leads match these filters"}
              description={
                rows.length === 0
                  ? "Add a campaign or import leads to populate the pipeline workspace."
                  : hasActiveFilters
                    ? "Clear or relax the current filters to bring matching leads back into view."
                    : "The current pipeline view has no records to show."
              }
              action={
                rows.length === 0 ? (
                  <LinkButton href="/campaigns/new" variant="secondary" className="h-10 px-4">
                    Create campaign
                  </LinkButton>
                ) : (
                  <LinkButton href="/pipeline" variant="secondary" className="h-10 px-4">
                    Clear filters
                  </LinkButton>
                )
              }
            />
          </div>
        </section>
      ) : view === "board" ? (
        <KanbanBoard columns={boardColumns} leads={filtered} />
      ) : (
        <PipelineListView filtered={filtered} profiles={settings.profiles} />
      )}
    </>
  );
}
