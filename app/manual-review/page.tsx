import { getManualReviewItems } from "@/lib/dashboard/queries";

export default async function ManualReviewPage() {
  const items = await getManualReviewItems();

  return (
    <>
      <section className="section">
        <h1>Manual Review</h1>
        <p className="muted">Band A leads, ambiguous replies, and routing exceptions that require founder judgment.</p>
      </section>

      <table className="table">
        <thead>
          <tr>
            <th>Business</th>
            <th>Reason</th>
            <th>Priority</th>
            <th>Status</th>
            <th>Created</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id}>
              <td>
                <a href={`/leads/${item.leadId}`}>{item.businessName}</a>
              </td>
              <td>{item.reason}</td>
              <td>{item.priority}</td>
              <td>{item.reviewStatus}</td>
              <td>{item.createdAt}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
