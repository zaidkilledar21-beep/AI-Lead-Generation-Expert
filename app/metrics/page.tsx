import { getMetricsSnapshot } from "@/lib/dashboard/queries";

export default async function MetricsPage() {
  const metrics = await getMetricsSnapshot();

  return (
    <>
      <section className="section">
        <h1>Metrics</h1>
        <p className="muted">Weekly learning view for niches, routing quality, outreach, replies, and conversion.</p>
      </section>

      <section className="grid">
        {metrics.map((metric) => (
          <div className="card" key={metric.label}>
            <div className="muted">{metric.label}</div>
            <div className="metric">{metric.value}</div>
          </div>
        ))}
      </section>
    </>
  );
}
