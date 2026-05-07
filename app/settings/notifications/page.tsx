import { PageHeader } from "@/components/crm/page-header";
import { ActionFeedbackForm } from "@/components/crm/action-feedback-form";
import { sendTestNotificationAction, updateNotificationSettingsAction } from "../actions";
import { getLatestNotificationEvent, getSettingsData } from "@/lib/crm/queries";

function settingValue(settings: Array<Record<string, any>>, key: string) {
  return settings.find((setting) => setting.key === key)?.value ?? {};
}

export default async function NotificationsSettingsPage() {
  const [settings, latestNotification] = await Promise.all([getSettingsData(), getLatestNotificationEvent()]);
  const notificationSettings = settingValue(settings.settings as Array<Record<string, any>>, "notification_settings") as Record<string, unknown>;
  const enabled = notificationSettings.enabled !== false;

  return (
    <>
      <PageHeader title="Notifications" description="Configure founder email notification routing and alert checks." />
      <section className="panel">
        <div className="panel-header"><h2>Email notification settings</h2></div>
        <div className="panel-body">
          <ActionFeedbackForm action={updateNotificationSettingsAction} successMessage="Notification settings saved." className="form">
            <div className="form-grid">
              <label>
                <span>Founder notification email</span>
                <input name="founderNotificationEmail" type="email" defaultValue={String(notificationSettings.founder_notification_email ?? "")} placeholder="founder@example.com" />
              </label>
              <label>
                <span>Reply alert recipient</span>
                <input name="replyAlertRecipient" type="email" defaultValue={String(notificationSettings.reply_alert_recipient ?? "")} placeholder="replies@example.com" />
              </label>
              <label>
                <span>Weekly report recipient</span>
                <input name="weeklyReportRecipient" type="email" defaultValue={String(notificationSettings.weekly_report_recipient ?? "")} placeholder="reports@example.com" />
              </label>
              <label className="checkbox-row self-end">
                <input name="enabled" type="checkbox" value="true" defaultChecked={enabled} />
                <span>Notifications enabled</span>
              </label>
            </div>
            <div className="button-row">
              <button className="ui-button ui-button-primary" type="submit">Save notification settings</button>
            </div>
          </ActionFeedbackForm>
          <ActionFeedbackForm action={sendTestNotificationAction} successMessage="Test notification queued." className="mt-4">
            <button className="ui-button ui-button-secondary" type="submit">Queue test notification check</button>
          </ActionFeedbackForm>
          <div className="grid gap-3 md:grid-cols-2 mt-4">
            <div className="record-card">
              <div className="metric-label">Slack</div>
              <p className="muted">Unavailable. Slack notifications are not implemented in this CRM.</p>
            </div>
            <div className="record-card">
              <div className="metric-label">Telegram</div>
              <p className="muted">Unavailable. Telegram credentials are not managed from this page.</p>
            </div>
          </div>
          <div className="record-card mt-4">
            <div className="metric-label">Latest test notification</div>
            {latestNotification ? (
              <>
                <strong>{String(latestNotification.status ?? "queued")}</strong>
                <p className="muted">
                  Queued {latestNotification.created_at ? new Date(String(latestNotification.created_at)).toLocaleString() : "recently"}
                  {latestNotification.recipient ? ` for ${String(latestNotification.recipient)}` : ""}
                </p>
                {latestNotification.error_message ? <p className="ui-badge ui-badge-danger">{String(latestNotification.error_message)}</p> : null}
              </>
            ) : (
              <p className="muted">No test notification has been queued yet.</p>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
