import { PageHeader } from "@/components/crm/page-header";
import { ActionFeedbackForm } from "@/components/crm/action-feedback-form";
import { SettingsDiagnosticsCard } from "@/components/crm/settings-diagnostics-card";
import { SystemDiagnosticsPanel } from "@/components/crm/system-diagnostics-panel";
import { Badge } from "@/components/ui/badge";
import { CrmSelect } from "@/components/ui/crm-select";
import { getSettingsData, getSystemDiagnostics } from "@/lib/crm/queries";
import { updateGlobalOutreachSettingsAction } from "./actions";

function settingValue(settings: Array<Record<string, any>>, key: string) {
  return settings.find((setting) => setting.key === key)?.value ?? {};
}

export default async function SettingsIndexPage() {
  const [settings, systemDiagnostics] = await Promise.all([getSettingsData(), getSystemDiagnostics()]);
  const globalOutreach = settingValue(settings.settings as Array<Record<string, any>>, "global_outreach");
  const paused = Boolean(globalOutreach.paused);
  const dailyCap = Number(globalOutreach.daily_cap ?? globalOutreach.dailyCap ?? 0);

  return (
    <>
      <PageHeader title="Settings" description="Global CRM workflow controls for the internal founder operating model." />
      <SettingsDiagnosticsCard diagnostics={settings.diagnostics} />
      <SystemDiagnosticsPanel diagnostics={systemDiagnostics} />
      <section className="metric-grid">
        <div className="metric-card">
          <div className="metric-label">Global outreach</div>
          <div className="metric-value"><Badge tone={paused ? "warning" : "success"}>{paused ? "Paused" : "Allowed"}</Badge></div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Sender inboxes</div>
          <div className="metric-value">{settings.inboxes.length}</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Founder profiles</div>
          <div className="metric-value">{settings.profiles.length}</div>
        </div>
      </section>

      <section className="panel">
        <div className="panel-header"><h2>Global outreach controls</h2></div>
        <div className="panel-body">
          <ActionFeedbackForm action={updateGlobalOutreachSettingsAction} successMessage="Global controls saved." className="form">
            <div className="form-grid">
              <label>
                <span>Outreach state</span>
                <CrmSelect
                  name="paused"
                  defaultValue={paused ? "true" : "false"}
                  options={[
                    { value: "false", label: "Sending allowed", description: "WF-06 may continue scheduler-owned sending." },
                    { value: "true", label: "Pause all scheduled sending", description: "Keep CRM live while blocking workflow send execution." }
                  ]}
                />
              </label>
              <label>
                <span>Daily cap override</span>
                <input name="dailyCap" type="number" min="0" defaultValue={Number.isFinite(dailyCap) ? dailyCap : 0} />
              </label>
            </div>
            <button className="ui-button ui-button-primary" type="submit">Save global controls</button>
          </ActionFeedbackForm>
        </div>
      </section>

      <section className="panel">
        <div className="panel-header"><h2>Settings areas</h2></div>
        <div className="button-row panel-body">
          <a className="ui-button ui-button-secondary" href="/settings/inboxes">Inboxes</a>
          <a className="ui-button ui-button-secondary" href="/settings/notifications">Notifications</a>
          <a className="ui-button ui-button-secondary" href="/settings/account">Account</a>
          <a className="ui-button ui-button-secondary" href="/settings/sequences">Sequences</a>
        </div>
      </section>
    </>
  );
}
