import { discoveryLimits } from "@/lib/contracts";
import { getRequiredEnv } from "@/lib/env";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { buildLeadDedupeKey, importDiscoveredLeads, type RawLeadInput } from "@/lib/workflows/discovery";
import { enrichLead } from "@/lib/workflows/enrichment";
import { scoreLead } from "@/lib/workflows/scoring";
import { normalizePhone, selectBestBusinessEmail } from "@/lib/workflows/contact-extraction";
import { crawlBusinessWebsite, extractWebsiteSignals } from "@/lib/workflows/website-crawler";

type CampaignRow = {
  id: string;
  name: string;
  niche: string;
  region: string;
  primary_niche: string | null;
  niche_keywords: string[];
  target_countries: string[];
  target_cities: string[];
  exclude_cities: string[];
  target_business_types: string[];
  max_leads_per_day: number;
  max_leads_per_run: number;
  max_candidates_per_day: number;
  max_details_calls_per_day: number;
  max_total_places_calls_per_day: number;
  max_discovery_runs_per_day: number;
  lead_source: string;
  min_google_rating: number;
  min_review_count: number;
  crawl_website: boolean;
  status: "active" | "paused" | "archived" | "draft" | "completed";
};

type PlacesSearchResult = {
  places?: Array<{ id: string }>;
  nextPageToken?: string;
};

type PlacesDetails = {
  id: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  nationalPhoneNumber?: string;
  websiteUri?: string;
  rating?: number;
  userRatingCount?: number;
  googleMapsUri?: string;
};

export type RunLeadDiscoveryInput = {
  campaign_id?: string;
  dry_run?: boolean;
  trigger_type?: "manual" | "schedule" | "webhook";
};

type DiscoveryRunStatus = "completed" | "failed" | "quota_exhausted";
type DiscoveryRunOutputStatus = DiscoveryRunStatus | "paused" | "running";

export type RunLeadDiscoveryOutput = {
  run_id: string | null;
  status: DiscoveryRunOutputStatus;
  campaign_id?: string | null;
  campaign_name?: string | null;
  created: number;
  duplicates: number;
  manual_review: number;
  scored?: number;
  queued?: number;
  drafted?: number;
  errors: string[];
  message?: string;
  notification?: DiscoveryRunNotification;
};

type DiscoveryStats = {
  created: number; duplicates: number; manualReview: number; rejected: number;
  crawlFailures: number; candidatesChecked: number; textSearchCalls: number;
  detailsCalls: number; enriched: number; scored: number;
};

type RoutingStats = {
  queued: number;
  drafted: number;
};

type PromotionResults = {
  created: number;
  duplicates: number;
  enriched: number;
  scored: number;
  routing: RoutingStats;
  errors: string[];
};

type DiscoveryRunNotification = {
  subject: string;
  final_status: string;
  needs_attention: boolean;
  campaign_url: string;
  run_url: string;
  body: string;
};

type DiscoveryRunRow = {
  id: string;
  campaign_id: string;
  status: string;
  candidates_checked: number | null;
  places_text_search_calls: number | null;
  places_details_calls: number | null;
  total_places_calls: number | null;
  duplicates_skipped: number | null;
  candidates_rejected: number | null;
  candidates_promoted: number | null;
  manual_review_candidates: number | null;
  crawl_failures: number | null;
  error_message: string | null;
  started_at: string | null;
};

const textSearchFieldMask = "places.id,nextPageToken";
const defaultDetailsFieldMask = "id,displayName,formattedAddress,nationalPhoneNumber,websiteUri,rating,userRatingCount,googleMapsUri";
const allowedDetailsFields = new Set(defaultDetailsFieldMask.split(","));
const googlePlacesTimeoutMs = 15000;
const defaultStaleRunMinutes = 10;

function emptyDiscoveryStats(): DiscoveryStats {
  return { created: 0, duplicates: 0, manualReview: 0, rejected: 0, crawlFailures: 0, candidatesChecked: 0, textSearchCalls: 0, detailsCalls: 0, enriched: 0, scored: 0 };
}

function staleRunCutoffIso() {
  const configured = Number(process.env.DISCOVERY_STALE_RUN_MINUTES ?? defaultStaleRunMinutes);
  const minutes = Number.isFinite(configured) && configured > 0 ? configured : defaultStaleRunMinutes;
  return new Date(Date.now() - minutes * 60 * 1000).toISOString();
}

function conciseError(error: unknown) {
  return error instanceof Error ? error.message : "Discovery run failed";
}

function compactBody(value: string) {
  return value.replace(/\s+/g, " ").trim().slice(0, 400);
}

function configuredAppBaseUrl() {
  const baseUrl = process.env.APP_BASE_URL
    ?? process.env.NEXT_PUBLIC_APP_URL
    ?? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "");
  let end = baseUrl.length;
  while (end > 0 && baseUrl.charCodeAt(end - 1) === 47) {
    end -= 1;
  }
  return baseUrl.slice(0, end);
}

function appPath(path: string) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const baseUrl = configuredAppBaseUrl();
  return baseUrl ? `${baseUrl}${normalizedPath}` : normalizedPath;
}

function notificationSubject(status: DiscoveryRunOutputStatus, created: number, needsAttention: boolean) {
  if (needsAttention) return "WF-10 Lead Discovery Needs Attention";
  if (status === "quota_exhausted" && created > 0) return "WF-10 Lead Discovery Finished: Quota Reached";
  if (status === "quota_exhausted") return "WF-10 Lead Discovery Finished: Quota Reached - No New Leads";
  if (status === "completed" && created === 0) return "WF-10 Lead Discovery Finished: No New Leads";
  return "WF-10 Lead Discovery Finished";
}

function notificationFinalStatus(status: DiscoveryRunOutputStatus, created: number, needsAttention: boolean) {
  if (needsAttention) return status === "failed" ? "Needs Attention: failed" : "Needs Attention";
  if (status === "quota_exhausted" && created > 0) return "Completed: quota reached";
  if (status === "quota_exhausted") return "Quota reached: no new leads";
  if (status === "completed") return "Completed";
  if (status === "running") return "Running";
  if (status === "paused") return "Paused";
  return status.replaceAll("_", " ");
}

function buildDiscoveryRunNotification(input: {
  campaignId?: string | null;
  campaignName?: string | null;
  runId: string | null;
  status: DiscoveryRunOutputStatus;
  stats: DiscoveryStats;
  routing?: RoutingStats;
  errors: string[];
}) {
  const needsAttention = input.status === "failed" || input.status === "paused" || input.status === "running";
  const subject = notificationSubject(input.status, input.stats.created, needsAttention);
  const finalStatus = notificationFinalStatus(input.status, input.stats.created, needsAttention);
  const campaignUrl = input.campaignId ? appPath(`/campaigns/${input.campaignId}`) : appPath("/campaigns");
  const runUrl = input.campaignId && input.runId
    ? appPath(`/campaigns/${input.campaignId}/runs/${input.runId}`)
    : campaignUrl;
  const lines = [
    subject,
    "",
    `Campaign: ${input.campaignName ?? "Unknown campaign"}`,
    `Run ID: ${input.runId ?? "none"}`,
    `Final status: ${finalStatus}`,
    `Created/promoted leads: ${input.stats.created}`,
    `Scored leads: ${input.stats.scored}`,
    `Manual review: ${input.stats.manualReview}`,
    `Drafted/queued: ${input.routing?.drafted ?? 0}/${input.routing?.queued ?? 0}`,
    `Duplicates skipped: ${input.stats.duplicates}`,
    `First error: ${input.errors[0] ?? "none"}`,
    `Campaign detail: ${campaignUrl}`,
    `Run detail: ${runUrl}`
  ];

  return {
    subject,
    final_status: finalStatus,
    needs_attention: needsAttention,
    campaign_url: campaignUrl,
    run_url: runUrl,
    body: lines.join("\n")
  };
}

function discoveryOutput(input: {
  campaign?: Pick<CampaignRow, "id" | "name"> | null;
  runId: string | null;
  status: DiscoveryRunOutputStatus;
  stats?: DiscoveryStats;
  routing?: RoutingStats;
  errors: string[];
  message?: string;
}): RunLeadDiscoveryOutput {
  const stats = input.stats ?? emptyDiscoveryStats();
  return {
    run_id: input.runId,
    status: input.status,
    campaign_id: input.campaign?.id ?? null,
    campaign_name: input.campaign?.name ?? null,
    created: stats.created,
    duplicates: stats.duplicates,
    manual_review: stats.manualReview,
    scored: stats.scored,
    queued: input.routing?.queued ?? 0,
    drafted: input.routing?.drafted ?? 0,
    errors: input.errors,
    message: input.message,
    notification: buildDiscoveryRunNotification({
      campaignId: input.campaign?.id ?? null,
      campaignName: input.campaign?.name ?? null,
      runId: input.runId,
      status: input.status,
      stats,
      routing: input.routing,
      errors: input.errors
    })
  };
}

async function googlePlacesErrorMessage(response: Response, label: string) {
  const body = compactBody(await response.text().catch(() => ""));
  const status = `${response.status} ${response.statusText}`.trim();
  return body ? `${label} failed: ${status} - ${body}` : `${label} failed: ${status}`;
}

async function fetchGooglePlaces(url: string, init: RequestInit, label: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), googlePlacesTimeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(`${label} timed out after ${googlePlacesTimeoutMs}ms`);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

function getDetailsFieldMask() {
  const configured = process.env.GOOGLE_PLACES_ALLOWED_FIELD_MASK ?? defaultDetailsFieldMask;
  const fields = configured
    .split(",")
    .map((field) => field.trim())
    .filter(Boolean);
  const disallowed = fields.filter((field) => !allowedDetailsFields.has(field));

  if (disallowed.length > 0) {
    throw new Error(`Google Places Details field mask contains disallowed fields: ${disallowed.join(", ")}`);
  }

  return fields.length > 0 ? fields.join(",") : defaultDetailsFieldMask;
}

function normalizeDomain(value?: string | null) {
  if (!value) return null;
  try {
    const url = /^https?:\/\//i.test(value) ? value : `https://${value}`;
    return new URL(url).hostname.replace(/^www\./i, "").toLowerCase();
  } catch {
    return null;
  }
}

function cityFromAddress(address?: string | null, fallback?: string | null) {
  if (!address) return fallback ?? null;
  const parts = address.split(",").map((part) => part.trim()).filter(Boolean);
  return parts.at(-2) ?? fallback ?? null;
}

function countryFromAddress(address?: string | null, fallback?: string | null) {
  if (!address) return fallback ?? null;
  const parts = address.split(",").map((part) => part.trim()).filter(Boolean);
  return parts.at(-1) ?? fallback ?? null;
}

function buildQueries(campaign: CampaignRow) {
  const baseTerms = [
    campaign.primary_niche ?? campaign.niche,
    ...campaign.target_business_types.slice(0, 2),
    ...campaign.niche_keywords.slice(0, 3)
  ]
    .map((term) => term.trim())
    .filter(Boolean);

  const uniqueTerms = [...new Set(baseTerms.length ? baseTerms : [campaign.primary_niche ?? campaign.niche])];
  const geoTargets = campaign.target_cities.length > 0
    ? campaign.target_cities.flatMap((city) => campaign.target_countries.map((country) => `${city}, ${country}`))
    : campaign.target_countries;

  return geoTargets.slice(0, 6).flatMap((geo) => uniqueTerms.slice(0, 3).map((term) => `${term} in ${geo}`));
}

function hasExcludedTerm(candidate: RawLeadInput, excluded: string[]) {
  const haystack = [candidate.business_name, candidate.address, candidate.website].filter(Boolean).join(" ").toLowerCase();
  return excluded.some((term) => haystack.includes(term.toLowerCase()));
}

async function reserveQuota(campaign: CampaignRow, counterName: string, maxAllowed: number) {
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase.rpc("reserve_places_quota", {
    target_campaign_id: campaign.id,
    counter_name: counterName,
    increment_by: 1,
    counter_max_allowed: maxAllowed,
    total_max_allowed: campaign.max_total_places_calls_per_day
  });

  if (error) throw new Error(error.message);
  return Boolean(data);
}

async function textSearch(query: string) {
  const apiKey = getRequiredEnv("GOOGLE_PLACES_API_KEY");
  const response = await fetchGooglePlaces("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-goog-api-key": apiKey,
      "x-goog-fieldmask": textSearchFieldMask
    },
    body: JSON.stringify({ textQuery: query, pageSize: 20 })
  }, "Google Places Text Search");

  if (!response.ok) throw new Error(await googlePlacesErrorMessage(response, "Google Places Text Search"));
  return response.json() as Promise<PlacesSearchResult>;
}

async function placeDetails(placeId: string) {
  const apiKey = getRequiredEnv("GOOGLE_PLACES_API_KEY");
  const detailsFieldMask = getDetailsFieldMask();
  const response = await fetchGooglePlaces(`https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`, {
    headers: {
      "x-goog-api-key": apiKey,
      "x-goog-fieldmask": detailsFieldMask
    }
  }, "Google Places Details");

  if (!response.ok) throw new Error(await googlePlacesErrorMessage(response, "Google Places Details"));
  return response.json() as Promise<PlacesDetails>;
}

async function logWorkflowEvent(payload: {
  campaign_id?: string;
  discovery_run_id?: string;
  event_type: string;
  status: "started" | "completed" | "failed" | "blocked" | "skipped";
  error_message?: string;
  payload?: Record<string, unknown>;
}) {
  const supabase = createSupabaseServiceClient();
  await supabase.from("workflow_events").insert({
    workflow_name: "WF-10 Lead Discovery",
    ...payload
  });
}

function statsSummary(stats: DiscoveryStats) {
  return {
    created: stats.created,
    duplicates: stats.duplicates,
    manual_review: stats.manualReview,
    rejected: stats.rejected,
    candidates_checked: stats.candidatesChecked,
    text_search_calls: stats.textSearchCalls,
    details_calls: stats.detailsCalls,
    crawl_failures: stats.crawlFailures,
    enriched: stats.enriched,
    scored: stats.scored
  };
}

function numberFrom(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function eventPayload(row: { payload?: unknown }) {
  return typeof row.payload === "object" && row.payload !== null && !Array.isArray(row.payload)
    ? row.payload as Record<string, unknown>
    : {};
}

function queryPreview(queryText: string) {
  return compactBody(queryText).slice(0, 120);
}

async function logDiscoveryCheckpoint({
  campaign,
  runId,
  eventType,
  payload = {}
}: Readonly<{
  campaign: Pick<CampaignRow, "id">;
  runId?: string | null;
  eventType: string;
  payload?: Record<string, unknown>;
}>) {
  try {
    await logWorkflowEvent({
      campaign_id: campaign.id,
      discovery_run_id: runId ?? undefined,
      event_type: eventType,
      status: "completed",
      payload: {
        run_id: runId ?? null,
        ...payload
      }
    });
  } catch {
    // Diagnostics must never be the reason a discovery run fails.
  }
}

function promotionCheckpointPayload({
  runId,
  campaignId,
  candidateCount,
  promotableCount,
  createdCount,
  duplicateCount,
  enrichedCount,
  scoredCount,
  errorCount
}: Readonly<{
  runId: string;
  campaignId: string;
  candidateCount: number;
  promotableCount: number;
  createdCount?: number;
  duplicateCount?: number;
  enrichedCount?: number;
  scoredCount?: number;
  errorCount?: number;
}>) {
  return {
    run_id: runId,
    campaign_id: campaignId,
    candidate_count: candidateCount,
    promotable_count: promotableCount,
    created_count: createdCount ?? 0,
    duplicate_count: duplicateCount ?? 0,
    enriched_count: enrichedCount ?? 0,
    scored_count: scoredCount ?? 0,
    error_count: errorCount ?? 0
  };
}

async function countRunRows(table: "lead_candidates" | "leads", runId: string) {
  const supabase = createSupabaseServiceClient();
  const { count, error } = await supabase
    .from(table)
    .select("id", { count: "exact", head: true })
    .eq("discovery_run_id", runId);
  if (error) throw new Error(error.message);
  return count ?? 0;
}

async function countCandidatesByStatus(runId: string, status: string) {
  const supabase = createSupabaseServiceClient();
  const { count, error } = await supabase
    .from("lead_candidates")
    .select("id", { count: "exact", head: true })
    .eq("discovery_run_id", runId)
    .eq("candidate_status", status);
  if (error) throw new Error(error.message);
  return count ?? 0;
}

async function countPromotedCandidates(runId: string) {
  const supabase = createSupabaseServiceClient();
  const { count, error } = await supabase
    .from("lead_candidates")
    .select("id", { count: "exact", head: true })
    .eq("discovery_run_id", runId)
    .not("final_lead_id", "is", null);
  if (error) throw new Error(error.message);
  return count ?? 0;
}

async function countFailedCrawls(runId: string) {
  const supabase = createSupabaseServiceClient();
  const { count, error } = await supabase
    .from("lead_candidates")
    .select("id", { count: "exact", head: true })
    .eq("discovery_run_id", runId)
    .eq("website_crawl_status", "failed");
  if (error) throw new Error(error.message);
  return count ?? 0;
}

async function getDiscoveryRun(runId: string) {
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from("discovery_runs")
    .select("id,campaign_id,status,candidates_checked,places_text_search_calls,places_details_calls,total_places_calls,duplicates_skipped,candidates_rejected,candidates_promoted,manual_review_candidates,crawl_failures,error_message,started_at")
    .eq("id", runId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data as DiscoveryRunRow | null;
}

async function persistedDuplicateCount(runId: string) {
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from("workflow_events")
    .select("payload")
    .eq("discovery_run_id", runId)
    .eq("event_type", "lead_intake");

  if (error) return 0;
  return (data ?? []).reduce((sum, row) => sum + numberFrom(eventPayload(row).duplicates), 0);
}

async function repairCandidatePromotionConsistency(runId: string) {
  const supabase = createSupabaseServiceClient();
  const { error } = await supabase
    .from("lead_candidates")
    .update({ candidate_status: "details_fetched", rejection_reason: "promotion_reconciled_without_final_lead" })
    .eq("discovery_run_id", runId)
    .eq("candidate_status", "promoted")
    .is("final_lead_id", null);

  if (error) throw new Error(error.message);
}

export async function reconcileDiscoveryRunStats(runId: string, inMemoryStats: Partial<DiscoveryStats> = {}): Promise<DiscoveryStats> {
  const run = await getDiscoveryRun(runId);
  if (!run) throw new Error(`Discovery run not found: ${runId}`);
  await repairCandidatePromotionConsistency(runId);

  const [
    candidateCount,
    rejectedCount,
    manualReviewCount,
    duplicateCandidateCount,
    promotedCandidateCount,
    failedCrawlCount,
    createdLeadCount,
    duplicateEventsCount
  ] = await Promise.all([
    countRunRows("lead_candidates", runId),
    countCandidatesByStatus(runId, "rejected"),
    countCandidatesByStatus(runId, "manual_review"),
    countCandidatesByStatus(runId, "duplicate"),
    countPromotedCandidates(runId),
    countFailedCrawls(runId),
    countRunRows("leads", runId),
    persistedDuplicateCount(runId)
  ]);

  const duplicates = Math.max(inMemoryStats.duplicates ?? 0, run.duplicates_skipped ?? 0, duplicateEventsCount, duplicateCandidateCount);
  const textSearchCalls = Math.max(inMemoryStats.textSearchCalls ?? 0, run.places_text_search_calls ?? 0);
  const detailsCalls = Math.max(inMemoryStats.detailsCalls ?? 0, run.places_details_calls ?? 0, candidateCount);
  const created = Math.max(inMemoryStats.created ?? 0, run.candidates_promoted ?? 0, createdLeadCount, promotedCandidateCount);
  const reconciled = {
    created,
    duplicates,
    manualReview: Math.max(inMemoryStats.manualReview ?? 0, run.manual_review_candidates ?? 0, manualReviewCount),
    rejected: Math.max(inMemoryStats.rejected ?? 0, run.candidates_rejected ?? 0, rejectedCount),
    crawlFailures: Math.max(inMemoryStats.crawlFailures ?? 0, run.crawl_failures ?? 0, failedCrawlCount),
    candidatesChecked: Math.max(inMemoryStats.candidatesChecked ?? 0, run.candidates_checked ?? 0, candidateCount + duplicates),
    textSearchCalls,
    detailsCalls,
    enriched: inMemoryStats.enriched ?? 0,
    scored: inMemoryStats.scored ?? 0
  };

  await logWorkflowEvent({
    campaign_id: run.campaign_id,
    discovery_run_id: runId,
    event_type: "counts_reconciled",
    status: "completed",
    payload: { run_id: runId, stats: statsSummary(reconciled) }
  });

  return reconciled;
}

async function getCampaign(campaignId?: string) {
  const supabase = createSupabaseServiceClient();
  const query = supabase.from("campaigns").select("*").eq("status", "active").limit(1);
  const { data, error } = campaignId
    ? await query.eq("id", campaignId).maybeSingle()
    : await query.order("created_at", { ascending: true }).maybeSingle();

  if (error) throw new Error(error.message);
  return data as CampaignRow | null;
}

async function getCampaignById(campaignId: string) {
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase.from("campaigns").select("*").eq("id", campaignId).maybeSingle();
  if (error) throw new Error(error.message);
  return data as CampaignRow | null;
}

async function candidateExists(placeId: string) {
  const supabase = createSupabaseServiceClient();
  const [{ count: existingLeads }, { count: existingCandidates }] = await Promise.all([
    supabase.from("leads").select("*", { count: "exact", head: true }).eq("google_place_id", placeId),
    supabase.from("lead_candidates").select("*", { count: "exact", head: true }).eq("google_place_id", placeId)
  ]);

  return Boolean((existingLeads ?? 0) > 0 || (existingCandidates ?? 0) > 0);
}

async function isSuppressed(candidate: RawLeadInput) {
  const supabase = createSupabaseServiceClient();
  const domain = normalizeDomain(candidate.website);
  const phone = candidate.phone?.replaceAll(/\D/g, "") || null;

  const checks = [];
  if (candidate.email) checks.push(supabase.from("suppression_list").select("id", { count: "exact", head: true }).eq("normalized_email", candidate.email.toLowerCase()));
  if (domain) checks.push(supabase.from("suppression_list").select("id", { count: "exact", head: true }).eq("normalized_domain", domain));
  if (phone) checks.push(supabase.from("suppression_list").select("id", { count: "exact", head: true }).eq("normalized_phone", phone));
  if (checks.length === 0) return false;

  const results = await Promise.all(checks);
  return results.some((result) => (result.count ?? 0) > 0);
}

type CandidateValidation = {
  status: "details_fetched" | "rejected" | "manual_review";
  reason: string | null;
};

async function validateCandidate(candidate: RawLeadInput, campaign: CampaignRow): Promise<CandidateValidation> {
  if ((candidate.rating ?? campaign.min_google_rating) < campaign.min_google_rating) {
    return { status: "rejected", reason: "below_rating_threshold" };
  }
  if ((candidate.review_count ?? campaign.min_review_count) < campaign.min_review_count) {
    return { status: "rejected", reason: "below_review_threshold" };
  }
  if (hasExcludedTerm(candidate, campaign.exclude_cities)) {
    return { status: "rejected", reason: "excluded_city" };
  }
  const excludedKeywords = campaign.niche_keywords.filter((term) => term.startsWith("-"));
  if (hasExcludedTerm(candidate, excludedKeywords)) {
    return { status: "rejected", reason: "excluded_keyword" };
  }
  if (await isSuppressed(candidate)) {
    return { status: "rejected", reason: "suppressed" };
  }
  if (!candidate.website) {
    return { status: "manual_review", reason: "missing_website" };
  }
  return { status: "details_fetched", reason: null };
}

async function enrichCandidateFromWebsite(candidate: RawLeadInput) {
  if (!candidate.website) return { status: "skipped" as const, summary: null };

  const crawl = await crawlBusinessWebsite(candidate.website);
  if (crawl.status !== "success") {
    return { status: "failed" as const, summary: crawl.summary };
  }

  const signals = extractWebsiteSignals(crawl.pages);
  const selectedEmail = selectBestBusinessEmail(signals.emails, candidate.website);
  candidate.email = selectedEmail.email;
  candidate.phone = normalizePhone(candidate.phone) ?? signals.phones[0] ?? null;
  candidate.whatsapp = signals.whatsapp_found ? "visible" : null;
  candidate.source_attribution = {
    ...candidate.source_attribution,
    website_crawl_signals: {
      booking_link_found: signals.booking_link_found,
      contact_form_found: signals.contact_form_found,
      whatsapp_found: signals.whatsapp_found,
      chat_widget_found: signals.chat_widget_found,
      email_confidence: selectedEmail.confidence,
      email_reason: selectedEmail.reason,
      email_found: Boolean(selectedEmail.email),
      phone_found: Boolean(signals.phones[0]),
      raw_scrape_summary: signals.raw_scrape_summary
    }
  };

  return { status: "success" as const, summary: crawl.summary };
}


async function processLeadEnrichmentAndScoring(
  leadId: string,
  campaign: CampaignRow,
  runId: string
): Promise<{ enriched: boolean; scored: boolean; error?: string }> {
  let enriched = false;
  let scored = false;

  try {
    const enrichmentResult = await enrichLead(leadId);
    if (enrichmentResult.status === "failed") {
      await logWorkflowEvent({
        campaign_id: campaign.id,
        discovery_run_id: runId,
        event_type: "wf_02_enrichment",
        status: "failed",
        error_message: "Lead moved to manual review after failed enrichment",
        payload: { lead_id: leadId, enrichment_confidence: enrichmentResult.enrichment_confidence }
      });
    } else {
      enriched = true;
      await logWorkflowEvent({
        campaign_id: campaign.id,
        discovery_run_id: runId,
        event_type: "wf_02_enrichment",
        status: "completed",
        payload: { lead_id: leadId }
      });
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? `WF-02 enrichment failed for ${leadId}: ${error.message}` : `WF-02 enrichment failed for ${leadId}`;
    await logWorkflowEvent({
      campaign_id: campaign.id,
      discovery_run_id: runId,
      event_type: "wf_02_enrichment",
      status: "failed",
      error_message: error instanceof Error ? error.message : "Unknown enrichment error",
      payload: { lead_id: leadId }
    });
    return { enriched, scored, error: errorMsg };
  }

  try {
    await scoreLead(leadId);
    scored = true;
    await logWorkflowEvent({
      campaign_id: campaign.id,
      discovery_run_id: runId,
      event_type: "wf_03_scoring",
      status: "completed",
      payload: { lead_id: leadId }
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? `WF-03 scoring failed for ${leadId}: ${error.message}` : `WF-03 scoring failed for ${leadId}`;
    await logWorkflowEvent({
      campaign_id: campaign.id,
      discovery_run_id: runId,
      event_type: "wf_03_scoring",
      status: "failed",
      error_message: error instanceof Error ? error.message : "Unknown scoring error",
      payload: { lead_id: leadId }
    });
    return { enriched, scored, error: errorMsg };
  }

  return { enriched, scored };
}

export async function loadPromotableCandidatesFromDb(runId: string, campaignId: string): Promise<RawLeadInput[]> {
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from("lead_candidates")
    .select("id,business_name,normalized_payload")
    .eq("discovery_run_id", runId)
    .eq("campaign_id", campaignId)
    .eq("candidate_status", "details_fetched")
    .is("final_lead_id", null)
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => ({
    ...((row.normalized_payload as RawLeadInput | null) ?? {}),
    business_name: row.business_name,
    candidate_id: row.id,
    campaign_id: campaignId,
    discovery_run_id: runId
  }));
}

async function promoteAndProcessLeads(
  promotableLeads: RawLeadInput[],
  campaign: CampaignRow,
  runId: string,
  dryRun: boolean
) {
  const results: PromotionResults = {
    created: 0,
    duplicates: 0,
    enriched: 0,
    scored: 0,
    routing: { queued: 0, drafted: 0 },
    errors: []
  };
  const candidateCount = promotableLeads.length;
  const basePayload = {
    runId,
    campaignId: campaign.id,
    candidateCount,
    promotableCount: candidateCount
  };

  if (dryRun || promotableLeads.length === 0) {
    await logDiscoveryCheckpoint({
      campaign,
      runId,
      eventType: "promotion_completed",
      payload: promotionCheckpointPayload(basePayload)
    });
    return results;
  }

  await logDiscoveryCheckpoint({
    campaign,
    runId,
    eventType: "import_started",
    payload: promotionCheckpointPayload(basePayload)
  });
  const importResult = await importDiscoveredLeads(
    {
      niche: campaign.primary_niche ?? campaign.niche,
      location: campaign.target_countries[0] ?? campaign.region,
      max_results: Math.min(campaign.max_leads_per_run, discoveryLimits.maxFinalLeadsPerDay)
    },
    promotableLeads
  );

  results.created = importResult.created;
  results.duplicates = importResult.duplicates;
  results.errors.push(...importResult.errors);
  await logDiscoveryCheckpoint({
    campaign,
    runId,
    eventType: "import_completed",
    payload: promotionCheckpointPayload({
      ...basePayload,
      createdCount: results.created,
      duplicateCount: results.duplicates,
      errorCount: results.errors.length
    })
  });

  await logDiscoveryCheckpoint({
    campaign,
    runId,
    eventType: "enrichment_scoring_started",
    payload: promotionCheckpointPayload({
      ...basePayload,
      createdCount: results.created,
      duplicateCount: results.duplicates,
      errorCount: results.errors.length
    })
  });
  for (const leadId of importResult.created_lead_ids ?? []) {
    const { enriched, scored, error } = await processLeadEnrichmentAndScoring(leadId, campaign, runId);
    if (enriched) results.enriched += 1;
    if (scored) results.scored += 1;
    if (error) results.errors.push(error);
  }
  await logDiscoveryCheckpoint({
    campaign,
    runId,
    eventType: "enrichment_scoring_completed",
    payload: promotionCheckpointPayload({
      ...basePayload,
      createdCount: results.created,
      duplicateCount: results.duplicates,
      enrichedCount: results.enriched,
      scoredCount: results.scored,
      errorCount: results.errors.length
    })
  });

  for (let i = 0; i < results.created; i += 1) {
    await reserveQuota(campaign, "final_leads", campaign.max_leads_per_run);
  }

  await logDiscoveryCheckpoint({
    campaign,
    runId,
    eventType: "promotion_completed",
    payload: promotionCheckpointPayload({
      ...basePayload,
      createdCount: results.created,
      duplicateCount: results.duplicates,
      enrichedCount: results.enriched,
      scoredCount: results.scored,
      errorCount: results.errors.length
    })
  });

  return results;
}

type CandidateProcessingResult = {
  candidate?: RawLeadInput;
  quotaExhausted: boolean;
};

type CrawlResult = {
  crawlStatus: "pending" | "skipped" | "success" | "failed";
  crawlSummary: string | null;
  crawlFailures: number;
};

function resolveCrawlStatus(
  enrichment: { status: "success" | "failed" | "skipped"; summary: string | null }
): CrawlResult {
  if (enrichment.status === "success") {
    return { crawlStatus: "success", crawlSummary: enrichment.summary, crawlFailures: 0 };
  }
  if (enrichment.status === "failed") {
    return { crawlStatus: "failed", crawlSummary: enrichment.summary, crawlFailures: 1 };
  }
  return { crawlStatus: "skipped", crawlSummary: enrichment.summary, crawlFailures: 0 };
}

function buildCandidateFromDetails(
  details: PlacesDetails,
  campaign: CampaignRow,
  queryText: string
): RawLeadInput | null {
  const businessName = details.displayName?.text?.trim();
  if (!businessName || !details.formattedAddress) return null;

  const candidate: RawLeadInput = {
    business_name: businessName,
    website: details.websiteUri ?? null,
    city: cityFromAddress(details.formattedAddress, campaign.target_cities[0] ?? campaign.region),
    country: countryFromAddress(details.formattedAddress, campaign.target_countries[0] ?? campaign.region),
    niche: campaign.primary_niche ?? campaign.niche,
    source: "google_places",
    google_place_id: details.id,
    google_maps_url: details.googleMapsUri ?? null,
    phone: normalizePhone(details.nationalPhoneNumber) ?? null,
    rating: details.rating ?? null,
    review_count: details.userRatingCount ?? null,
    address: details.formattedAddress,
    source_attribution: {
      provider: "google_places",
      query: queryText,
      field_mask: getDetailsFieldMask(),
      retrieved_at: new Date().toISOString()
    }
  };
  candidate.dedupe_key = buildLeadDedupeKey(candidate);
  return candidate;
}

type InsertCandidateInput = {
  candidate: RawLeadInput;
  details: PlacesDetails;
  campaign: CampaignRow;
  runId: string;
  searchQueryId: string | null;
  validation: CandidateValidation;
  crawlStatus: CrawlResult["crawlStatus"];
  crawlSummary: string | null;
};

async function insertCandidateRecord(input: InsertCandidateInput): Promise<{ id: string } | null> {
  const { candidate, details, campaign, runId, searchQueryId, validation, crawlStatus, crawlSummary } = input;
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from("lead_candidates")
    .insert({
      campaign_id: campaign.id,
      discovery_run_id: runId,
      search_query_id: searchQueryId,
      google_place_id: candidate.google_place_id,
      business_name: candidate.business_name,
      website: candidate.website,
      domain: normalizeDomain(candidate.website),
      country: candidate.country,
      city: candidate.city,
      niche: candidate.niche,
      google_maps_url: candidate.google_maps_url,
      phone: candidate.phone,
      rating: candidate.rating,
      review_count: candidate.review_count,
      address: candidate.address,
      dedupe_key: candidate.dedupe_key,
      source_attribution: candidate.source_attribution,
      raw_place_payload: details,
      normalized_payload: candidate,
      website_crawl_status: crawlStatus,
      website_crawl_summary: crawlSummary,
      candidate_status: validation.status,
      rejection_reason: validation.reason
    })
    .select("id")
    .single();

  if (error) return null;
  return data;
}

async function processCandidatePlace(
  placeId: string,
  campaign: CampaignRow,
  runId: string,
  searchQueryId: string | null,
  queryText: string,
  stats: { duplicates: number; rejected: number; manualReview: number; crawlFailures: number; candidatesChecked: number; detailsCalls: number; },
  errors: string[]
): Promise<CandidateProcessingResult> {
  if (!(await reserveQuota(campaign, "candidates_checked", campaign.max_candidates_per_day))) {
    return { quotaExhausted: true };
  }
  stats.candidatesChecked += 1;

  if (await candidateExists(placeId)) {
    stats.duplicates += 1;
    return { quotaExhausted: false };
  }

  if (!(await reserveQuota(campaign, "places_details_calls", campaign.max_details_calls_per_day))) {
    return { quotaExhausted: true };
  }
  stats.detailsCalls += 1;

  let details: PlacesDetails;
  try {
    details = await placeDetails(placeId);
  } catch (error) {
    errors.push(error instanceof Error ? error.message : `Details failed for ${placeId}`);
    return { quotaExhausted: false };
  }

  const candidate = buildCandidateFromDetails(details, campaign, queryText);
  if (!candidate) {
    stats.rejected += 1;
    return { quotaExhausted: false };
  }

  const validation = await validateCandidate(candidate, campaign);
  if (validation.status === "rejected") stats.rejected += 1;
  if (validation.status === "manual_review") stats.manualReview += 1;

  let crawlStatus: CrawlResult["crawlStatus"] = candidate.website ? "pending" : "skipped";
  let crawlSummary: string | null = null;

  let finalValidation = validation;
  if (validation.status === "details_fetched" && campaign.crawl_website && candidate.website) {
    const enrichment = await enrichCandidateFromWebsite(candidate);
    const resolved = resolveCrawlStatus(enrichment);
    crawlStatus = resolved.crawlStatus;
    crawlSummary = resolved.crawlSummary;
    stats.crawlFailures += resolved.crawlFailures;

    const crawlSignals = candidate.source_attribution?.website_crawl_signals as Record<string, unknown> | undefined;
    const hasReachableContact = Boolean(candidate.email || candidate.phone || candidate.whatsapp || crawlSignals?.contact_form_found);
    if (!hasReachableContact) {
      finalValidation = { status: "manual_review", reason: "no_reachable_contact" };
      stats.manualReview += 1;
    }
  }

  const inserted = await insertCandidateRecord({ candidate, details, campaign, runId, searchQueryId, validation: finalValidation, crawlStatus, crawlSummary });
  if (!inserted) {
    errors.push(`Failed to insert candidate for place ${placeId}`);
    return { quotaExhausted: false };
  }

  if (finalValidation.status === "details_fetched") {
    return {
      candidate: { ...candidate, candidate_id: inserted.id, campaign_id: campaign.id, discovery_run_id: runId },
      quotaExhausted: false
    };
  }

  return { quotaExhausted: false };
}

async function executeSearchQueries(
  queries: string[],
  campaign: CampaignRow,
  runId: string,
  stats: DiscoveryStats,
  errors: string[]
): Promise<{ promotable: RawLeadInput[]; quotaExhausted: boolean }> {
  const supabase = createSupabaseServiceClient();
  const promotable: RawLeadInput[] = [];
  let quotaExhausted = false;

  await logDiscoveryCheckpoint({
    campaign,
    runId,
    eventType: "query_loop_started",
    payload: { query_count: queries.length, stats: statsSummary(stats) }
  });

  for (const [queryIndex, queryText] of queries.entries()) {
    if (!(await reserveQuota(campaign, "places_text_search_calls", 50))) {
      quotaExhausted = true;
      break;
    }
    stats.textSearchCalls += 1;
    await logDiscoveryCheckpoint({
      campaign,
      runId,
      eventType: "query_quota_reserved",
      payload: {
        query_count: queries.length,
        query_index: queryIndex,
        query_text_preview: queryPreview(queryText),
        stats: statsSummary(stats)
      }
    });

    const { data: searchQuery, error: searchQueryError } = await supabase
      .from("campaign_search_queries")
      .upsert(
        { campaign_id: campaign.id, query_text: queryText, region: campaign.region, last_run_at: new Date().toISOString() },
        { onConflict: "campaign_id,query_text,region" }
      )
      .select("id")
      .single();
    if (searchQueryError) throw new Error(searchQueryError.message);
    await logDiscoveryCheckpoint({
      campaign,
      runId,
      eventType: "search_query_upserted",
      payload: {
        query_count: queries.length,
        query_index: queryIndex,
        query_text_preview: queryPreview(queryText),
        search_query_id: searchQuery?.id ?? null,
        stats: statsSummary(stats)
      }
    });

    let searchResult: PlacesSearchResult;
    try {
      await logDiscoveryCheckpoint({
        campaign,
        runId,
        eventType: "text_search_started",
        payload: {
          query_count: queries.length,
          query_index: queryIndex,
          query_text_preview: queryPreview(queryText),
          stats: statsSummary(stats)
        }
      });
      searchResult = await textSearch(queryText);
      await logDiscoveryCheckpoint({
        campaign,
        runId,
        eventType: "text_search_completed",
        payload: {
          query_count: queries.length,
          query_index: queryIndex,
          query_text_preview: queryPreview(queryText),
          places_count: searchResult.places?.length ?? 0,
          stats: statsSummary(stats)
        }
      });
    } catch (error) {
      errors.push(error instanceof Error ? error.message : "Text Search failed");
      continue;
    }

    await logDiscoveryCheckpoint({
      campaign,
      runId,
      eventType: "place_processing_started",
      payload: {
        query_count: queries.length,
        query_index: queryIndex,
        query_text_preview: queryPreview(queryText),
        places_count: searchResult.places?.length ?? 0,
        stats: statsSummary(stats)
      }
    });

    const placeResult = await processSearchResultPlaces(
      searchResult.places ?? [],
      campaign,
      runId,
      searchQuery?.id ?? null,
      queryText,
      stats,
      errors
    );

    promotable.push(...placeResult.candidates);
    if (placeResult.quotaExhausted) {
      quotaExhausted = true;
      break;
    }

    if (promotable.length >= campaign.max_leads_per_run) break;
    await updateDiscoveryRunProgress(campaign, runId, stats);
  }

  await updateDiscoveryRunProgress(campaign, runId, stats);
  await logDiscoveryCheckpoint({
    campaign,
    runId,
    eventType: "execute_search_completed",
    payload: {
      query_count: queries.length,
      promotable_count: promotable.length,
      quota_exhausted: quotaExhausted,
      error_count: errors.length,
      stats: statsSummary(stats)
    }
  });

  return { promotable, quotaExhausted };
}

async function processSearchResultPlaces(
  places: Array<{ id: string }>,
  campaign: CampaignRow,
  runId: string,
  searchQueryId: string | null,
  queryText: string,
  stats: DiscoveryStats,
  errors: string[]
): Promise<{ candidates: RawLeadInput[]; quotaExhausted: boolean }> {
  const candidates: RawLeadInput[] = [];
  for (const place of places) {
    if (candidates.length >= campaign.max_leads_per_run) break;

    const result = await processCandidatePlace(place.id, campaign, runId, searchQueryId, queryText, stats, errors);
    if (result.quotaExhausted) return { candidates, quotaExhausted: true };
    if (result.candidate) candidates.push(result.candidate);
  }
  return { candidates, quotaExhausted: false };
}

function mapEventStatus(status: DiscoveryRunStatus): "completed" | "failed" | "blocked" {
  if (status === "failed") return "failed";
  return "completed";
}

function resolveRunStatus(
  quotaExhausted: boolean,
  errorsCount: number,
  createdCount = 0
): DiscoveryRunStatus {
  if (quotaExhausted) return "quota_exhausted";
  if (createdCount > 0) return "completed";
  if (errorsCount > 0) return "failed";
  return "completed";
}

async function updateDiscoveryRunProgress(
  campaign: Pick<CampaignRow, "id">,
  runId: string,
  stats: DiscoveryStats
) {
  const supabase = createSupabaseServiceClient();
  const { error } = await supabase
    .from("discovery_runs")
    .update({
      candidates_checked: stats.candidatesChecked,
      places_text_search_calls: stats.textSearchCalls,
      places_details_calls: stats.detailsCalls,
      total_places_calls: stats.textSearchCalls + stats.detailsCalls,
      duplicates_skipped: stats.duplicates,
      candidates_rejected: stats.rejected,
      candidates_promoted: stats.created,
      manual_review_candidates: stats.manualReview,
      crawl_failures: stats.crawlFailures
    })
    .eq("id", runId)
    .eq("status", "running");

  if (error) {
    await logWorkflowEvent({
      campaign_id: campaign.id,
      discovery_run_id: runId,
      event_type: "run_progress_persisted",
      status: "failed",
      error_message: error.message,
      payload: { run_id: runId, stats: statsSummary(stats) }
    });
    return;
  }

  await logDiscoveryCheckpoint({
    campaign,
    runId,
    eventType: "run_progress_persisted",
    payload: { stats: statsSummary(stats) }
  });
}

export async function safeFinalizeDiscoveryRun(
  campaign: Pick<CampaignRow, "id">,
  runId: string,
  stats: Partial<DiscoveryStats>,
  errors: string[],
  status: DiscoveryRunStatus
): Promise<{ status: DiscoveryRunStatus; stats: DiscoveryStats; finalized: boolean }> {
  const supabase = createSupabaseServiceClient();

  await logDiscoveryCheckpoint({
    campaign,
    runId,
    eventType: "finalize_started",
    payload: { status, error_count: errors.length, stats }
  });

  let reconciledStats: DiscoveryStats;
  let finalizationErrors = errors;
  try {
    reconciledStats = await reconcileDiscoveryRunStats(runId, stats);
  } catch (error) {
    const message = `Failed to reconcile discovery run counts: ${conciseError(error)}`;
    finalizationErrors = [message, ...errors];
    reconciledStats = { ...emptyDiscoveryStats(), ...stats };
    await logWorkflowEvent({
      campaign_id: campaign.id,
      discovery_run_id: runId,
      event_type: "counts_reconciled",
      status: "failed",
      error_message: message,
      payload: { run_id: runId, stats }
    });
  }

  const finalStatus = resolveRunStatus(status === "quota_exhausted", finalizationErrors.length, reconciledStats.created);
  const completedAt = new Date().toISOString();
  const persistedRun = await getDiscoveryRun(runId);
  const errorDetails = finalizationErrors.map((message) => ({ message, recorded_at: completedAt })).slice(0, 20);
  const { error } = await supabase
    .from("discovery_runs")
    .update({
      status: finalStatus,
      candidates_checked: reconciledStats.candidatesChecked,
      places_text_search_calls: reconciledStats.textSearchCalls,
      places_details_calls: reconciledStats.detailsCalls,
      total_places_calls: reconciledStats.textSearchCalls + reconciledStats.detailsCalls,
      duplicates_skipped: reconciledStats.duplicates,
      candidates_rejected: reconciledStats.rejected,
      candidates_promoted: reconciledStats.created,
      manual_review_candidates: reconciledStats.manualReview,
      crawl_failures: reconciledStats.crawlFailures,
      error_message: finalizationErrors[0] ?? null,
      error_details: errorDetails,
      completed_at: completedAt,
      duration_seconds: Math.max(0, Math.round((Date.parse(completedAt) - Date.parse(persistedRun?.started_at ?? completedAt)) / 1000))
    })
    .eq("id", runId);

  if (error) {
    await logWorkflowEvent({
      campaign_id: campaign.id,
      discovery_run_id: runId,
      event_type: "finalize_failed",
      status: "failed",
      error_message: error.message,
      payload: { run_id: runId, intended_status: finalStatus, error_count: finalizationErrors.length, stats: statsSummary(reconciledStats) }
    });

    const fallback = await supabase
      .from("discovery_runs")
      .update({
        status: "failed",
        error_message: `Failed to finalize discovery run: ${error.message}`,
        completed_at: completedAt
      })
      .eq("id", runId);

    return { status: "failed", stats: reconciledStats, finalized: !fallback.error };
  }

  await logDiscoveryCheckpoint({
    campaign,
    runId,
    eventType: "finalize_completed",
    payload: { status: finalStatus, error_count: finalizationErrors.length, stats: statsSummary(reconciledStats) }
  });

  await logDiscoveryCheckpoint({
    campaign,
    runId,
    eventType: "terminal_status_written",
    payload: { status: finalStatus, stats: statsSummary(reconciledStats) }
  });

  await logDiscoveryCheckpoint({
    campaign,
    runId,
    eventType: "run_finalized",
    payload: { status: finalStatus, error_count: finalizationErrors.length, stats: statsSummary(reconciledStats) }
  });

  await logWorkflowEvent({
    campaign_id: campaign.id,
    discovery_run_id: runId,
    event_type: "discovery_run",
    status: mapEventStatus(finalStatus),
    error_message: finalizationErrors[0],
    payload: { created: reconciledStats.created, duplicates: reconciledStats.duplicates, manual_review: reconciledStats.manualReview, enriched: reconciledStats.enriched, scored: reconciledStats.scored, errors_count: finalizationErrors.length }
  });

  return { status: finalStatus, stats: reconciledStats, finalized: true };
}

async function failDiscoveryRun(
  campaign: CampaignRow,
  runId: string,
  stats: DiscoveryStats,
  errors: string[]
) {
  const message = errors[0] ?? "Discovery run failed";
  return safeFinalizeDiscoveryRun(campaign, runId, stats, [message], "failed");
}

async function recoverStaleDiscoveryRun(run: DiscoveryRunRow) {
  const supabase = createSupabaseServiceClient();
  const { data: events } = await supabase
    .from("workflow_events")
    .select("event_type,status,error_message")
    .eq("discovery_run_id", run.id);

  const fatalEvent = (events ?? []).find((event) => event.status === "failed");
  const quotaEvent = (events ?? []).find((event) => event.event_type === "quota_enforced" && event.status === "blocked");
  const campaign = await getCampaignById(run.campaign_id);
  if (!campaign) throw new Error(`Campaign not found for stale discovery run: ${run.id}`);
  const promotable = await loadPromotableCandidatesFromDb(run.id, run.campaign_id);
  let recoveredPromotion = emptyDiscoveryStats();
  const recoveryErrors: string[] = [];
  if (promotable.length > 0) {
    await logDiscoveryCheckpoint({
      campaign,
      runId: run.id,
      eventType: "promotion_recovered",
      payload: { promotable_count: promotable.length }
    });
    const results = await promoteAndProcessLeads(promotable, campaign, run.id, false);
    recoveryErrors.push(...results.errors);
    recoveredPromotion = {
      ...recoveredPromotion,
      created: results.created,
      duplicates: results.duplicates,
      enriched: results.enriched,
      scored: results.scored
    };
    await logDiscoveryCheckpoint({
      campaign,
      runId: run.id,
      eventType: "enrichment_scoring_recovered",
      payload: { created: results.created, enriched: results.enriched, scored: results.scored, errors_count: results.errors.length }
    });
  }
  const { data: unscoredLeads, error: unscoredLeadsError } = await supabase
    .from("leads")
    .select("id,lead_scores()")
    .eq("discovery_run_id", run.id)
    .is("lead_scores", null)
    .order("created_at", { ascending: true });
  if (unscoredLeadsError) throw new Error(unscoredLeadsError.message);
  let recoveredEnriched = 0;
  let recoveredScored = 0;
  for (const lead of unscoredLeads ?? []) {
    const result = await processLeadEnrichmentAndScoring(lead.id, campaign, run.id);
    if (result.enriched) recoveredEnriched += 1;
    if (result.scored) recoveredScored += 1;
    if (result.error) recoveryErrors.push(result.error);
  }
  if ((unscoredLeads ?? []).length > 0) {
    await logDiscoveryCheckpoint({
      campaign,
      runId: run.id,
      eventType: "enrichment_scoring_recovered",
      payload: { recovered_leads: unscoredLeads?.length ?? 0, enriched: recoveredEnriched, scored: recoveredScored, errors_count: recoveryErrors.length }
    });
  }
  const reconciled = await reconcileDiscoveryRunStats(run.id, recoveredPromotion);
  const errors = [
    ...(fatalEvent?.error_message ? [fatalEvent.error_message] : run.error_message ? [run.error_message] : []),
    ...recoveryErrors
  ];
  let status: DiscoveryRunStatus = "failed";
  if (quotaEvent) {
    status = "quota_exhausted";
  } else if (!fatalEvent && (reconciled.created > 0 || reconciled.candidatesChecked > 0)) {
    status = "completed";
  }

  const finalized = await safeFinalizeDiscoveryRun(
    { id: run.campaign_id },
    run.id,
    reconciled,
    status === "failed" && errors.length === 0 ? ["Recovered stale discovery run with no persisted progress"] : errors,
    status
  );

  await logWorkflowEvent({
    campaign_id: run.campaign_id,
    discovery_run_id: run.id,
    event_type: "stale_run_recovered",
    status: finalized.finalized ? "completed" : "failed",
    error_message: finalized.finalized ? undefined : "Stale run recovery finalization failed",
    payload: { run_id: run.id, recovered_status: finalized.status, stats: statsSummary(finalized.stats) }
  });
}

export async function recoverStaleDiscoveryRuns(campaignId?: string) {
  const supabase = createSupabaseServiceClient();
  let query = supabase
    .from("discovery_runs")
    .select("id,campaign_id,status,candidates_checked,places_text_search_calls,places_details_calls,total_places_calls,duplicates_skipped,candidates_rejected,candidates_promoted,manual_review_candidates,crawl_failures,error_message,started_at")
    .eq("status", "running")
    .lt("started_at", staleRunCutoffIso())
    .order("started_at", { ascending: true })
    .limit(25);

  if (campaignId) query = query.eq("campaign_id", campaignId);
  const { data, error } = await query;
  if (error) throw new Error(error.message);

  for (const run of (data ?? []) as DiscoveryRunRow[]) {
    await recoverStaleDiscoveryRun(run);
  }

  return { recovered: data?.length ?? 0 };
}

async function getActiveDiscoveryRun(campaignId: string) {
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from("discovery_runs")
    .select("id,campaign_id,status,candidates_checked,places_text_search_calls,places_details_calls,total_places_calls,duplicates_skipped,candidates_rejected,candidates_promoted,manual_review_candidates,crawl_failures,error_message,started_at")
    .eq("campaign_id", campaignId)
    .eq("status", "running")
    .gte("started_at", staleRunCutoffIso())
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data as DiscoveryRunRow | null;
}

export async function runLeadDiscovery(input: RunLeadDiscoveryInput = {}): Promise<RunLeadDiscoveryOutput> {
  const supabase = createSupabaseServiceClient();
  const campaign = await getCampaign(input.campaign_id);

  if (!campaign) {
    return discoveryOutput({
      campaign: null,
      runId: null,
      status: "paused",
      errors: ["No active campaign found"]
    });
  }
  await logDiscoveryCheckpoint({
    campaign,
    runId: null,
    eventType: "get_campaign_loaded",
    payload: {
      requested_campaign_id: input.campaign_id ?? null,
      dry_run: Boolean(input.dry_run),
      trigger_type: input.trigger_type ?? (input.dry_run ? "manual" : "schedule")
    }
  });

  await recoverStaleDiscoveryRuns(campaign.id);
  const activeRun = await getActiveDiscoveryRun(campaign.id);
  if (activeRun) {
    const message = "A discovery run is already in progress";
    await logWorkflowEvent({
      campaign_id: campaign.id,
      discovery_run_id: activeRun.id,
      event_type: "discovery_run_start_blocked",
      status: "blocked",
      error_message: message,
      payload: { run_id: activeRun.id }
    });
    return discoveryOutput({
      campaign,
      runId: activeRun.id,
      status: "running",
      errors: [message],
      message
    });
  }

  if (!(await reserveQuota(campaign, "run_count", campaign.max_discovery_runs_per_day))) {
    await logWorkflowEvent({ campaign_id: campaign.id, event_type: "quota_enforced", status: "blocked", payload: { counter: "run_count" } });
    return discoveryOutput({
      campaign,
      runId: null,
      status: "quota_exhausted",
      errors: ["Daily discovery run cap reached"]
    });
  }
  await logDiscoveryCheckpoint({
    campaign,
    runId: null,
    eventType: "run_quota_reserved",
    payload: { max_discovery_runs_per_day: campaign.max_discovery_runs_per_day }
  });

  const { data: run, error: runError } = await supabase
    .from("discovery_runs")
    .insert({ campaign_id: campaign.id, trigger_type: input.trigger_type ?? (input.dry_run ? "manual" : "schedule"), source: "google_places" })
    .select("id")
    .single();

  if (runError) throw new Error(runError.message);

  const runId = run.id as string;
  const errors: string[] = [];
  const stats = emptyDiscoveryStats();
  await logDiscoveryCheckpoint({
    campaign,
    runId,
    eventType: "run_inserted",
    payload: { stats: statsSummary(stats) }
  });

  try {
    await logWorkflowEvent({ campaign_id: campaign.id, discovery_run_id: runId, event_type: "discovery_run", status: "started" });

    const queries = buildQueries(campaign);
    await logDiscoveryCheckpoint({
      campaign,
      runId,
      eventType: "queries_built",
      payload: { query_count: queries.length, stats: statsSummary(stats) }
    });
    if (queries.length === 0) {
      throw new Error("No Google Places search queries were generated for this campaign");
    }

    const { promotable: searchedPromotable, quotaExhausted } = await executeSearchQueries(queries, campaign, runId, stats, errors);
    const promotable = input.dry_run
      ? searchedPromotable
      : await loadPromotableCandidatesFromDb(runId, campaign.id);

    await logDiscoveryCheckpoint({
      campaign,
      runId,
      eventType: "promotion_started",
      payload: { promotable_count: promotable.length, persisted_reload: !input.dry_run, stats: statsSummary(stats) }
    });
    const promotionResults = await promoteAndProcessLeads(promotable, campaign, runId, !!input.dry_run);
    stats.created = promotionResults.created;
    stats.duplicates += promotionResults.duplicates;
    stats.enriched = promotionResults.enriched;
    stats.scored = promotionResults.scored;
    errors.push(...promotionResults.errors);
    if (!input.dry_run && promotable.length > 0 && stats.created === 0) {
      const message = `No leads promoted from ${promotable.length} fetched candidates`;
      errors.unshift(message);
      await logWorkflowEvent({
        campaign_id: campaign.id,
        discovery_run_id: runId,
        event_type: "promotion_completed",
        status: "failed",
        error_message: message,
        payload: promotionCheckpointPayload({
          runId,
          campaignId: campaign.id,
          candidateCount: promotable.length,
          promotableCount: promotable.length,
          createdCount: stats.created,
          duplicateCount: stats.duplicates,
          enrichedCount: stats.enriched,
          scoredCount: stats.scored,
          errorCount: errors.length
        })
      });
    }

    const status = resolveRunStatus(quotaExhausted, errors.length, stats.created);
    const finalized = await safeFinalizeDiscoveryRun(campaign, runId, stats, errors, status);

    return discoveryOutput({
      campaign,
      runId,
      status: finalized.status,
      stats: finalized.stats,
      routing: promotionResults.routing,
      errors
    });
  } catch (error) {
    const message = conciseError(error);
    errors.unshift(message);
    const finalized = await failDiscoveryRun(campaign, runId, stats, errors);
    return discoveryOutput({
      campaign,
      runId,
      status: finalized.status,
      stats: finalized.stats,
      errors
    });
  }
}
