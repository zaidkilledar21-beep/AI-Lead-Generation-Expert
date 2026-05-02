import { PageHeader } from "@/components/crm/page-header";
import { Badge, bandTone } from "@/components/ui/badge";
import { LinkButton } from "@/components/ui/button";
import { MetricCard } from "@/components/ui/metric-card";
import { ScoreBar } from "@/components/ui/score-bar";
import { getCrmHomeMetrics, getPipelineRows } from "@/lib/crm/queries";

export default async function PipelinePage({
  searchParams
}: {
  searchParams?: { q?: string; band?: string; status?: string };
}) {
  const [metrics, rows] = await Promise.all([getCrmHomeMetrics(), getPipelineRows()]);
  const q = searchParams?.q?.toLowerCase().trim();
  const filtered = rows.filter((row) => {
    const matchesSearch = !q || [row.businessName, row.niche, row.city, row.country].filter(Boolean).join(" ").toLowerCase().includes(q);
    const matchesBand = !searchParams?.band || row.effectiveBand === searchParams.band;
    const matchesStatus = !searchParams?.status || row.status === searchParams.status;
    return matchesSearch && matchesBand && matchesStatus;
  });

  return (
    <>
      <PageHeader
        title="Pipeline"
        description="Operate scored leads, outreach state, reply risk, and review status from one dense CRM view."
        actions={<LinkButton href="/campaigns/new">New campaign</LinkButton>}
      />

      <section className="metric-grid" aria-label="Pipeline metrics">
        {metrics.map((metric) => (
          <MetricCard key={metric.label} label={metric.label} value={metric.value} delta={metric.delta} />
        ))}
      </section>

      <section className="panel">
        <div className="panel-header">
          <h2>Lead list</h2>
          <form className="filter-row">
            <input className="field" name="q" placeholder="Search leads" defaultValue={searchParams?.q ?? ""} />
            <select className="field" name="band" defaultValue={searchParams?.band ?? ""}>
              <option value="">All bands</option>
              {["A", "B", "C", "D"].map((band) => <option key={band}>{band}</option>)}
            </select>
            <select className="field" name="status" defaultValue={searchParams?.status ?? ""}>
              <option value="">All statuses</option>
              {["new", "scored", "review_pending", "queued", "drafted", "replied_interested", "closed_won", "closed_lost"].map((status) => (
                <option key={status}>{status}</option>
              ))}
            </select>
            <button className="ui-button ui-button-secondary" type="submit">Apply</button>
          </form>
        </div>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Business</th>
                <th>Score</th>
                <th>Status</th>
                <th>Campaign</th>
                <th>Geo</th>
                <th>Reply</th>
                <th>Owner</th>
                <th>Next send</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => (
                <tr key={row.id}>
                  <td>
                    <a href={`/pipeline/${row.id}`}><strong>{row.businessName}</strong></a>
                    <div className="muted">{row.niche ?? "No niche"}</div>
                  </td>
                  <td>
                    <div className="button-row">
                      <Badge tone={bandTone(row.effectiveBand)}>{row.effectiveBand ?? "NA"}</Badge>
                      <span className="mono">{row.score ?? "--"}</span>
                    </div>
                    <ScoreBar value={row.score ?? 0} />
                  </td>
                  <td><Badge tone="info">{row.status}</Badge></td>
                  <td>{row.campaignName ?? <span className="muted">Unassigned</span>}</td>
                  <td>{[row.city, row.country].filter(Boolean).join(", ") || <span className="muted">Unknown</span>}</td>
                  <td>{row.replyIntent ? <Badge tone="warning">{row.replyIntent}</Badge> : <span className="muted">None</span>}</td>
                  <td>{row.assignedTo ?? <span className="muted">Unassigned</span>}</td>
                  <td className="mono">{row.nextSendAt ? new Date(row.nextSendAt).toLocaleDateString() : "--"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
