import { AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

type SettingsDiagnostics = {
  hasFailures: boolean;
  requiresSetup: boolean;
  messages: string[];
};

export function SettingsDiagnosticsCard({
  diagnostics,
  title = "Configuration warnings"
}: Readonly<{
  diagnostics?: SettingsDiagnostics | null;
  title?: string;
}>) {
  if (!diagnostics || diagnostics.messages.length === 0) return null;

  return (
    <section className="panel border border-amber-500/20 bg-amber-500/[0.04]">
      <div className="panel-header">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-amber-500/20 bg-amber-500/10 text-amber-300">
            <AlertTriangle className="h-4 w-4" />
          </div>
          <div>
            <h2>{title}</h2>
            <p className="muted">Setup gaps and safe query diagnostics for CRM configuration data.</p>
          </div>
        </div>
        <Badge tone={diagnostics.hasFailures ? "danger" : "warning"}>
          {diagnostics.hasFailures ? "Query issue" : "Setup needed"}
        </Badge>
      </div>
      <div className="panel-body">
        <div className="grid gap-3">
          {diagnostics.messages.map((message) => (
            <div key={message} className="rounded-xl border border-white/8 bg-black/20 px-4 py-3 text-sm text-white/75">
              {message}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
