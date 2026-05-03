import { PageHeader } from "@/components/crm/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { markReplyHandledAction } from "@/lib/crm/actions";
import { getInboxThreads } from "@/lib/crm/queries";

export default async function InboxPage({
  searchParams
}: {
  searchParams?: { thread?: string; tab?: string };
}) {
  const threads = await getInboxThreads();
  const tab = searchParams?.tab ?? "all";
  const filtered = threads.filter((thread) => {
    if (tab === "all") return true;
    if (tab === "unhandled") return thread.isUnhandled;
    if (tab === "positive") return ["interested", "pricing_request", "call_request", "positive_interest"].includes(thread.intent ?? "");
    if (tab === "review") return thread.requiresHumanReview;
    return true;
  });
  const selected = filtered.find((thread) => thread.id === searchParams?.thread) ?? filtered[0] ?? null;

  return (
    <>
      <PageHeader title="Inbox" description="Shared founder inbox with full reply context, suggested next action, and one-click handling." />
      <section className="panel">
        <div className="panel-header">
          <h2>Views</h2>
          <div className="button-row">
            <a className={`ui-button ${tab === "all" ? "ui-button-primary" : "ui-button-secondary"}`} href="/inbox?tab=all">All</a>
            <a className={`ui-button ${tab === "unhandled" ? "ui-button-primary" : "ui-button-secondary"}`} href="/inbox?tab=unhandled">Unhandled</a>
            <a className={`ui-button ${tab === "positive" ? "ui-button-primary" : "ui-button-secondary"}`} href="/inbox?tab=positive">Positive</a>
            <a className={`ui-button ${tab === "review" ? "ui-button-primary" : "ui-button-secondary"}`} href="/inbox?tab=review">Needs review</a>
          </div>
        </div>
      </section>
      <div className="two-column inbox-grid">
        <section className="panel">
          <div className="panel-header">
            <h2>Replies</h2>
            <div className="button-row">
              <Badge tone="warning">{threads.filter((thread) => thread.isUnhandled).length} unhandled</Badge>
              <Badge tone="muted">{filtered.length} visible</Badge>
            </div>
          </div>
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr><th>Lead</th><th>Intent</th><th>Campaign</th><th>Received</th><th>State</th></tr></thead>
              <tbody>
                {filtered.map((thread) => (
                  <tr key={thread.id} className={selected?.id === thread.id ? "selected-row" : ""}>
                    <td>
                      <a href={`/inbox?tab=${tab}&thread=${thread.id}`}><strong>{thread.businessName}</strong></a>
                      <div className="muted">{thread.fromEmail ?? "Unknown sender"}</div>
                    </td>
                    <td><Badge tone="info">{thread.intent ?? "unclassified"}</Badge></td>
                    <td>{thread.campaignName ?? <span className="muted">No campaign</span>}</td>
                    <td className="mono">{thread.receivedAt ? new Date(thread.receivedAt).toLocaleString() : "--"}</td>
                    <td>{thread.isUnhandled ? <Badge tone="warning">Open</Badge> : <Badge tone="success">Handled</Badge>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
        <aside className="panel">
          <div className="panel-header"><h2>Thread workspace</h2></div>
          <div className="panel-body">
            {selected ? (
              <div className="stack-list">
                <div className="record-card">
                  <h3>{selected.businessName}</h3>
                  <div className="button-row">
                    <Badge tone="info">{selected.intent ?? "unclassified"}</Badge>
                    <Badge tone={selected.isUnhandled ? "warning" : "success"}>{selected.isUnhandled ? "Open" : "Handled"}</Badge>
                    {selected.band ? <Badge tone="muted">Band {selected.band}</Badge> : null}
                  </div>
                  <p>{selected.body || selected.excerpt || "No reply body stored."}</p>
                  <div className="muted">Summary: {selected.summary ?? "No AI summary available."}</div>
                  <div className="muted top-gap">Suggested next action: {selected.suggestedNextAction ?? "No suggestion yet."}</div>
                </div>
                <div className="record-card">
                  <strong>AI draft reply</strong>
                  <p>{selected.aiDraftReply ?? "No draft reply available yet."}</p>
                </div>
                <form action={markReplyHandledAction} className="form">
                  <input type="hidden" name="replyEventId" value={selected.id} />
                  <input type="hidden" name="leadId" value={selected.leadId} />
                  <label>Handling notes<textarea name="notes" rows={5} placeholder="Outcome, pricing sent, booked call, objection noted." /></label>
                  <Button type="submit">Mark handled</Button>
                </form>
              </div>
            ) : (
              <div className="empty-state">No replies match this view.</div>
            )}
          </div>
        </aside>
      </div>
    </>
  );
}
