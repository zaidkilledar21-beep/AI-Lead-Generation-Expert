import { getPipelineSnapshot } from "@/lib/dashboard/queries";

export default async function PipelinePage() {
  const snapshot = await getPipelineSnapshot();

  return (
    <>
      <section className="section">
        <h1>Lead Pipeline</h1>
        <p className="muted">
          Internal operating view for discovery, scoring, review, outreach, and reply state.
        </p>
      </section>

      <section className="section grid" aria-label="Pipeline metrics">
        <div className="card">
          <div className="muted">Discovered</div>
          <div className="metric">{snapshot.metrics.discovered}</div>
        </div>
        <div className="card">
          <div className="muted">Scored</div>
          <div className="metric">{snapshot.metrics.scored}</div>
        </div>
        <div className="card">
          <div className="muted">Band A/B</div>
          <div className="metric">{snapshot.metrics.priority}</div>
        </div>
        <div className="card">
          <div className="muted">Replies</div>
          <div className="metric">{snapshot.metrics.replies}</div>
        </div>
      </section>

      <section className="section">
        <h2>Recent Leads</h2>
        <table className="table">
          <thead>
            <tr>
              <th>Business</th>
              <th>Niche</th>
              <th>Location</th>
              <th>Score</th>
              <th>Band</th>
              <th>Status</th>
              <th>Outreach</th>
            </tr>
          </thead>
          <tbody>
            {snapshot.leads.map((lead) => (
              <tr key={lead.id}>
                <td>
                  <a href={`/leads/${lead.id}`}>{lead.businessName}</a>
                </td>
                <td>{lead.niche ?? "Unknown"}</td>
                <td>{[lead.city, lead.country].filter(Boolean).join(", ") || "Unknown"}</td>
                <td>{lead.totalScore ?? "-"}</td>
                <td>
                  {lead.band ? <span className="badge">{lead.band}</span> : <span className="muted">-</span>}
                </td>
                <td>{lead.status}</td>
                <td>{lead.outreachStatus ?? "not queued"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}
