import { PageHeader } from "@/components/crm/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { markReplyHandledAction } from "@/lib/crm/actions";
import { getInboxThreads } from "@/lib/crm/queries";

export default async function InboxPage() {
  const threads = await getInboxThreads();
  const selected = threads[0] ?? null;

  return (
    <>
      <PageHeader title="Inbox" description="Shared founder reply handling with intent classification, ownership, and closed-loop lead context." />
      <div className="two-column">
        <section className="panel">
          <div className="panel-header">
            <h2>Replies</h2>
            <div className="button-row">
              <Badge tone="warning">{threads.filter((thread) => !thread.handledAt).length} unhandled</Badge>
              <Badge tone="muted">{threads.length} total</Badge>
            </div>
          </div>
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr><th>Lead</th><th>Intent</th><th>Sentiment</th><th>Received</th><th>State</th></tr></thead>
              <tbody>
                {threads.map((thread) => (
                  <tr key={thread.id}>
                    <td><a href={`/pipeline/${thread.leadId}`}><strong>{thread.businessName}</strong></a><div className="muted">{thread.fromEmail}</div></td>
                    <td><Badge tone="info">{thread.intent ?? "unclassified"}</Badge></td>
                    <td>{thread.sentiment ?? "--"}</td>
                    <td className="mono">{thread.receivedAt ? new Date(thread.receivedAt).toLocaleString() : "--"}</td>
                    <td>{thread.handledAt ? <Badge tone="success">handled</Badge> : <Badge tone="warning">open</Badge>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
        <aside className="panel">
          <div className="panel-header"><h2>Thread</h2></div>
          <div className="panel-body">
            {selected ? (
              <>
                <h3>{selected.businessName}</h3>
                <p className="muted">{selected.summary ?? "No AI summary available yet."}</p>
                <form action={markReplyHandledAction} className="form">
                  <input type="hidden" name="replyEventId" value={selected.id} />
                  <input type="hidden" name="leadId" value={selected.leadId} />
                  <label>Handling notes<textarea name="notes" rows={5} placeholder="Outcome, objection, or next step" /></label>
                  <Button type="submit">Mark handled</Button>
                </form>
              </>
            ) : (
              <div className="empty-state">No replies have arrived yet.</div>
            )}
          </div>
        </aside>
      </div>
    </>
  );
}
