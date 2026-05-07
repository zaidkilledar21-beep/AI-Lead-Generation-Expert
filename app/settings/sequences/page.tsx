import { PageHeader } from "@/components/crm/page-header";
import { getCampaignRows, getSettingsData } from "@/lib/crm/queries";
import { SequenceSettingsEditor } from "./sequence-settings-editor";

export default async function SequencesSettingsPage() {
  const [settings, campaigns] = await Promise.all([getSettingsData(), getCampaignRows()]);
  const activeCampaigns = campaigns.filter((campaign) => campaign.status === "active");
  const sequences = settings.sequences.map((sequence: any) => ({
    ...sequence,
    activeCampaignCount: activeCampaigns.filter((campaign) =>
      campaign.sequenceBandA === sequence.id ||
      campaign.sequenceBandB === sequence.id ||
      campaign.sequenceBandC === sequence.id
    ).length
  }));

  return (
    <>
      <PageHeader title="Sequences" description="Active outreach sequences, steps, delays, and per-band assignment references." />
      <SequenceSettingsEditor sequences={sequences as any} />
    </>
  );
}
