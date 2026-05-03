import { PageHeader } from "@/components/crm/page-header";
import { updateFounderProfileAction } from "../actions";
import { getSettingsData } from "@/lib/crm/queries";

export default async function AccountSettingsPage() {
  const settings = await getSettingsData();
  const profile = settings.profiles[0] ?? null;

  return (
    <>
      <PageHeader title="Account" description="Founder profile, timezone, and audit attribution." />
      <section className="panel">
        <div className="panel-header"><h2>Founder profile</h2></div>
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
                <input name="telegramChatId" defaultValue={profile?.telegram_chat_id ?? ""} />
              </label>
            </div>
            <input type="hidden" name="positiveReplies" value="true" />
            <input type="hidden" name="reviewBacklog" value="true" />
            <input type="hidden" name="weeklyReport" value="true" />
            <button className="ui-button ui-button-primary" type="submit">Save profile</button>
          </form>
        </div>
      </section>
    </>
  );
}
