import { PageHeader } from "@/components/crm/page-header";
import { Badge } from "@/components/ui/badge";
import { getAccountSettingsData } from "@/lib/crm/queries";

export default async function AccountSettingsPage() {
  const account = await getAccountSettingsData();

  return (
    <>
      <PageHeader title="Account" description="Read-only dashboard identity and access status." />
      <section className="panel">
        <div className="panel-header">
          <h2>Dashboard user</h2>
          <Badge tone={account?.active === "Active" ? "success" : "warning"}>{account?.active ?? "Unavailable"}</Badge>
        </div>
        <div className="panel-body grid gap-3 md:grid-cols-2">
          <div className="record-card">
            <div className="metric-label">Name</div>
            <div className="text-white/85">{account?.name ?? "Name unavailable"}</div>
          </div>
          <div className="record-card">
            <div className="metric-label">Email</div>
            <div className="text-white/85">{account?.email ?? "Email unavailable"}</div>
          </div>
          <div className="record-card">
            <div className="metric-label">Role</div>
            <div className="text-white/85">{account?.role ?? "Role unavailable"}</div>
          </div>
          <div className="record-card">
            <div className="metric-label">Last login</div>
            <div className="text-white/85">{account?.lastLogin ? new Date(account.lastLogin).toLocaleString() : "Last login unavailable."}</div>
          </div>
        </div>
      </section>
    </>
  );
}
