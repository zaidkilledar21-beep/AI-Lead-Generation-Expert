import { notFound } from "next/navigation";
import { PageHeader } from "@/components/crm/page-header";
import { LinkButton } from "@/components/ui/button";
import { getCampaignDetailData } from "@/lib/crm/queries";
import { ManualImportForm } from "./import-form";

export default async function CampaignImportPage({ params }: Readonly<{ params: { campaign_id: string } }>) {
  const detail = await getCampaignDetailData(params.campaign_id);
  if (!detail) notFound();

  return (
    <>
      <PageHeader
        title={`Import leads: ${detail.campaign.name}`}
        description="Paste up to 100 hand-curated leads. Imported leads enter the normal new lead lifecycle and do not bypass review or sending controls."
        actions={<LinkButton variant="secondary" href={`/campaigns/${detail.campaign.id}`}>Back to campaign</LinkButton>}
      />
      <section className="panel">
        <div className="panel-header">
          <h2>Manual import</h2>
          <span className="muted">Required column: business_name</span>
        </div>
        <div className="panel-body">
          <ManualImportForm campaignId={detail.campaign.id} />
        </div>
      </section>
    </>
  );
}
