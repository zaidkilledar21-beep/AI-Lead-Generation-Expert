import { assertCampaignConfigInput, type CampaignConfigInput } from "@/lib/contracts";
import { requireAppActor } from "@/lib/app/auth";
import { logCrmAction } from "@/lib/app/audit";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

export type CampaignStatusChange = "active" | "paused" | "archived";

export async function createCrmCampaign(input: CampaignConfigInput) {
  assertCampaignConfigInput(input);

  const actor = await requireAppActor();
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from("campaigns")
    .insert({
      ...input,
      created_by: actor.userId
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);

  await logCrmAction({
    actor,
    actionType: "campaign_created",
    campaignId: data.id,
    detail: { name: input.name, status: input.status, niche: input.niche, region: input.region }
  });

  return data.id as string;
}

export async function updateCrmCampaign(campaignId: string, input: CampaignConfigInput) {
  assertCampaignConfigInput(input);

  const actor = await requireAppActor();
  const supabase = createSupabaseServiceClient();
  const { error } = await supabase.from("campaigns").update(input).eq("id", campaignId);

  if (error) throw new Error(error.message);

  await logCrmAction({
    actor,
    actionType: "campaign_updated",
    campaignId,
    detail: { name: input.name, status: input.status, niche: input.niche, region: input.region }
  });
}

export async function updateCrmCampaignStatus(campaignId: string, status: CampaignStatusChange) {
  const actor = await requireAppActor();
  const supabase = createSupabaseServiceClient();
  const { error } = await supabase.from("campaigns").update({ status }).eq("id", campaignId);

  if (error) throw new Error(error.message);

  await logCrmAction({
    actor,
    actionType: status === "active" ? "campaign_resumed" : status === "paused" ? "campaign_paused" : "campaign_archived",
    campaignId,
    detail: { status }
  });
}

export async function markCampaignManualRunRequested(campaignId: string) {
  const actor = await requireAppActor();
  const supabase = createSupabaseServiceClient();
  const requestedAt = new Date().toISOString();
  const { error } = await supabase
    .from("campaigns")
    .update({
      last_manual_run_requested_at: requestedAt,
      last_manual_run_requested_by: actor.displayName
    })
    .eq("id", campaignId);

  if (error) throw new Error(error.message);

  await logCrmAction({
    actor,
    actionType: "campaign_launched",
    campaignId,
    detail: { requested_at: requestedAt }
  });
}
