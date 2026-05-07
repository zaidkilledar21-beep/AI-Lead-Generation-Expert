import { Badge } from "@/components/ui/badge";

type SystemDiagnostics = Record<
  "globalPause" | "activeInboxCount" | "activeSequenceCount" | "lastWorkflowEvent" | "lastSendEvent" | "lastReplyEvent" | "n8nDiscoveryWebhook",
  string
>;

const diagnosticRows: Array<{ key: keyof SystemDiagnostics; label: string }> = [
  { key: "globalPause", label: "Global pause state" },
  { key: "activeInboxCount", label: "Active inbox count" },
  { key: "activeSequenceCount", label: "Active sequence count" },
  { key: "lastWorkflowEvent", label: "Last workflow event" },
  { key: "lastSendEvent", label: "Last send event" },
  { key: "lastReplyEvent", label: "Last reply event" },
  { key: "n8nDiscoveryWebhook", label: "n8n discovery webhook" }
];

export function SystemDiagnosticsPanel({ diagnostics }: Readonly<{ diagnostics: SystemDiagnostics }>) {
  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <h2>System diagnostics</h2>
          <p className="muted">Operational readiness signals. Secret values are never displayed.</p>
        </div>
        <Badge tone={diagnostics.n8nDiscoveryWebhook === "Configured" ? "success" : "warning"}>
          {diagnostics.n8nDiscoveryWebhook}
        </Badge>
      </div>
      <div className="panel-body grid gap-3 md:grid-cols-2">
        {diagnosticRows.map((row) => (
          <div key={row.key} className="record-card">
            <div className="metric-label">{row.label}</div>
            <div className="text-sm text-white/80">{diagnostics[row.key]}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
