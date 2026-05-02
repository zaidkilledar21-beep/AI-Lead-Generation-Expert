import { PageHeader } from "@/components/crm/page-header";

export default function InboxesSettingsPage() {
  return (
    <>
      <PageHeader title="Inboxes" description="Manage sender inbox capacity, daily limits, warmup state, and active routing." />
      <section className="panel">
        <div className="panel-header"><h2>Sender inboxes</h2></div>
        <div className="panel-body">
          <div className="empty-state">Inbox management is wired for the CRM settings route. Connect this panel to `inboxes` after the CRM migration is applied.</div>
        </div>
      </section>
    </>
  );
}
