import { PageHeader } from "@/components/crm/page-header";
import { CreateCampaignForm } from "../create-campaign-form";
import { getSettingsData } from "@/lib/crm/queries";

export default async function NewCampaignPage() {
  const settings = await getSettingsData();
  return (
    <>
      <PageHeader title="New campaign" description="Define the ICP, geography, discovery budget, and launch state for a lead-generation campaign." />
      <section className="panel">
        <div className="panel-header"><h2>Campaign setup</h2></div>
        <div className="panel-body">
          <CreateCampaignForm sequences={settings.sequences as any} inboxes={settings.inboxes as any} />
        </div>
      </section>
    </>
  );
}
