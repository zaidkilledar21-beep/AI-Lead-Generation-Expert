import { PageHeader } from "@/components/crm/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { completeReviewAction } from "@/lib/crm/actions";
import { getReviewItems } from "@/lib/crm/queries";

export default async function ReviewPage({
  searchParams
}: {
  searchParams?: { item?: string };
}) {
  const items = await getReviewItems();
  const selected = items.find((item) => item.id === searchParams?.item) ?? items[0] ?? null;
  const groups = [
    { title: "Urgent", match: (priority: string) => ["urgent", "high"].includes(priority) },
    { title: "Needs Attention", match: (priority: string) => !["urgent", "high", "low"].includes(priority) },
    { title: "Low Priority", match: (priority: string) => priority === "low" }
  ];

  return (
    <>
      <PageHeader title="Review Queue" description="Resolve approval gates, ambiguous scoring, and manual review exceptions before outreach progresses." />
      <div className="two-column review-grid">
        <section>
          {groups.map((group) => {
            const groupItems = items.filter((item) => group.match(item.priority));
            return (
              <section className="panel" key={group.title}>
                <div className="panel-header">
                  <h2>{group.title}</h2>
                  <Badge tone={group.title === "Urgent" ? "danger" : "muted"}>{groupItems.length}</Badge>
                </div>
                <div className="table-wrap">
                  <table className="data-table">
                    <thead><tr><th>Lead</th><th>Reason</th><th>Priority</th><th>Created</th></tr></thead>
                    <tbody>
                      {groupItems.map((item) => (
                        <tr key={item.id} className={selected?.id === item.id ? "selected-row" : ""}>
                          <td><a href={`/review?item=${item.id}`}><strong>{item.businessName}</strong></a></td>
                          <td>{item.reason}</td>
                          <td><Badge tone={item.priority === "high" || item.priority === "urgent" ? "danger" : "warning"}>{item.priority}</Badge></td>
                          <td className="mono">{item.createdAt ? new Date(item.createdAt).toLocaleString() : "--"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            );
          })}
        </section>
        <aside className="panel">
          <div className="panel-header"><h2>Review workspace</h2></div>
          <div className="panel-body">
            {selected ? (
              <div className="stack-list">
                <div className="record-card">
                  <h3>{selected.businessName}</h3>
                  <div className="button-row">
                    <Badge tone={selected.priority === "urgent" || selected.priority === "high" ? "danger" : "warning"}>{selected.priority}</Badge>
                    {selected.leadStatus ? <Badge tone="muted">{selected.leadStatus}</Badge> : null}
                  </div>
                  <div className="muted top-gap">{selected.reason}</div>
                  <div className="muted top-gap">{[selected.city, selected.country].filter(Boolean).join(", ") || "Unknown geo"}</div>
                </div>
                <div className="button-row">
                  {["approved", "rejected", "handled"].map((decision) => (
                    <form action={completeReviewAction} key={decision}>
                      <input type="hidden" name="reviewId" value={selected.id} />
                      <input type="hidden" name="leadId" value={selected.leadId} />
                      <input type="hidden" name="decision" value={decision} />
                      <Button type="submit" variant={decision === "rejected" ? "danger" : decision === "approved" ? "primary" : "secondary"}>
                        {decision}
                      </Button>
                    </form>
                  ))}
                </div>
                <a className="ui-button ui-button-secondary" href={`/pipeline/${selected.leadId}`}>Open lead record</a>
              </div>
            ) : (
              <div className="empty-state">No review items pending.</div>
            )}
          </div>
        </aside>
      </div>
    </>
  );
}
