import { notFound } from "next/navigation";
import { getLeadDetail } from "@/lib/dashboard/queries";
import { approveLeadForOutreach, archiveLead, pauseLead, unsubscribeLead } from "./review-actions";

export default async function LeadDetailPage({ params }: { params: { id: string } }) {
  const detail = await getLeadDetail(params.id);

  if (!detail) {
    notFound();
  }

  return (
    <>
      <section className="section">
        <h1>{detail.businessName}</h1>
        <p className="muted">
          {[detail.niche, detail.city, detail.country].filter(Boolean).join(" | ") || "Lead detail"}
        </p>
      </section>

      <section className="section button-row">
        <form action={approveLeadForOutreach.bind(null, detail.id)}>
          <button className="button" type="submit">Approve outreach</button>
        </form>
        <form action={pauseLead.bind(null, detail.id)}>
          <button className="button" type="submit">Pause</button>
        </form>
        <form action={unsubscribeLead.bind(null, detail.id)}>
          <button className="button" type="submit">Unsubscribe</button>
        </form>
        <form action={archiveLead.bind(null, detail.id)}>
          <button className="button" type="submit">Archive</button>
        </form>
      </section>

      <section className="section grid">
        <div className="card">
          <h2>Profile</h2>
          <p>Website: {detail.website ? <a href={detail.website}>{detail.website}</a> : "Not found"}</p>
          <p>Email: {detail.email ?? "Not found"}</p>
          <p>Phone: {detail.phone ?? "Not found"}</p>
          <p>Status: {detail.status}</p>
        </div>
        <div className="card">
          <h2>Score</h2>
          <p className="metric">{detail.score?.totalScore ?? "-"}</p>
          <p>Band: {detail.score?.band ?? "-"}</p>
          <p>Confidence: {detail.score?.confidence ?? "-"}</p>
        </div>
        <div className="card">
          <h2>Hypothesis</h2>
          <p>{detail.hypothesis?.outreachHook ?? "No hypothesis saved yet."}</p>
        </div>
      </section>

      <section className="section">
        <h2>Evidence</h2>
        <table className="table">
          <thead>
            <tr>
              <th>Metric</th>
              <th>Score</th>
              <th>Evidence</th>
              <th>Missing Data</th>
            </tr>
          </thead>
          <tbody>
            {detail.evidence.map((item) => (
              <tr key={item.id}>
                <td>{item.metricName}</td>
                <td>{item.score}/{item.maxScore}</td>
                <td>{item.evidence ?? "-"}</td>
                <td>{item.missingData ?? "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}
