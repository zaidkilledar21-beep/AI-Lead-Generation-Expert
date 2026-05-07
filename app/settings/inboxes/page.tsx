import { PageHeader } from "@/components/crm/page-header";
import { ActionFeedbackForm } from "@/components/crm/action-feedback-form";
import { Badge } from "@/components/ui/badge";
import { CrmSelect } from "@/components/ui/crm-select";
import { archiveInboxAction, createInboxAction, updateInboxAction, updateInboxActiveAction } from "../actions";
import { getSettingsData } from "@/lib/crm/queries";

const providerOptions = [
  { value: "gmail", label: "Gmail" },
  { value: "google_workspace", label: "Google Workspace" },
  { value: "outlook", label: "Outlook" },
  { value: "smtp", label: "SMTP" }
];

const warmupOptions = [
  { value: "new", label: "New" },
  { value: "warming", label: "Warming" },
  { value: "ready", label: "Ready" },
  { value: "paused", label: "Paused" },
  { value: "week_1", label: "Week 1" },
  { value: "week_2", label: "Week 2" },
  { value: "week_3", label: "Week 3" },
  { value: "mature", label: "Mature" }
];

export default async function InboxesSettingsPage() {
  const settings = await getSettingsData();

  return (
    <>
      <PageHeader title="Inboxes" description="Manage sender inbox capacity, warmup state, and daily send limits. Gmail OAuth credentials are managed in n8n." />
      <section className="panel">
        <div className="panel-header"><h2>Add sender inbox</h2></div>
        <div className="panel-body">
          <ActionFeedbackForm action={createInboxAction} successMessage="Inbox added." className="form-grid">
            <label>
              <span>Email</span>
              <input name="emailAddress" type="email" required placeholder="founder@example.com" />
            </label>
            <label>
              <span>Display label</span>
              <input name="displayLabel" placeholder="Founder Gmail" />
            </label>
            <label>
              <span>Provider</span>
              <CrmSelect
                name="provider"
                defaultValue="gmail"
                options={providerOptions}
              />
            </label>
            <label>
              <span>Daily limit</span>
              <input name="dailySendLimit" type="number" min="0" defaultValue="20" />
            </label>
            <label>
              <span>Warmup stage</span>
              <CrmSelect
                name="warmupStage"
                defaultValue="new"
                options={warmupOptions}
              />
            </label>
            <div className="self-end">
              <button className="ui-button ui-button-primary" type="submit">Add inbox</button>
            </div>
          </ActionFeedbackForm>
          <p className="muted mt-4">CRM manages inbox capacity only. Credentials and mailbox auth remain delegated to n8n.</p>
        </div>
      </section>
      <section className="panel">
        <div className="panel-header"><h2>Sender inboxes</h2></div>
        <div className="table-wrap">
          <table className="data-table">
            <thead><tr><th>Email</th><th>Settings</th><th>Sent today</th><th>Status</th><th>Last sent</th><th>Actions</th></tr></thead>
            <tbody>
              {settings.inboxes.map((inbox: any) => (
                <tr key={inbox.id}>
                  <td>
                    <div className="font-medium text-white/85">{inbox.display_label || inbox.email_address}</div>
                    <div className="text-xs text-white/45">{inbox.email_address}</div>
                  </td>
                  <td>
                    <ActionFeedbackForm action={updateInboxAction} successMessage="Inbox updated." className="grid gap-2">
                      <input type="hidden" name="inboxId" value={inbox.id} />
                      <input className="field compact-input" name="displayLabel" defaultValue={inbox.display_label ?? ""} placeholder="Display label" disabled={inbox.archived} />
                      <CrmSelect name="provider" defaultValue={inbox.provider ?? "gmail"} options={providerOptions} disabled={inbox.archived} />
                      <input className="field compact-input" name="dailySendLimit" type="number" min="0" defaultValue={inbox.daily_send_limit ?? 0} />
                      <CrmSelect name="warmupStage" defaultValue={inbox.warmup_stage ?? "new"} options={warmupOptions} disabled={inbox.archived} />
                      <label className="checkbox-row">
                        <input name="active" type="checkbox" value="true" defaultChecked={Boolean(inbox.active)} disabled={inbox.archived} />
                        <span>Active</span>
                      </label>
                      <button className="ui-button ui-button-secondary" type="submit" disabled={inbox.archived}>Save</button>
                    </ActionFeedbackForm>
                  </td>
                  <td className="mono">{inbox.current_daily_sent ?? 0}</td>
                  <td>
                    <div className="grid gap-1">
                      <Badge tone={inbox.archived ? "muted" : inbox.active ? "success" : "warning"}>{inbox.archived ? "Archived" : inbox.active ? "Active" : "Paused"}</Badge>
                      {inbox.active_campaign_assignments > 0 ? <span className="text-xs text-amber-300">{inbox.active_campaign_assignments} active campaign assignments</span> : null}
                    </div>
                  </td>
                  <td className="mono">{inbox.last_sent_at ? new Date(inbox.last_sent_at).toLocaleString() : "--"}</td>
                  <td>
                    <div className="button-row">
                      <ActionFeedbackForm action={updateInboxActiveAction} successMessage={inbox.active ? "Inbox paused." : "Inbox resumed."}>
                        <input type="hidden" name="inboxId" value={inbox.id} />
                        <input type="hidden" name="active" value={inbox.active ? "false" : "true"} />
                        <button className="ui-button ui-button-secondary" type="submit" disabled={inbox.archived}>{inbox.active ? "Pause" : "Resume"}</button>
                      </ActionFeedbackForm>
                      <ActionFeedbackForm action={archiveInboxAction} successMessage="Inbox archived.">
                        <input type="hidden" name="inboxId" value={inbox.id} />
                        {inbox.active_campaign_assignments > 0 ? (
                          <label className="checkbox-row max-w-xs">
                            <input name="confirmAssignedArchive" type="checkbox" value="true" />
                            <span>This inbox is assigned to active campaigns. Archiving it may prevent future sends for those campaigns.</span>
                          </label>
                        ) : null}
                        <button className="ui-button ui-button-danger" type="submit" disabled={inbox.archived}>Archive</button>
                      </ActionFeedbackForm>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
