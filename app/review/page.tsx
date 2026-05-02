import { PageHeader } from "@/components/crm/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { completeReviewAction } from "@/lib/crm/actions";
import { getReviewItems } from "@/lib/crm/queries";

export default async function ReviewPage() {
  const items = await getReviewItems();
  const groups = [
    { title: "Urgent", match: (priority: string) => ["urgent", "high"].includes(priority) },
    { title: "Needs Attention", match: (priority: string) => !["urgent", "high", "low"].includes(priority) },
    { title: "Low Priority", match: (priority: string) => priority === "low" }
  ];

  return (
    <>
      <PageHeader title="Review Queue" description="Resolve blocked, ambiguous, stale, or approval-required workflow items before outreach progresses." />
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
                <thead><tr><th>Lead</th><th>Reason</th><th>Priority</th><th>Created</th><th>Actions</th></tr></thead>
                <tbody>
                  {groupItems.map((item) => (
                    <tr key={item.id}>
                      <td><a href={`/pipeline/${item.leadId}`}><strong>{item.businessName}</strong></a></td>
                      <td>{item.reason}</td>
                      <td><Badge tone={item.priority === "high" || item.priority === "urgent" ? "danger" : "warning"}>{item.priority}</Badge></td>
                      <td className="mono">{item.createdAt ? new Date(item.createdAt).toLocaleDateString() : "--"}</td>
                      <td>
                        <div className="button-row">
                          {["approved", "rejected", "handled"].map((decision) => (
                            <form action={completeReviewAction} key={decision}>
                              <input type="hidden" name="reviewId" value={item.id} />
                              <input type="hidden" name="leadId" value={item.leadId} />
                              <input type="hidden" name="decision" value={decision} />
                              <Button type="submit" variant={decision === "rejected" ? "danger" : "secondary"}>{decision}</Button>
                            </form>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        );
      })}
    </>
  );
}
