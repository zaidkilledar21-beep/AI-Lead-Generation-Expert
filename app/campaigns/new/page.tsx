import { Badge } from "@/components/ui/badge";
import { MetricCard } from "@/components/ui/metric-card";
import { SettingsDiagnosticsCard } from "@/components/crm/settings-diagnostics-card";
import { CreateCampaignForm } from "../create-campaign-form";
import { getSettingsData } from "@/lib/crm/queries";

export default async function NewCampaignPage() {
  const settings = await getSettingsData();
  const sequences = settings.sequences as unknown as Array<{ id: string; name?: string | null; band?: string | null; active?: boolean }>;
  const inboxes = settings.inboxes as unknown as Array<{ id: string; email_address?: string | null; provider?: string | null; active?: boolean }>;
  const profiles = settings.profiles as unknown as Array<{ user_id: string }>;
  const activeSequences = sequences.filter((sequence) => sequence.active === true).length;
  const activeInboxes = inboxes.filter((inbox) => inbox.active === true).length;
  const activeProfiles = profiles.length;

  return (
    <div className="grid gap-5">
      <section className="panel campaigns-hero-shell">
        <div className="campaigns-hero-copy">
          <span className="crm-shell-eyebrow">Discovery setup</span>
          <div className="grid gap-3">
            <h1>New campaign</h1>
            <p>
              Define the targeting, scoring, routing, and execution rules that will drive a new lead discovery program.
            </p>
          </div>
          <div className="pipeline-chip-row">
            <span className="pipeline-chip">
              <strong>{activeInboxes}</strong> active inboxes
            </span>
            <span className="pipeline-chip">
              <strong>{activeSequences}</strong> active sequences
            </span>
            <span className="pipeline-chip">
              <strong>{activeProfiles}</strong> founder profiles
            </span>
          </div>
          <div className="campaigns-hero-actions">
            <Badge tone="info">Launch-ready when checks pass</Badge>
            <Badge tone="muted">Manual or scheduled runs</Badge>
          </div>
        </div>

        <div className="campaigns-hero-aside">
          <MetricCard label="Readiness checks" value="Server-side" delta="Dependencies are validated before launch" />
          <MetricCard label="Routing" value="Inbox + sequence" delta="Bands map into operational follow-up" />
          <MetricCard label="Run budget" value="Per campaign" delta="Lead, Places, and detail quotas" />
          <MetricCard label="Cadence" value="Manual or scheduled" delta="Choose the pace that fits the team" />
        </div>
      </section>

      <div className="campaign-form-layout">
        <main className="grid gap-5">
          <SettingsDiagnosticsCard diagnostics={settings.diagnostics} title="Campaign setup dependencies" />
          <section className="panel">
            <div className="panel-header">
              <div>
                <h2>Campaign setup</h2>
                <p>Group the campaign around identity, targeting, scoring, and automation before saving.</p>
              </div>
              <Badge tone="muted">Multi-step setup</Badge>
            </div>
            <div className="panel-body">
              <CreateCampaignForm
                sequences={sequences}
                inboxes={inboxes}
                profiles={profiles}
              />
            </div>
          </section>
        </main>

        <aside className="campaign-form-sidebar">
          <section className="crm-state-card campaign-form-note">
            <h3>What this config controls</h3>
            <p>
              A campaign defines who gets discovered, how leads are scored, how they route into outreach, and how much
              discovery capacity the system can spend.
            </p>
            <div className="grid gap-3 text-sm">
              <div className="flex items-center justify-between gap-3 border-t border-white/10 pt-3">
                <span className="muted">Discovery source</span>
                <strong>Google Places or manual import</strong>
              </div>
              <div className="flex items-center justify-between gap-3 border-t border-white/10 pt-3">
                <span className="muted">Routing</span>
                <strong>Band A / B / C</strong>
              </div>
              <div className="flex items-center justify-between gap-3 border-t border-white/10 pt-3">
                <span className="muted">Safety</span>
                <strong>Readiness checks first</strong>
              </div>
            </div>
          </section>
          <SettingsDiagnosticsCard diagnostics={settings.diagnostics} title="Ready-to-launch checklist" />
        </aside>
      </div>
    </div>
  );
}
