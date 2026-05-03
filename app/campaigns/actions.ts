"use server";

import { revalidatePath } from "next/cache";
import { assertCampaignConfigInput, discoveryLimits, type CampaignConfigInput } from "@/lib/contracts";
import { createCrmCampaign, markCampaignManualRunRequested, updateCrmCampaign, updateCrmCampaignStatus } from "@/lib/app/campaigns";
import { runLeadDiscovery } from "@/lib/workflows/lead-discovery";

function parseCsv(value: FormDataEntryValue | null) {
  return String(value ?? "")
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseNumber(value: FormDataEntryValue | null, fallback: number) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function parseOptionalNumber(value: FormDataEntryValue | null, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseBoolean(value: FormDataEntryValue | null) {
  return value === "on" || value === "true";
}

function campaignFromForm(formData: FormData): CampaignConfigInput {
  const input = {
    name: String(formData.get("name") ?? ""),
    status: String(formData.get("status") ?? "draft") as CampaignConfigInput["status"],
    description: String(formData.get("description") ?? "").trim() || null,
    primary_niche: String(formData.get("primary_niche") ?? ""),
    niche_keywords: parseCsv(formData.get("niche_keywords")),
    target_countries: parseCsv(formData.get("target_countries")),
    target_cities: parseCsv(formData.get("target_cities")),
    exclude_cities: parseCsv(formData.get("exclude_cities")),
    language_of_business: parseCsv(formData.get("language_of_business")),
    max_leads_per_run: parseNumber(formData.get("max_leads_per_run"), discoveryLimits.maxFinalLeadsPerDay),
    lead_source: String(formData.get("lead_source") ?? "google_maps"),
    min_google_rating: parseOptionalNumber(formData.get("min_google_rating"), 3.5),
    min_review_count: parseOptionalNumber(formData.get("min_review_count"), 5),
    exclude_chains: parseBoolean(formData.get("exclude_chains")),
    exclude_already_discovered: formData.get("exclude_already_discovered") !== "off",
    run_frequency: String(formData.get("run_frequency") ?? "manual") as CampaignConfigInput["run_frequency"],
    next_run_at: String(formData.get("next_run_at") ?? "").trim() || null,
    min_score_band_a: parseOptionalNumber(formData.get("min_score_band_a"), 76),
    min_score_band_b: parseOptionalNumber(formData.get("min_score_band_b"), 51),
    min_automation_opportunity: parseOptionalNumber(formData.get("min_automation_opportunity"), 13),
    min_ability_to_pay: parseOptionalNumber(formData.get("min_ability_to_pay"), 9),
    min_reachability: parseOptionalNumber(formData.get("min_reachability"), 6),
    confidence_required: String(formData.get("confidence_required") ?? "medium") as CampaignConfigInput["confidence_required"],
    sequence_band_a: String(formData.get("sequence_band_a") ?? "").trim() || null,
    sequence_band_b: String(formData.get("sequence_band_b") ?? "").trim() || null,
    sequence_band_c: String(formData.get("sequence_band_c") ?? "").trim() || null,
    auto_approve_band_b: parseBoolean(formData.get("auto_approve_band_b")),
    require_approval_band_a: formData.get("require_approval_band_a") !== "off",
    assigned_inbox_id: String(formData.get("assigned_inbox_id") ?? "").trim() || null,
    tags: parseCsv(formData.get("tags")),
    notes: String(formData.get("notes") ?? "").trim() || null,
    timezone: String(formData.get("timezone") ?? "UTC"),
    crawl_website: formData.get("crawl_website") !== "off",
    max_candidates_per_day: parseNumber(formData.get("max_candidates_per_day"), discoveryLimits.maxCandidatesCheckedPerDay),
    max_details_calls_per_day: parseNumber(formData.get("max_details_calls_per_day"), discoveryLimits.maxPlacesDetailsCallsPerDay),
    max_total_places_calls_per_day: parseNumber(formData.get("max_total_places_calls_per_day"), discoveryLimits.maxTotalPlacesCallsPerDay),
    max_discovery_runs_per_day: 1
  };

  assertCampaignConfigInput(input);
  return input;
}

export async function createCampaign(_: unknown, formData: FormData) {
  try {
    const campaign = campaignFromForm(formData);
    await createCrmCampaign(campaign);
    revalidatePath("/campaigns");
    return { error: null };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Campaign creation failed" };
  }
}

export async function updateCampaign(campaignId: string, _: unknown, formData: FormData) {
  try {
    const campaign = campaignFromForm(formData);
    await updateCrmCampaign(campaignId, campaign);
    revalidatePath("/campaigns");
    return { error: null };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Campaign update failed" };
  }
}

export async function updateCampaignStatus(campaignId: string, status: "active" | "paused" | "archived") {
  await updateCrmCampaignStatus(campaignId, status);
  revalidatePath("/campaigns");
}

export async function triggerCampaignManualRun(campaignId: string) {
  await markCampaignManualRunRequested(campaignId);
  await runLeadDiscovery({ campaign_id: campaignId });
  revalidatePath("/campaigns");
  revalidatePath(`/campaigns/${campaignId}`);
  revalidatePath("/pipeline");
}
