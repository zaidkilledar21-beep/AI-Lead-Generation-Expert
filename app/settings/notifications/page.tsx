import { PageHeader } from "@/components/crm/page-header";
import { updateFounderProfileAction } from "../actions";
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
                Display name
                <input name="displayName" defaultValue={profile?.display_name ?? ""} />
              </label>
              <label>
                Timezone
                <input name="timezone" defaultValue={profile?.timezone ?? "Asia/Karachi"} />
              </label>
              <label className="form-span-2">
                Telegram chat id
                <input name="telegramChatId" defaultValue={profile?.telegram_chat_id ?? ""} placeholder="Used by Telegram webhook routing" />
              </label>
            </div>
            <div className="toggle-grid">
              <label className="checkbox-row">
                <input name="positiveReplies" type="checkbox" value="true" defaultChecked={preferences.positive_replies ?? true} />
                Positive replies
              </label>
              <label className="checkbox-row">
                <input name="reviewBacklog" type="checkbox" value="true" defaultChecked={preferences.review_backlog ?? true} />
                Review backlog
              </label>
              <label className="checkbox-row">
                <input name="weeklyReport" type="checkbox" value="true" defaultChecked={preferences.weekly_report ?? true} />
                Weekly report
              </label>
            </div>
            <button className="ui-button ui-button-primary" type="submit">Save notification settings</button>
          </form>
        </div>
      </section>
    </>
  );
}
