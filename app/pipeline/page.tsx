import { PageHeader } from "@/components/crm/page-header";
import { Badge } from "@/components/ui/badge";
import { LinkButton } from "@/components/ui/button";
import { MetricCard } from "@/components/ui/metric-card";
import { deleteFilterAction, saveFilterAction } from "@/lib/crm/actions";
import { getCrmHomeMetrics, getPipelineRows, getSavedFilters } from "@/lib/crm/queries";
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

  return (
    matchesSearch &&
    (!searchParams.band || row.effectiveBand === searchParams.band) &&
    (!searchParams.status || row.status === searchParams.status) &&
    (!searchParams.campaign || row.campaignId === searchParams.campaign) &&
    (!searchParams.country || row.country === searchParams.country) &&
    (!searchParams.niche || row.niche === searchParams.niche) &&
    (!searchParams.assigned || (searchParams.assigned === "unassigned" ? !row.assignedTo : row.assignedTo === searchParams.assigned)) &&
    (!replyFilter ||
      (replyFilter === "has_reply" && row.replyCount > 0) ||
      (replyFilter === "no_reply" && row.replyCount === 0) ||
      (replyFilter === "positive" && ["interested", "pricing_request", "call_request", "positive_interest"].includes(row.latestReplyIntent ?? "")) ||
      (replyFilter === "objection" && ["objection", "ambiguous", "manual_review_required"].includes(row.latestReplyIntent ?? ""))) &&
    (!reviewFilter ||
      (reviewFilter === "pending" && row.hasPendingReview) ||
      (reviewFilter === "reviewed" && !row.hasPendingReview))
  );
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
  { key: "pending_approval", label: "Pending Approval" },
  { key: "queued", label: "Queued" },
  { key: "in_sequence", label: "In Sequence" },
  { key: "replied", label: "Replied" },
  { key: "closed_won", label: "Closed Won" }
];

export default async function PipelinePage({
  searchParams
}: Readonly<{
  searchParams?: Record<string, string | undefined>;
}>) {
  const [metrics, rows, savedFilters] = await Promise.all([getCrmHomeMetrics(), getPipelineRows(500), getSavedFilters("pipeline")]);
  const filtered = rows.filter((row) => matchesFilter(row, searchParams ?? {}));
  const summary = summarizeRows(filtered);
  const campaigns = [...new Map(rows.filter((row) => row.campaignId).map((row) => [row.campaignId, row])).values()];
  const countries = [...new Set(rows.map((row) => row.country).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  const niches = [...new Set(rows.map((row) => row.niche).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  const view = searchParams?.view === "board" ? "board" : "list";

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
            {Object.keys(searchParams ?? {}).length > 0 && (
              <LinkButton href="/pipeline" variant="ghost" className="text-xs h-7 px-2">
                <XCircle className="w-3 h-3" />
                Clear
              </LinkButton>
            )}
          </div>
        </div>
        <div className="panel-body">
          <form className="filter-grid">
            <div className="field-group col-span-2">
              <label htmlFor="filter-q" className="field-label">Keyword Search</label>
              <div className="relative group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 group-focus-within:text-brand transition-colors" />
                <input id="filter-q" className="field pl-9 bg-black/20 border-white/10 focus:border-brand/50 focus:ring-1 focus:ring-brand/20" name="q" placeholder="Entity, email, or locale..." defaultValue={searchParams?.q ?? ""} />
              </div>
            </div>

            <div className="field-group">
              <label htmlFor="filter-band" className="field-label">Lead Band</label>
              <div className="relative group">
                <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 pointer-events-none group-focus-within:text-brand" />
                <select id="filter-band" className="field pl-9 appearance-none bg-black/20" name="band" defaultValue={searchParams?.band ?? ""}>
                  <option value="">All Bands</option>
                  {["A", "B", "C", "D"].map((band) => <option key={band} value={band}>Band {band}</option>)}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 pointer-events-none" />
              </div>
            </div>

            <div className="field-group">
              <label htmlFor="filter-status" className="field-label">Lifecycle Status</label>
              <div className="relative group">
                <CheckCircle className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 pointer-events-none group-focus-within:text-brand" />
                <select id="filter-status" className="field pl-9 appearance-none bg-black/20" name="status" defaultValue={searchParams?.status ?? ""}>
                  <option value="">All Statuses</option>
                  {[...new Set(rows.map((row) => row.status))].map((status) => (
                    <option key={status} value={status}>{status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 pointer-events-none" />
              </div>
            </div>

            <div className="field-group">
              <label htmlFor="filter-campaign" className="field-label">Active Campaign</label>
              <div className="relative group">
                <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 pointer-events-none group-focus-within:text-brand" />
                <select id="filter-campaign" className="field pl-9 appearance-none bg-black/20" name="campaign" defaultValue={searchParams?.campaign ?? ""}>
                  <option value="">All Campaigns</option>
                  {campaigns.map((row) => <option key={row.campaignId} value={row.campaignId ?? ""}>{row.campaignName}</option>)}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 pointer-events-none" />
              </div>
            </div>

            <div className="field-group">
              <label htmlFor="filter-niche" className="field-label">Market Niche</label>
              <div className="relative group">
                <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 pointer-events-none group-focus-within:text-brand" />
                <select id="filter-niche" className="field pl-9 appearance-none bg-black/20" name="niche" defaultValue={searchParams?.niche ?? ""}>
                  <option value="">All Niches</option>
                  {niches.map((niche) => <option key={niche} value={niche}>{niche}</option>)}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 pointer-events-none" />
              </div>
            </div>

            <div className="field-group">
              <label htmlFor="filter-country" className="field-label">Geography</label>
              <div className="relative group">
                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 pointer-events-none group-focus-within:text-brand" />
                <select id="filter-country" className="field pl-9 appearance-none bg-black/20" name="country" defaultValue={searchParams?.country ?? ""}>
                  <option value="">All Countries</option>
                  {countries.map((country) => <option key={country} value={country}>{country}</option>)}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 pointer-events-none" />
              </div>
            </div>

            <div className="field-group">
              <label htmlFor="filter-reply" className="field-label">Reply Intent</label>
              <div className="relative group">
                <MessageSquare className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 pointer-events-none group-focus-within:text-brand" />
                <select id="filter-reply" className="field pl-9 appearance-none bg-black/20" name="reply" defaultValue={searchParams?.reply ?? ""}>
                  <option value="">Any Intent</option>
                  <option value="no_reply">No Reply</option>
                  <option value="has_reply">Has Reply</option>
                  <option value="positive">Positive Interest</option>
                  <option value="objection">Objection / Review</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 pointer-events-none" />
              </div>
            </div>

            <div className="field-group">
              <label htmlFor="filter-review" className="field-label">Review State</label>
              <div className="relative group">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 pointer-events-none group-focus-within:text-brand" />
                <select id="filter-review" className="field pl-9 appearance-none bg-black/20" name="review" defaultValue={searchParams?.review ?? ""}>
                  <option value="">All States</option>
                  <option value="pending">Pending</option>
                  <option value="reviewed">Reviewed</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 pointer-events-none" />
              </div>
            </div>

            <div className="field-group">
              <label htmlFor="filter-owner" className="field-label">Assigned Owner</label>
              <div className="relative group">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 pointer-events-none group-focus-within:text-brand" />
                <select id="filter-owner" className="field pl-9 appearance-none bg-black/20" name="assigned" defaultValue={searchParams?.assigned ?? ""}>
                  <option value="">All Owners</option>
                  <option value="Uz">Uz</option>
                  <option value="Ziki">Ziki</option>
                  <option value="unassigned">Unassigned</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 pointer-events-none" />
              </div>
            </div>

            <input type="hidden" name="view" value={view} />
            
            <div className="flex items-end h-full">
              <button className="ui-button ui-button-primary w-full h-[40px] shadow-lg shadow-brand/20 font-bold tracking-wide" type="submit">
                RUN QUERY
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
                Object.fromEntries(Object.entries(searchParams ?? {}).filter(([, value]) => typeof value === "string" && value.length > 0))
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
        <PipelineListView filtered={filtered} />
      )}
    </>
  );
}
