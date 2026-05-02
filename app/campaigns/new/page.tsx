import { PageHeader } from "@/components/crm/page-header";
import { CreateCampaignForm } from "../create-campaign-form";

export default function NewCampaignPage() {
  return (
    <>
      <PageHeader title="New campaign" description="Define the ICP, geography, discovery budget, and launch state for a lead-generation campaign." />
      <section className="panel">
        <div className="panel-header"><h2>Campaign setup</h2></div>
        <div className="panel-body">
          <CreateCampaignForm />
        </div>
      </section>
    </>
  );
}
