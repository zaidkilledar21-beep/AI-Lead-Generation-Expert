import { PageHeader } from "@/components/crm/page-header";
import { Badge, bandTone } from "@/components/ui/badge";
import { LinkButton } from "@/components/ui/button";
import { MetricCard } from "@/components/ui/metric-card";
import { ScoreBar } from "@/components/ui/score-bar";
import { approveLeadAction, changeLeadStatusAction, deleteFilterAction, saveFilterAction } from "@/lib/crm/actions";
import { getCrmHomeMetrics, getPipelineRows, getSavedFilters } from "@/lib/crm/queries";

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
}: {
  searchParams?: Record<string, string | undefined>;
}) {
  const [metrics, rows, savedFilters] = await Promise.all([getCrmHomeMetrics(), getPipelineRows(500), getSavedFilters("pipeline")]);
  const filtered = rows.filter((row) => matchesFilter(row, searchParams ?? {}));
  const summary = summarizeRows(filtered);
  const campaigns = [...new Map(rows.filter((row) => row.campaignId).map((row) => [row.campaignId, row])).values()];
  const countries = [...new Set(rows.map((row) => row.country).filter(Boolean))].sort();
  const niches = [...new Set(rows.map((row) => row.niche).filter(Boolean))].sort();
  const view = searchParams?.view === "board" ? "board" : "list";

  return (
    <>
      <PageHeader
        title="Pipeline"
        description="Operate leads by band, review state, reply state, outreach stage, and campaign context."
        actions={
          <div className="button-row">
            <LinkButton href="/campaigns/new" variant="secondary">New campaign</LinkButton>
            <LinkButton href={view === "board" ? "/pipeline" : "/pipeline?view=board"}>{view === "board" ? "List view" : "Board view"}</LinkButton>
          </div>
        }
      />

      <section className="metric-grid" aria-label="Pipeline metrics">
        {metrics.map((metric) => (
          <MetricCard key={metric.label} label={metric.label} value={metric.value} />
        ))}
      </section>

      <section className="panel">
        <div className="panel-header">
          <h2>Summary</h2>
          <div className="button-row">
            <Badge tone="band-a">Band A {summary.bandA}</Badge>
            <Badge tone="band-b">Band B {summary.bandB}</Badge>
            <Badge tone="band-c">Band C {summary.bandC}</Badge>
            <Badge tone="band-d">Band D {summary.bandD}</Badge>
            <Badge tone="warning">Awaiting review {summary.awaitingReview}</Badge>
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <h2>Filters</h2>
          <span className="muted">{filtered.length} leads</span>
        </div>
        <div className="panel-body">
          <form className="filter-grid">
            <input className="field" name="q" placeholder="Search business, email, city" defaultValue={searchParams?.q ?? ""} />
            <select className="field" name="band" defaultValue={searchParams?.band ?? ""}>
              <option value="">All bands</option>
              {["A", "B", "C", "D"].map((band) => <option key={band}>{band}</option>)}
            </select>
            <select className="field" name="status" defaultValue={searchParams?.status ?? ""}>
              <option value="">All statuses</option>
              {[...new Set(rows.map((row) => row.status))].map((status) => <option key={status}>{status}</option>)}
            </select>
            <select className="field" name="campaign" defaultValue={searchParams?.campaign ?? ""}>
              <option value="">All campaigns</option>
              {campaigns.map((row) => <option key={row.campaignId} value={row.campaignId ?? ""}>{row.campaignName}</option>)}
            </select>
            <select className="field" name="niche" defaultValue={searchParams?.niche ?? ""}>
              <option value="">All niches</option>
              {niches.map((niche) => <option key={niche}>{niche}</option>)}
            </select>
            <select className="field" name="country" defaultValue={searchParams?.country ?? ""}>
              <option value="">All countries</option>
              {countries.map((country) => <option key={country}>{country}</option>)}
            </select>
            <select className="field" name="reply" defaultValue={searchParams?.reply ?? ""}>
              <option value="">All replies</option>
              <option value="no_reply">No reply</option>
              <option value="has_reply">Has reply</option>
              <option value="positive">Positive reply</option>
              <option value="objection">Objection / review</option>
            </select>
            <select className="field" name="review" defaultValue={searchParams?.review ?? ""}>
              <option value="">All review states</option>
              <option value="pending">Pending review</option>
              <option value="reviewed">Reviewed</option>
            </select>
            <select className="field" name="assigned" defaultValue={searchParams?.assigned ?? ""}>
              <option value="">All owners</option>
              <option value="Uz">Uz</option>
              <option value="Ziki">Ziki</option>
              <option value="unassigned">Unassigned</option>
            </select>
            <input type="hidden" name="view" value={view} />
            <button className="ui-button ui-button-secondary" type="submit">Apply filters</button>
          </form>
          <div className="saved-filter-row">
            {savedFilters.map((filter) => (
              <div className="saved-filter-chip" key={filter.id}>
                <a href={`/pipeline?${new URLSearchParams(filter.filters as Record<string, string>).toString()}`}>{filter.name}</a>
                <form action={deleteFilterAction}>
                  <input type="hidden" name="id" value={filter.id} />
                  <button className="ui-button ui-button-ghost" type="submit">Delete</button>
                </form>
              </div>
            ))}
          </div>
          <form action={saveFilterAction} className="save-filter-form">
            <input type="hidden" name="viewKey" value="pipeline" />
            <input
              type="hidden"
              name="filters"
              value={JSON.stringify(
                Object.fromEntries(Object.entries(searchParams ?? {}).filter(([, value]) => typeof value === "string" && value.length > 0))
              )}
            />
            <input className="field" name="name" placeholder="Save current filter as..." />
            <button className="ui-button ui-button-secondary" type="submit">Save view</button>
          </form>
        </div>
      </section>

      {view === "board" ? (
        <section className="board board-wide">
          {boardColumns.map((column) => {
            const cards = filtered.filter((row) => row.status === column.key);
            return (
              <div className="board-column" key={column.key}>
                <div className="panel-header">
                  <h3>{column.label}</h3>
                  <Badge tone="muted">{cards.length}</Badge>
                </div>
                {cards.map((row) => (
                  <div className="board-card" key={row.id}>
                    <a href={`/pipeline/${row.id}`}><strong>{row.businessName}</strong></a>
                    <div className="muted">{row.niche ?? "No niche"}</div>
                    <div className="button-row top-gap">
                      <Badge tone={bandTone(row.effectiveBand)}>{row.effectiveBand ?? "NA"}</Badge>
                      <span className="mono">{row.score ?? "--"}</span>
                    </div>
                    <div className="muted top-gap">{row.campaignName ?? "No campaign"}</div>
                  </div>
                ))}
              </div>
            );
          })}
        </section>
      ) : (
        <section className="panel">
          <div className="panel-header">
            <h2>Lead list</h2>
            <span className="muted">Row actions are live; bulk actions are the next safe extension point.</span>
          </div>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Business</th>
                  <th>Score</th>
                  <th>Status</th>
                  <th>Campaign</th>
                  <th>Reply</th>
                  <th>Owner</th>
                  <th>Review</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <a href={`/pipeline/${row.id}`}><strong>{row.businessName}</strong></a>
                      <div className="muted">{[row.city, row.country].filter(Boolean).join(", ") || "Unknown geo"}</div>
                    </td>
                    <td>
                      <div className="button-row">
                        <Badge tone={bandTone(row.effectiveBand)}>{row.effectiveBand ?? "NA"}</Badge>
                        <span className="mono">{row.score ?? "--"}</span>
                      </div>
                      <ScoreBar value={row.score ?? 0} band={row.effectiveBand ?? undefined} />
                    </td>
                    <td><Badge tone="info">{row.status}</Badge></td>
                    <td>{row.campaignName ?? <span className="muted">Unassigned</span>}</td>
                    <td>
                      {row.latestReplyIntent ? <Badge tone="warning">{row.latestReplyIntent}</Badge> : <span className="muted">No reply</span>}
                      {row.hasUnhandledReply ? <div className="muted">Unhandled</div> : null}
                    </td>
                    <td>{row.assignedTo ?? <span className="muted">Unassigned</span>}</td>
                    <td>{row.hasPendingReview ? <Badge tone="danger">Pending</Badge> : <Badge tone="muted">Reviewed</Badge>}</td>
                    <td>
                      <div className="stacked-actions">
                        {!row.approvedForOutreach ? (
                          <form action={approveLeadAction}>
                            <input type="hidden" name="leadId" value={row.id} />
                            <button className="ui-button ui-button-primary" type="submit">Approve</button>
                          </form>
                        ) : (
                          <Badge tone="success">Approved</Badge>
                        )}
                        <div className="button-row">
                          <form action={changeLeadStatusAction}>
                            <input type="hidden" name="leadId" value={row.id} />
                            <input type="hidden" name="status" value="paused" />
                            <button className="ui-button ui-button-secondary" type="submit">Pause</button>
                          </form>
                          <form action={changeLeadStatusAction}>
                            <input type="hidden" name="leadId" value={row.id} />
                            <input type="hidden" name="status" value="archived" />
                            <button className="ui-button ui-button-danger" type="submit">Archive</button>
                          </form>
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </>
  );
}
