import { PageHeader } from "@/components/crm/page-header";
import { sendTestNotificationAction, updateFounderProfileAction } from "../actions";
import { getSettingsData } from "@/lib/crm/queries";

export default async function NotificationsSettingsPage() {
  const settings = await getSettingsData();
  const profile = settings.profiles[0] ?? null;
  const preferences = (profile?.notification_preferences ?? {}) as Record<string, boolean>;

  return (
    <>
      <PageHeader title="Notifications" description="Configure founder Telegram routing and alert preferences." />
      <section className="panel">
        <div className="panel-header"><h2>Founder notification profile</h2></div>
        <div className="panel-body">
          <form action={updateFounderProfileAction} className="form">
            <div className="form-grid">
              <label>
                <span>Display name</span>
                <input name="displayName" defaultValue={profile?.display_name ?? ""} />
              </label>
              <label>
                <span>Timezone</span>
                <input name="timezone" defaultValue={profile?.timezone ?? "Asia/Karachi"} />
              </label>
              <label className="form-span-2">
                <span>Telegram chat id</span>
                <input name="telegramChatId" defaultValue={profile?.telegram_chat_id ?? ""} placeholder="Used by Telegram webhook routing" />
              </label>
            </div>
            <div className="toggle-grid">
              <label className="checkbox-row">
                <input name="positiveReplies" type="checkbox" value="true" defaultChecked={preferences.positive_replies ?? true} />
                <span>Positive replies</span>
              </label>
              <label className="checkbox-row">
                <input name="reviewBacklog" type="checkbox" value="true" defaultChecked={preferences.review_backlog ?? true} />
                <span>Review backlog</span>
              </label>
              <label className="checkbox-row">
                <input name="weeklyReport" type="checkbox" value="true" defaultChecked={preferences.weekly_report ?? true} />
                <span>Weekly report</span>
              </label>
              <label className="checkbox-row">
                <input name="draftApprovals" type="checkbox" value="true" defaultChecked={preferences.draft_approvals ?? true} />
                <span>Draft approvals</span>
              </label>
              <label className="checkbox-row">
                <input name="sendFailures" type="checkbox" value="true" defaultChecked={preferences.send_failures ?? true} />
                <span>Send failures</span>
              </label>
            </div>
            <div className="button-row">
              <button className="ui-button ui-button-primary" type="submit">Save notification settings</button>
            </div>
          </form>
          <form action={sendTestNotificationAction} className="mt-4">
            <button className="ui-button ui-button-secondary" type="submit">Queue test notification check</button>
          </form>
        </div>
      </section>
    </>
  );
}
