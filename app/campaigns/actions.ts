"use server";

import { revalidatePath } from "next/cache";
import { assertCampaignConfigInput, discoveryLimits, type CampaignConfigInput } from "@/lib/contracts";
import { createCrmCampaign, updateCrmCampaign, updateCrmCampaignStatus } from "@/lib/app/campaigns";

function parseCsv(value: FormDataEntryValue | null) {
  return String(value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseNumber(value: FormDataEntryValue | null, fallback: number) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function campaignFromForm(formData: FormData): CampaignConfigInput {
  const input = {
    name: String(formData.get("name") ?? ""),
    niche: String(formData.get("niche") ?? ""),
    region: String(formData.get("region") ?? ""),
    keywords: parseCsv(formData.get("keywords")),
    excluded_keywords: parseCsv(formData.get("excluded_keywords")),
    target_business_types: parseCsv(formData.get("target_business_types")),
    max_leads_per_day: parseNumber(formData.get("max_leads_per_day"), discoveryLimits.maxFinalLeadsPerDay),
    max_candidates_per_day: parseNumber(formData.get("max_candidates_per_day"), discoveryLimits.maxCandidatesCheckedPerDay),
    max_details_calls_per_day: parseNumber(formData.get("max_details_calls_per_day"), discoveryLimits.maxPlacesDetailsCallsPerDay),
    max_total_places_calls_per_day: parseNumber(formData.get("max_total_places_calls_per_day"), discoveryLimits.maxTotalPlacesCallsPerDay),
    crawl_website: formData.get("crawl_website") === "on",
    schedule: String(formData.get("schedule") ?? "daily"),
    timezone: String(formData.get("timezone") ?? "UTC"),
    status: String(formData.get("status") ?? "paused") as CampaignConfigInput["status"]
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
