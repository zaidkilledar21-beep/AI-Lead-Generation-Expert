import { assertCampaignConfigInput, type CampaignConfigInput } from "@/lib/contracts";
import { requireAppActor } from "@/lib/app/auth";
import { logCrmAction } from "@/lib/app/audit";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

export type CampaignStatusChange = "active" | "paused" | "archived";

function deriveLegacyCampaignColumns(input: CampaignConfigInput) {
  const region = input.target_cities.length > 0
    ? `${input.target_cities.join(", ")} / ${input.target_countries.join(", ")}`
    : input.target_countries.join(", ");

  return {
    niche: input.primary_niche,
    region,
    keywords: input.niche_keywords,
    excluded_keywords: input.exclude_cities,
    target_business_types: [input.primary_niche],
    max_leads_per_day: Math.min(input.max_leads_per_run, 30),
    schedule: input.run_frequency === "every_3_days" ? "daily" : input.run_frequency,
    crawl_website: input.crawl_website
  };
}

function toCampaignRow(input: CampaignConfigInput, actorUserId?: string) {
  const legacy = deriveLegacyCampaignColumns(input);
  return {
    ...legacy,
    ...input,
    ...(actorUserId ? { created_by: actorUserId } : {})
  };
}

export async function createCrmCampaign(input: CampaignConfigInput) {
  assertCampaignConfigInput(input);

  const actor = await requireAppActor();
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from("campaigns")
    .insert(toCampaignRow(input, actor.userId))
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
  const { error } = await supabase.from("campaigns").update(toCampaignRow(input)).eq("id", campaignId);

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
