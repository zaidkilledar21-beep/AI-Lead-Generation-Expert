import { PageHeader } from "@/components/crm/page-header";
import { SettingsDiagnosticsCard } from "@/components/crm/settings-diagnostics-card";
import { CreateCampaignForm } from "../create-campaign-form";
import { getSettingsData } from "@/lib/crm/queries";

export default async function NewCampaignPage() {
  const settings = await getSettingsData();
  return (
    <>
      <PageHeader title="New campaign" description="Define the ICP, geography, discovery budget, and launch state for a lead-generation campaign." />
      <SettingsDiagnosticsCard diagnostics={settings.diagnostics} title="Campaign setup dependencies" />
      <section className="panel">
        <div className="panel-header"><h2>Campaign setup</h2></div>
        <div className="panel-body">
          <CreateCampaignForm
            sequences={settings.sequences as any}
            inboxes={settings.inboxes as any}
            profiles={settings.profiles as any}
          />
        </div>
      </section>
    </>
  );
}
