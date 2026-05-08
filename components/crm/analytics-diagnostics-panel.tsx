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
      <div className="panel-header">
        <h2>Analytics diagnostics</h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {rows.map(([label, value]) => (
          <div key={label} className="rounded-lg border border-white/10 bg-white/[0.02] p-4">
            <div className="text-[10px] font-bold uppercase tracking-widest text-white/35">{label}</div>
            <div className="mt-2 text-sm font-semibold text-white/85">{formatDiagnosticValue(value)}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
