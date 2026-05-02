import { PageHeader } from "@/components/crm/page-header";

export default function AccountSettingsPage() {
  return (
    <>
      <PageHeader title="Account" description="Founder profile, timezone, display identity, and audit log attribution." />
      <section className="panel">
        <div className="panel-header"><h2>Founder profile</h2></div>
        <div className="panel-body">
          <div className="empty-state">Founder profiles are backed by `dashboard_users` and the CRM `founder_profiles` extension table.</div>
        </div>
      </section>
    </>
  );
}
