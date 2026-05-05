import { PageHeader } from "@/components/crm/page-header";
import { Badge } from "@/components/ui/badge";
import { LinkButton } from "@/components/ui/button";
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
  Filter, 
  Globe, 
  Tag, 
  Briefcase, 
  MessageSquare, 
  CheckCircle, 
  User, 
  Save, 
  XCircle,
  Hash,
  ChevronDown
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
            <LinkButton 
              href={view === "board" ? "/pipeline" : "/pipeline?view=board"}
              variant="ghost"
              className="h-10 px-5 gap-3 border border-white/10 hover:border-brand/40"
            >
              {view === "board" ? <List className="w-4 h-4" /> : <LayoutGrid className="w-4 h-4" />}
              <span className="font-semibold">{view === "board" ? "List view" : "Board view"}</span>
            </LinkButton>
          </>
        }
      />

      <section className="metric-grid" aria-label="Pipeline metrics">
        {metrics.map((metric) => (
          <MetricCard key={metric.label} label={metric.label} value={metric.value} />
        ))}
      </section>

      <section className="panel mb-8">
        <div className="panel-header bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-brand/10 border border-brand/20 flex items-center justify-center">
              <Hash className="w-4 h-4 text-brand" />
            </div>
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-white/80">Segment Summary</h2>
              <p className="text-[10px] text-white/40 font-mono">Real-time lead distribution across bands</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge tone="band-a" className="px-3 py-1.5 border-brand/20 bg-brand/5">
              <span className="opacity-60 mr-1">A:</span> {summary.bandA}
            </Badge>
            <Badge tone="band-b" className="px-3 py-1.5 border-blue-500/20 bg-blue-500/5">
              <span className="opacity-60 mr-1">B:</span> {summary.bandB}
            </Badge>
            <Badge tone="band-c" className="px-3 py-1.5 border-amber-500/20 bg-amber-500/5">
              <span className="opacity-60 mr-1">C:</span> {summary.bandC}
            </Badge>
            <Badge tone="band-d" className="px-3 py-1.5 border-white/10 bg-white/5">
              <span className="opacity-60 mr-1">D:</span> {summary.bandD}
            </Badge>
            <div className="w-px h-6 bg-white/10 mx-2" />
            <Badge tone="warning" className="px-3 py-1.5 border-amber-500/40 animate-pulse">
              {summary.awaitingReview} Action Required
            </Badge>
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted" />
            <h2>Filters</h2>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xs font-medium px-2 py-1 bg-white/5 border border-white/10 rounded text-muted">{filtered.length} leads found</span>
            {Object.keys(resolvedParams).length > 0 && (
              <LinkButton href="/pipeline" variant="ghost" className="text-xs h-7 px-2">
                <XCircle className="w-3 h-3" />
                Clear
              </LinkButton>
            )}
          </div>
        </div>
        <div className="panel-body">
          <form className="filter-grid bg-white/[0.02] p-5 rounded-xl border border-white/5 shadow-inner">
            <div className="field-group lg:col-span-2">
              <label htmlFor="filter-q" className="field-label flex items-center gap-2">
                <Search className="w-3 h-3" /> Keyword Search
              </label>
              <div className="relative group">
                <input 
                  id="filter-q" 
                  className="field w-full bg-black/40 border-white/10 focus:border-brand/50 focus:ring-1 focus:ring-brand/20 rounded-lg px-4 py-2.5 text-sm transition-all" 
                  name="q" 
                  placeholder="Entity, email, or locale..." 
                  defaultValue={resolvedParams.q ?? ""} 
                />
              </div>
            </div>

            <div className="field-group">
              <label htmlFor="filter-band" className="field-label flex items-center gap-2">
                <Tag className="w-3 h-3" /> Lead Band
              </label>
              <div className="relative group">
                <select id="filter-band" className="field w-full appearance-none bg-black/40 border-white/10 focus:border-brand/50 rounded-lg px-4 py-2.5 text-sm transition-all cursor-pointer" name="band" defaultValue={resolvedParams.band ?? ""}>
                  <option value="">All Bands</option>
                  {["A", "B", "C", "D"].map((band) => <option key={band} value={band}>Band {band}</option>)}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 pointer-events-none group-hover:text-white/50 transition-colors" />
              </div>
            </div>

            <div className="field-group">
              <label htmlFor="filter-status" className="field-label flex items-center gap-2">
                <CheckCircle className="w-3 h-3" /> Lifecycle Status
              </label>
              <div className="relative group">
                <select id="filter-status" className="field w-full appearance-none bg-black/40 border-white/10 focus:border-brand/50 rounded-lg px-4 py-2.5 text-sm transition-all cursor-pointer" name="status" defaultValue={resolvedParams.status ?? ""}>
                  <option value="">All Statuses</option>
                  {[...new Set(rows.map((row) => row.status))].map((status) => (
                    <option key={status} value={status}>{formatStatusLabel(status)}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 pointer-events-none group-hover:text-white/50 transition-colors" />
              </div>
            </div>

            <div className="field-group">
              <label htmlFor="filter-campaign" className="field-label flex items-center gap-2">
                <Briefcase className="w-3 h-3" /> Active Campaign
              </label>
              <div className="relative group">
                <select id="filter-campaign" className="field w-full appearance-none bg-black/40 border-white/10 focus:border-brand/50 rounded-lg px-4 py-2.5 text-sm transition-all cursor-pointer" name="campaign" defaultValue={resolvedParams.campaign ?? ""}>
                  <option value="">All Campaigns</option>
                  {campaigns.map((row) => <option key={row.campaignId} value={row.campaignId ?? ""}>{row.campaignName}</option>)}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 pointer-events-none group-hover:text-white/50 transition-colors" />
              </div>
            </div>

            <div className="field-group">
              <label htmlFor="filter-niche" className="field-label flex items-center gap-2">
                <Hash className="w-3 h-3" /> Market Niche
              </label>
              <div className="relative group">
                <select id="filter-niche" className="field w-full appearance-none bg-black/40 border-white/10 focus:border-brand/50 rounded-lg px-4 py-2.5 text-sm transition-all cursor-pointer" name="niche" defaultValue={resolvedParams.niche ?? ""}>
                  <option value="">All Niches</option>
                  {niches.map((niche) => <option key={niche} value={niche}>{niche}</option>)}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 pointer-events-none group-hover:text-white/50 transition-colors" />
              </div>
            </div>

            <div className="field-group">
              <label htmlFor="filter-country" className="field-label flex items-center gap-2">
                <Globe className="w-3 h-3" /> Geography
              </label>
              <div className="relative group">
                <select id="filter-country" className="field w-full appearance-none bg-black/40 border-white/10 focus:border-brand/50 rounded-lg px-4 py-2.5 text-sm transition-all cursor-pointer" name="country" defaultValue={resolvedParams.country ?? ""}>
                  <option value="">All Countries</option>
                  {countries.map((country) => <option key={country} value={country}>{country}</option>)}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 pointer-events-none group-hover:text-white/50 transition-colors" />
              </div>
            </div>

            <div className="field-group">
              <label htmlFor="filter-reply" className="field-label flex items-center gap-2">
                <MessageSquare className="w-3 h-3" /> Reply Intent
              </label>
              <div className="relative group">
                <select id="filter-reply" className="field w-full appearance-none bg-black/40 border-white/10 focus:border-brand/50 rounded-lg px-4 py-2.5 text-sm transition-all cursor-pointer" name="reply" defaultValue={resolvedParams.reply ?? ""}>
                  <option value="">Any Intent</option>
                  <option value="no_reply">No Reply</option>
                  <option value="has_reply">Has Reply</option>
                  <option value="positive">Positive Interest</option>
                  <option value="objection">Objection / Review</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 pointer-events-none group-hover:text-white/50 transition-colors" />
              </div>
            </div>

            <div className="field-group">
              <label htmlFor="filter-review" className="field-label flex items-center gap-2">
                <User className="w-3 h-3" /> Review State
              </label>
              <div className="relative group">
                <select id="filter-review" className="field w-full appearance-none bg-black/40 border-white/10 focus:border-brand/50 rounded-lg px-4 py-2.5 text-sm transition-all cursor-pointer" name="review" defaultValue={resolvedParams.review ?? ""}>
                  <option value="">All States</option>
                  <option value="pending">Pending</option>
                  <option value="reviewed">Reviewed</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 pointer-events-none group-hover:text-white/50 transition-colors" />
              </div>
            </div>

            <div className="field-group">
              <label htmlFor="filter-owner" className="field-label flex items-center gap-2">
                <User className="w-3 h-3" /> Assigned Owner
              </label>
              <div className="relative group">
                <select id="filter-owner" className="field w-full appearance-none bg-black/40 border-white/10 focus:border-brand/50 rounded-lg px-4 py-2.5 text-sm transition-all cursor-pointer" name="assigned" defaultValue={resolvedParams.assigned ?? ""}>
                  <option value="">All Owners</option>
                  {settings.profiles.map((profile) => <option key={profile.user_id} value={profile.display_name}>{profile.display_name}</option>)}
                  <option value="unassigned">Unassigned</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 pointer-events-none group-hover:text-white/50 transition-colors" />
              </div>
            </div>

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
              <input id="filter-created-from" className="field" name="created_from" type="date" defaultValue={resolvedParams.created_from ?? ""} />
            </div>

            <div className="field-group">
              <label htmlFor="filter-created-to" className="field-label">Created to</label>
              <input id="filter-created-to" className="field" name="created_to" type="date" defaultValue={resolvedParams.created_to ?? ""} />
            </div>

            <div className="field-group">
              <label htmlFor="filter-sort" className="field-label">Sort</label>
              <select id="filter-sort" className="field" name="sort" defaultValue={resolvedParams.sort ?? "activity"}>
                <option value="activity">Last activity</option>
                <option value="business">Business</option>
                <option value="score">Score</option>
                <option value="status">Status</option>
                <option value="campaign">Campaign</option>
                <option value="reply">Reply</option>
                <option value="owner">Owner</option>
                <option value="created">Created</option>
              </select>
            </div>

            <div className="field-group">
              <label htmlFor="filter-dir" className="field-label">Direction</label>
              <select id="filter-dir" className="field" name="dir" defaultValue={resolvedParams.dir ?? "desc"}>
                <option value="desc">Descending</option>
                <option value="asc">Ascending</option>
              </select>
            </div>

            <input type="hidden" name="view" value={view} />
            
            <div className="field-group flex justify-end h-full mt-2 lg:col-span-full">
              <button className="ui-button ui-button-primary w-full md:w-auto px-8 h-[44px] shadow-lg shadow-brand/20 font-bold tracking-wide rounded-lg" type="submit">
                APPLY FILTERS
              </button>
            </div>
          </form>

          {savedFilters.length > 0 && (
            <div className="saved-filter-row">
              <span className="text-[10px] font-bold text-muted uppercase tracking-widest w-full mb-1">Saved Views</span>
              {savedFilters.map((filter) => (
                <div className="saved-filter-chip group" key={filter.id}>
                  <a href={`/pipeline?${new URLSearchParams(filter.filters as Record<string, string>).toString()}`} className="hover:text-brand transition-colors">
                    {filter.name}
                  </a>
                  <form action={deleteFilterAction}>
                    <input type="hidden" name="id" value={filter.id} />
                    <button className="text-muted hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100" type="submit">
                      <XCircle className="w-3 h-3" />
                    </button>
                  </form>
                </div>
              ))}
            </div>
          )}

          <form action={saveFilterAction} className="save-filter-form border-t border-white/5 pt-4">
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
                Save Current View
              </button>
            </div>
          </form>
        </div>
      </section>


      {view === "board" ? (
        <KanbanBoard columns={boardColumns} leads={filtered} />
      ) : (
        <PipelineListView filtered={filtered} profiles={settings.profiles} />
      )}
    </>
  );
}
