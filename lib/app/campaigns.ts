import { assertCampaignConfigInput, type CampaignConfigInput } from "@/lib/contracts";
import { requireAppActor, requireDashboardWriteAccess } from "@/lib/app/auth";
import { logCrmAction } from "@/lib/app/audit";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

export type CampaignStatusChange = "active" | "paused" | "archived";
export type CampaignReadinessStatus = "Ready" | "Needs attention" | "Blocked";
export type CampaignReadinessItem = {
  label: string;
  message: string;
  severity: "blocker" | "warning" | "info";
};

export type CampaignReadiness = {
  status: CampaignReadinessStatus;
  blockers: CampaignReadinessItem[];
  warnings: CampaignReadinessItem[];
  info: CampaignReadinessItem[];
};

const CAMPAIGN_CONFIG_COPY_FIELDS = [
  "description",
  "primary_niche",
  "niche",
  "region",
  "niche_keywords",
  "keywords",
  "excluded_keywords",
  "target_business_types",
  "target_countries",
  "target_cities",
  "exclude_cities",
  "language_of_business",
  "max_leads_per_run",
  "max_leads_per_day",
  "lead_source",
  "min_google_rating",
  "min_review_count",
  "exclude_chains",
  "exclude_already_discovered",
  "run_frequency",
  "min_score_band_a",
  "min_score_band_b",
  "min_automation_opportunity",
  "min_ability_to_pay",
  "min_reachability",
  "confidence_required",
  "sequence_band_a",
  "sequence_band_b",
  "sequence_band_c",
  "auto_approve_band_b",
  "require_approval_band_a",
  "assigned_inbox_id",
  "tags",
  "notes",
  "timezone",
  "crawl_website",
  "max_candidates_per_day",
  "max_details_calls_per_day",
  "max_total_places_calls_per_day",
  "max_discovery_runs_per_day",
  "schedule",
  "fallback_search_enabled",
  "apify_enabled",
  "serpapi_enabled",
  "brave_enabled",
  "paid_scraping_enabled"
] as const;

function asArray<T>(value: T[] | null | undefined): T[] {
  return value ?? [];
}

function hasManualN8nConfig() {
  const hasWebhookTarget = Boolean(process.env.N8N_DISCOVERY_WEBHOOK_URL || process.env.N8N_BASE_URL);
  const hasAuth = Boolean(process.env.N8N_API_KEY || process.env.N8N_WORKFLOW_API_KEY);
  return hasWebhookTarget && hasAuth;
}

function hasTargetGeography(campaign: Record<string, unknown>) {
  return (
    asArray(campaign.target_countries as string[] | null).length > 0 ||
    asArray(campaign.target_cities as string[] | null).length > 0 ||
    typeof campaign.region === "string" && campaign.region.trim().length > 0
  );
}

function hasPositiveInteger(value: unknown) {
  return Number.isInteger(value) && Number(value) > 0;
}

function pushReadinessItem(
  target: CampaignReadinessItem[],
  label: string,
  message: string,
  severity: CampaignReadinessItem["severity"]
) {
  target.push({ label, message, severity });
}

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

function campaignStatusAction(status: CampaignStatusChange) {
  if (status === "active") return "campaign_resumed" as const;
  if (status === "paused") return "campaign_paused" as const;
  return "campaign_archived" as const;
}

export async function updateCrmCampaignStatus(campaignId: string, status: CampaignStatusChange) {
  if (status === "archived") {
    await archiveCrmCampaign(campaignId);
    return;
  }

  const actor = await requireAppActor();
  const supabase = createSupabaseServiceClient();
  const { error } = await supabase.from("campaigns").update({ status }).eq("id", campaignId);

  if (error) throw new Error(error.message);

  await logCrmAction({
    actor,
    actionType: campaignStatusAction(status),
    campaignId,
    detail: { status }
  });
}

export async function duplicateCrmCampaign(campaignId: string) {
  const actor = await requireDashboardWriteAccess();
  const supabase = createSupabaseServiceClient();
  const { data: campaign, error: loadError } = await supabase.from("campaigns").select("*").eq("id", campaignId).maybeSingle();
  if (loadError) throw new Error(loadError.message);
  if (!campaign) throw new Error("Campaign not found");

  const source = campaign as Record<string, unknown>;
  const copy = CAMPAIGN_CONFIG_COPY_FIELDS.reduce<Record<string, unknown>>((acc, field) => {
    if (Object.prototype.hasOwnProperty.call(source, field)) {
      acc[field] = source[field];
    }
    return acc;
  }, {});

  const { data, error } = await supabase
    .from("campaigns")
    .insert({
      ...copy,
      name: `${String(campaign.name ?? "Campaign")} Copy`,
      status: "draft",
      created_by: actor.userId,
      next_run_at: null,
      last_run_at: null,
      last_manual_run_requested_at: null,
      last_manual_run_requested_by: null
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);

  await logCrmAction({
    actor,
    actionType: "campaign_created",
    campaignId: data.id,
    detail: { copied_from: campaignId, name: campaign.name }
  });

  return data.id as string;
}

export async function archiveCrmCampaign(campaignId: string) {
  const actor = await requireDashboardWriteAccess();
  const supabase = createSupabaseServiceClient();

  const { data: campaign, error: loadError } = await supabase
    .from("campaigns")
    .select("id,name,status")
    .eq("id", campaignId)
    .maybeSingle();
  if (loadError) throw new Error(loadError.message);
  if (!campaign) throw new Error("Campaign not found");

  const { count, error: runError } = await supabase
    .from("discovery_runs")
    .select("id", { count: "exact", head: true })
    .eq("campaign_id", campaignId)
    .eq("status", "running");
  if (runError) throw new Error(runError.message);
  if ((count ?? 0) > 0) {
    throw new Error("Campaign cannot be archived while a discovery run is running.");
  }

  const { error } = await supabase.from("campaigns").update({ status: "archived" }).eq("id", campaignId);
  if (error) throw new Error(error.message);

  await logCrmAction({
    actor,
    actionType: "campaign_archived",
    campaignId,
    detail: { previous_status: campaign.status, name: campaign.name }
  });
}

export async function getCampaignReadiness(campaignId: string): Promise<CampaignReadiness> {
  const supabase = createSupabaseServiceClient();
  const { data: campaign, error: campaignError } = await supabase
    .from("campaigns")
    .select("*")
    .eq("id", campaignId)
    .maybeSingle();
  if (campaignError) throw new Error(campaignError.message);
  if (!campaign) throw new Error("Campaign not found");

  const [inboxesResult, sequencesResult, globalPauseResult] = await Promise.all([
    supabase.from("inboxes").select("id,email_address,active"),
    supabase.from("outreach_sequences").select("id,name,active"),
    supabase.from("app_settings").select("value").eq("key", "global_outreach").maybeSingle()
  ]);

  if (inboxesResult.error) throw new Error(inboxesResult.error.message);
  if (sequencesResult.error) throw new Error(sequencesResult.error.message);
  if (globalPauseResult.error) throw new Error(globalPauseResult.error.message);

  const blockers: CampaignReadinessItem[] = [];
  const warnings: CampaignReadinessItem[] = [];
  const info: CampaignReadinessItem[] = [];
  const campaignRow = campaign as Record<string, unknown>;
  const activeInboxes = asArray(inboxesResult.data as Array<Record<string, unknown>>).filter((inbox) => inbox.active === true);
  const assignedInboxId = typeof campaignRow.assigned_inbox_id === "string" ? campaignRow.assigned_inbox_id : null;
  const assignedInbox = assignedInboxId ? asArray(inboxesResult.data as Array<Record<string, unknown>>).find((inbox) => inbox.id === assignedInboxId) : null;
  const activeSequenceIds = new Set(
    asArray(sequencesResult.data as Array<Record<string, unknown>>)
      .filter((sequence) => sequence.active === true)
      .map((sequence) => String(sequence.id))
  );
  const configuredSequences = ["sequence_band_a", "sequence_band_b", "sequence_band_c"]
    .map((field) => campaignRow[field])
    .filter((value): value is string => typeof value === "string" && value.length > 0);

  if (campaignRow.status === "archived") {
    pushReadinessItem(blockers, "Campaign status", "Archived campaigns cannot be manually run.", "blocker");
  } else if (campaignRow.status !== "active") {
    pushReadinessItem(warnings, "Campaign status", `Campaign status is ${String(campaignRow.status)}; active campaigns are eligible for scheduled or manual n8n discovery runs.`, "warning");
  }

  if (!hasTargetGeography(campaignRow)) {
    pushReadinessItem(blockers, "Target geography", "Add at least one target country, city, or region before discovery.", "blocker");
  }

  if (!hasPositiveInteger(campaignRow.max_leads_per_run) || !hasPositiveInteger(campaignRow.max_candidates_per_day) || !hasPositiveInteger(campaignRow.max_discovery_runs_per_day)) {
    pushReadinessItem(blockers, "Discovery caps", "Configure positive lead, candidate, and discovery-run caps.", "blocker");
  }

  if (!hasManualN8nConfig()) {
    pushReadinessItem(blockers, "n8n manual run", "Server-side n8n discovery webhook configuration is missing.", "blocker");
  }

  if (assignedInbox && assignedInbox.active !== true) {
    pushReadinessItem(warnings, "Inbox assignment", "The assigned inbox is inactive.", "warning");
  } else if (!assignedInbox && activeInboxes.length === 0) {
    pushReadinessItem(warnings, "Inbox assignment", "No active sender inbox is available for downstream outreach.", "warning");
  }

  if (configuredSequences.length === 0) {
    pushReadinessItem(warnings, "Sequence routing", "No Band A/B/C sequence routing is configured.", "warning");
  } else if (!configuredSequences.some((sequenceId) => activeSequenceIds.has(sequenceId))) {
    pushReadinessItem(warnings, "Sequence routing", "Configured sequence routing does not point to an active sequence.", "warning");
  }

  const globalOutreach = globalPauseResult.data?.value as { paused?: boolean } | null | undefined;
  pushReadinessItem(
    globalOutreach?.paused ? warnings : info,
    "Global pause",
    globalOutreach?.paused ? "Global outreach pause is enabled." : "Global outreach pause is not enabled.",
    globalOutreach?.paused ? "warning" : "info"
  );

  return {
    status: blockers.length > 0 ? "Blocked" : warnings.length > 0 ? "Needs attention" : "Ready",
    blockers,
    warnings,
    info
  };
}

export async function assertCampaignManualRunReadiness(campaignId: string) {
  const readiness = await getCampaignReadiness(campaignId);
  if (readiness.blockers.length > 0) {
    throw new Error(`Manual n8n discovery run blocked: ${readiness.blockers.map((item) => item.message).join(" ")}`);
  }
  return readiness;
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
