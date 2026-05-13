type AnalyticsDiagnostics = {
  lastLeadDiscoveredAt: string | null;
  lastEmailSentAt: string | null;
  lastReplyAt: string | null;
  workflowEventCount: number | null;
  activeCampaignCount: number | null;
  activeInboxCount: number | null;
};

function formatDiagnosticValue(value: string | number | null) {
  if (value == null) return "Unavailable";
  if (typeof value === "number") return value.toLocaleString();
  return new Date(value).toLocaleString();
}

export function AnalyticsDiagnosticsPanel({
  diagnostics
}: Readonly<{
  diagnostics: AnalyticsDiagnostics;
}>) {
  const rows = [
    ["Last lead discovered", diagnostics.lastLeadDiscoveredAt],
    ["Last email sent", diagnostics.lastEmailSentAt],
    ["Last reply", diagnostics.lastReplyAt],
    ["Workflow events in range", diagnostics.workflowEventCount],
    ["Active campaigns", diagnostics.activeCampaignCount],
    ["Active inboxes", diagnostics.activeInboxCount]
  ] as const;

  return (
    <section className="panel glass-panel mt-6">
      <div className="panel-header items-start">
        <div>
          <h2>Analytics diagnostics</h2>
          <p>Freshness checks for the data feeding this dashboard.</p>
        </div>
      </div>
      <div className="grid grid-cols-1 divide-y divide-white/10 md:grid-cols-3 md:divide-x md:divide-y-0">
        {rows.map(([label, value]) => (
          <div key={label} className="min-h-[92px] bg-white/[0.012] p-4">
            <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/35">{label}</div>
            <div className="mt-2 text-sm font-semibold leading-6 text-white/85">{formatDiagnosticValue(value)}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
