import { PageHeader } from "@/components/crm/page-header";

export default function NotificationsSettingsPage() {
  return (
    <>
      <PageHeader title="Notifications" description="Configure Telegram alerts for positive replies, review backlog, campaign failures, and weekly reports." />
      <section className="panel">
        <div className="panel-header"><h2>Telegram</h2></div>
        <div className="panel-body">
          <div className="empty-state">Store bot tokens in Vercel/n8n environment variables; only chat routing and preferences should be editable here.</div>
        </div>
      </section>
    </>
  );
}
