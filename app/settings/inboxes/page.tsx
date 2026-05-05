import { PageHeader } from "@/components/crm/page-header";
import { createInboxAction, updateInboxActiveAction, updateInboxDailyLimitAction } from "../actions";
import { getSettingsData } from "@/lib/crm/queries";

export default async function InboxesSettingsPage() {
  const settings = await getSettingsData();

  return (
    <>
      <PageHeader title="Inboxes" description="Manage sender inbox capacity, warmup state, and daily send limits." />
      <section className="panel">
        <div className="panel-header"><h2>Add sender inbox</h2></div>
        <div className="panel-body">
          <form action={createInboxAction} className="form-grid">
            <label>
              <span>Email</span>
              <input name="emailAddress" type="email" required placeholder="founder@example.com" />
            </label>
            <label>
              <span>Provider</span>
              <select name="provider" defaultValue="gmail">
                <option value="gmail">Gmail</option>
                <option value="outlook">Outlook</option>
                <option value="smtp">SMTP</option>
              </select>
            </label>
            <label>
              <span>Daily limit</span>
              <input name="dailySendLimit" type="number" min="0" defaultValue="20" />
            </label>
            <label>
              <span>Warmup stage</span>
              <select name="warmupStage" defaultValue="new">
                <option value="new">New</option>
                <option value="warming">Warming</option>
                <option value="ready">Ready</option>
              </select>
            </label>
            <div className="self-end">
              <button className="ui-button ui-button-primary" type="submit">Add inbox</button>
            </div>
          </form>
        </div>
      </section>
      <section className="panel">
        <div className="panel-header"><h2>Sender inboxes</h2></div>
        <div className="table-wrap">
          <table className="data-table">
            <thead><tr><th>Email</th><th>Provider</th><th>Daily limit</th><th>Sent today</th><th>Warmup</th><th>Active</th><th>Last sent</th><th>Actions</th></tr></thead>
            <tbody>
              {settings.inboxes.map((inbox: any) => (
                <tr key={inbox.id}>
                  <td>{inbox.email_address}</td>
                  <td>{inbox.provider}</td>
                  <td>
                    <form action={updateInboxDailyLimitAction} className="inline-form">
                      <input type="hidden" name="inboxId" value={inbox.id} />
                      <input className="field compact-input" name="dailySendLimit" type="number" min="0" defaultValue={inbox.daily_send_limit ?? 0} />
                      <button className="ui-button ui-button-secondary" type="submit">Save</button>
                    </form>
                  </td>
                  <td className="mono">{inbox.current_daily_sent ?? 0}</td>
                  <td>{inbox.warmup_stage ?? "n/a"}</td>
                  <td>{inbox.active ? "Yes" : "No"}</td>
                  <td className="mono">{inbox.last_sent_at ? new Date(inbox.last_sent_at).toLocaleString() : "--"}</td>
                  <td>
                    <div className="button-row">
                      <form action={updateInboxActiveAction}>
                        <input type="hidden" name="inboxId" value={inbox.id} />
                        <input type="hidden" name="active" value={inbox.active ? "false" : "true"} />
                        <button className="ui-button ui-button-secondary" type="submit">{inbox.active ? "Pause" : "Resume"}</button>
                      </form>
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
