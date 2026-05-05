"use server";

import { revalidatePath } from "next/cache";
import { assertCampaignConfigInput, discoveryLimits, type CampaignConfigInput } from "@/lib/contracts";
import { createCrmCampaign, duplicateCrmCampaign, markCampaignManualRunRequested, updateCrmCampaign, updateCrmCampaignStatus } from "@/lib/app/campaigns";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { importDiscoveredLeads, type RawLeadInput } from "@/lib/workflows/discovery";
import { runLeadDiscovery } from "@/lib/workflows/lead-discovery";

function parseCsv(value: FormDataEntryValue | null) {
  const raw = typeof value === "string" ? value : "";
  return raw
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

function str(value: FormDataEntryValue | null, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function normalizeWebsite(value: string | undefined) {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

function parseCsvRows(csv: string) {
  const rows: string[][] = [];
  let field = "";
  let row: string[] = [];
  let quoted = false;

  for (let index = 0; index < csv.length; index += 1) {
    const char = csv[index];
    const next = csv[index + 1];
    if (char === '"' && quoted && next === '"') {
      field += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      row.push(field.trim());
      field = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(field.trim());
      if (row.some(Boolean)) rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }

  row.push(field.trim());
  if (row.some(Boolean)) rows.push(row);
  return rows;
}

function normalizeLeadSource(value: string): CampaignConfigInput["lead_source"] {
  if (value === "manual_import") return "manual_import";
  return "google_places";
}

function campaignFromForm(formData: FormData): CampaignConfigInput {
  const input = {
    name: str(formData.get("name")),
    status: str(formData.get("status"), "draft") as CampaignConfigInput["status"],
    description: str(formData.get("description")).trim() || null,
    primary_niche: str(formData.get("primary_niche")),
    niche_keywords: parseCsv(formData.get("niche_keywords")),
    target_countries: parseCsv(formData.get("target_countries")),
    target_cities: parseCsv(formData.get("target_cities")),
    exclude_cities: parseCsv(formData.get("exclude_cities")),
    language_of_business: parseCsv(formData.get("language_of_business")),
    max_leads_per_run: parseNumber(formData.get("max_leads_per_run"), discoveryLimits.maxFinalLeadsPerDay),
    lead_source: normalizeLeadSource(str(formData.get("lead_source"), "google_places")),
    min_google_rating: parseOptionalNumber(formData.get("min_google_rating"), 3.5),
    min_review_count: parseOptionalNumber(formData.get("min_review_count"), 5),
    exclude_chains: parseBoolean(formData.get("exclude_chains")),
    exclude_already_discovered: formData.get("exclude_already_discovered") !== "off",
    run_frequency: str(formData.get("run_frequency"), "manual") as CampaignConfigInput["run_frequency"],
    next_run_at: str(formData.get("next_run_at")).trim() || null,
    min_score_band_a: parseOptionalNumber(formData.get("min_score_band_a"), 76),
    min_score_band_b: parseOptionalNumber(formData.get("min_score_band_b"), 51),
    min_automation_opportunity: parseOptionalNumber(formData.get("min_automation_opportunity"), 13),
    min_ability_to_pay: parseOptionalNumber(formData.get("min_ability_to_pay"), 9),
    min_reachability: parseOptionalNumber(formData.get("min_reachability"), 6),
    confidence_required: str(formData.get("confidence_required"), "medium") as CampaignConfigInput["confidence_required"],
    sequence_band_a: str(formData.get("sequence_band_a")).trim() || null,
    sequence_band_b: str(formData.get("sequence_band_b")).trim() || null,
    sequence_band_c: str(formData.get("sequence_band_c")).trim() || null,
    auto_approve_band_b: parseBoolean(formData.get("auto_approve_band_b")),
    require_approval_band_a: formData.get("require_approval_band_a") !== "off",
    assigned_inbox_id: str(formData.get("assigned_inbox_id")).trim() || null,
    tags: parseCsv(formData.get("tags")),
    notes: str(formData.get("notes")).trim() || null,
    timezone: str(formData.get("timezone"), "UTC"),
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

export async function duplicateCampaignAction(campaignId: string) {
  await duplicateCrmCampaign(campaignId);
  revalidatePath("/campaigns");
}

export async function triggerCampaignManualRun(campaignId: string) {
  await markCampaignManualRunRequested(campaignId);
  await runLeadDiscovery({ campaign_id: campaignId });
  revalidatePath("/campaigns");
  revalidatePath(`/campaigns/${campaignId}`);
  revalidatePath("/pipeline");
}

export async function manualImportLeadsAction(campaignId: string, _: unknown, formData: FormData) {
  try {
    const pastedCsv = str(formData.get("csv"));
    const rows = parseCsvRows(pastedCsv).slice(0, 101);
    const [header, ...bodyRows] = rows;
    if (!header || bodyRows.length === 0) {
      return { inserted: 0, skipped: 0, errors: ["Paste a CSV header and at least one lead row."] };
    }

    const columns = header.map((column) => column.trim().toLowerCase());
    const indexOf = (name: string) => columns.indexOf(name);
    const businessNameIndex = indexOf("business_name");
    if (businessNameIndex < 0) {
      return { inserted: 0, skipped: bodyRows.length, errors: ["CSV must include a business_name column."] };
    }

    const supabase = createSupabaseServiceClient();
    const { data: campaign, error: campaignError } = await supabase
      .from("campaigns")
      .select("id,primary_niche,niche,target_countries,region")
      .eq("id", campaignId)
      .maybeSingle();
    if (campaignError) throw new Error(campaignError.message);
    if (!campaign) throw new Error("Campaign not found");

    const errors: string[] = [];
    const leads: RawLeadInput[] = [];
    for (const [rowIndex, row] of bodyRows.entries()) {
      const get = (name: string) => {
        const index = indexOf(name);
        return index >= 0 ? row[index]?.trim() : "";
      };
      const businessName = row[businessNameIndex]?.trim();
      if (!businessName) {
        errors.push(`Row ${rowIndex + 2}: business_name is required`);
        continue;
      }

      leads.push({
        business_name: businessName,
        website: normalizeWebsite(get("website")),
        email: get("email").toLowerCase() || null,
        phone: get("phone") || null,
        country: get("country") || campaign.target_countries?.[0] || campaign.region || null,
        city: get("city") || null,
        niche: get("niche") || campaign.primary_niche || campaign.niche || null,
        google_maps_url: get("google_maps_url") || null,
        linkedin_url: get("linkedin_url") || null,
        address: get("address") || null,
        campaign_id: campaignId,
        source: "manual_import",
        source_attribution: {
          provider: "manual_import",
          imported_from: "campaign_csv_paste",
          imported_at: new Date().toISOString()
        }
      });
    }

    const result = await importDiscoveredLeads(
      {
        niche: campaign.primary_niche || campaign.niche || "Manual import",
        location: campaign.target_countries?.[0] || campaign.region || "Manual import",
        max_results: Math.min(leads.length, 100)
      },
      leads
    );

    revalidatePath(`/campaigns/${campaignId}`);
    revalidatePath(`/campaigns/${campaignId}/import`);
    revalidatePath("/pipeline");
    return {
      inserted: result.created,
      skipped: result.duplicates + errors.length,
      errors: [...errors, ...result.errors]
    };
  } catch (error) {
    return {
      inserted: 0,
      skipped: 0,
      errors: [error instanceof Error ? error.message : "Manual import failed"]
    };
  }
}
