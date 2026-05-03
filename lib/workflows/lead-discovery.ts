import { discoveryLimits } from "@/lib/contracts";
import { getRequiredEnv } from "@/lib/env";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { buildLeadDedupeKey, importDiscoveredLeads, type RawLeadInput } from "@/lib/workflows/discovery";
import { enrichLead } from "@/lib/workflows/enrichment";
import { scoreLead } from "@/lib/workflows/scoring";
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
};

type DiscoveryRunStatus = "completed" | "failed" | "quota_exhausted";

export type RunLeadDiscoveryOutput = {
  run_id: string | null;
  status: DiscoveryRunStatus | "paused";
  created: number;
  duplicates: number;
  manual_review: number;
  errors: string[];
};

const textSearchFieldMask = "places.id,nextPageToken";
const defaultDetailsFieldMask = "id,displayName,formattedAddress,nationalPhoneNumber,websiteUri,rating,userRatingCount,googleMapsUri";
const allowedDetailsFields = new Set(defaultDetailsFieldMask.split(","));

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
  const response = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-goog-api-key": apiKey,
      "x-goog-fieldmask": textSearchFieldMask
    },
    body: JSON.stringify({ textQuery: query, pageSize: 20 })
  });

  if (!response.ok) throw new Error(`Google Places Text Search failed: ${response.status}`);
  return response.json() as Promise<PlacesSearchResult>;
}

async function placeDetails(placeId: string) {
  const apiKey = getRequiredEnv("GOOGLE_PLACES_API_KEY");
  const detailsFieldMask = getDetailsFieldMask();
  const response = await fetch(`https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`, {
    headers: {
      "x-goog-api-key": apiKey,
      "x-goog-fieldmask": detailsFieldMask
    }
  });

  if (!response.ok) throw new Error(`Google Places Details failed: ${response.status}`);
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

async function getCampaign(campaignId?: string) {
  const supabase = createSupabaseServiceClient();
  const query = supabase.from("campaigns").select("*").eq("status", "active").limit(1);
  const { data, error } = campaignId
    ? await query.eq("id", campaignId).maybeSingle()
    : await query.order("created_at", { ascending: true }).maybeSingle();

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
  candidate.email = signals.emails[0] ?? null;
  candidate.phone = candidate.phone ?? signals.phones[0] ?? null;
  candidate.whatsapp = signals.whatsapp_found ? "visible" : null;
  candidate.source_attribution = {
    ...candidate.source_attribution,
    website_crawl_signals: {
      booking_link_found: signals.booking_link_found,
      contact_form_found: signals.contact_form_found,
      whatsapp_found: signals.whatsapp_found,
      chat_widget_found: signals.chat_widget_found,
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

async function promoteAndProcessLeads(
  promotableLeads: RawLeadInput[],
  campaign: CampaignRow,
  runId: string,
  dryRun: boolean
) {
  const supabase = createSupabaseServiceClient();
  const results = { created: 0, duplicates: 0, enriched: 0, scored: 0, errors: [] as string[] };

  if (dryRun || promotableLeads.length === 0) return results;

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

  for (const leadId of importResult.created_lead_ids ?? []) {
    const { enriched, scored, error } = await processLeadEnrichmentAndScoring(leadId, campaign, runId);
    if (enriched) results.enriched += 1;
    if (scored) results.scored += 1;
    if (error) results.errors.push(error);
  }

  for (const lead of promotableLeads) {
    if (lead.candidate_id) {
      await supabase
        .from("lead_candidates")
        .update({ candidate_status: "promoted" })
        .eq("id", lead.candidate_id)
        .is("final_lead_id", null);
    }
  }

  for (let i = 0; i < results.created; i += 1) {
    await reserveQuota(campaign, "final_leads", campaign.max_leads_per_run);
  }

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
    source: (campaign.lead_source as "google_places" | "manual_import") || "google_places",
    google_place_id: details.id,
    google_maps_url: details.googleMapsUri ?? null,
    phone: details.nationalPhoneNumber ?? null,
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

  if (validation.status === "details_fetched" && campaign.crawl_website && candidate.website) {
    const enrichment = await enrichCandidateFromWebsite(candidate);
    const resolved = resolveCrawlStatus(enrichment);
    crawlStatus = resolved.crawlStatus;
    crawlSummary = resolved.crawlSummary;
    stats.crawlFailures += resolved.crawlFailures;
  }

  const inserted = await insertCandidateRecord({ candidate, details, campaign, runId, searchQueryId, validation, crawlStatus, crawlSummary });
  if (!inserted) {
    errors.push(`Failed to insert candidate for place ${placeId}`);
    return { quotaExhausted: false };
  }

  if (validation.status === "details_fetched") {
    return {
      candidate: { ...candidate, candidate_id: inserted.id, campaign_id: campaign.id, discovery_run_id: runId },
      quotaExhausted: false
    };
  }

  return { quotaExhausted: false };
}

type DiscoveryStats = {
  created: number; duplicates: number; manualReview: number; rejected: number;
  crawlFailures: number; candidatesChecked: number; textSearchCalls: number;
  detailsCalls: number; enriched: number; scored: number;
};

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

  for (const queryText of queries) {
    if (!(await reserveQuota(campaign, "places_text_search_calls", 50))) {
      quotaExhausted = true;
      break;
    }
    stats.textSearchCalls += 1;

    const { data: searchQuery } = await supabase
      .from("campaign_search_queries")
      .upsert(
        { campaign_id: campaign.id, query_text: queryText, region: campaign.region, last_run_at: new Date().toISOString() },
        { onConflict: "campaign_id,query_text,region" }
      )
      .select("id")
      .single();

    let searchResult: PlacesSearchResult;
    try {
      searchResult = await textSearch(queryText);
    } catch (error) {
      errors.push(error instanceof Error ? error.message : "Text Search failed");
      continue;
    }

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
  }

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

function resolveRunStatus(
  quotaExhausted: boolean,
  errorsCount: number
): DiscoveryRunStatus {
  if (quotaExhausted) return "quota_exhausted";
  if (errorsCount > 0) return "failed";
  return "completed";
}

function mapEventStatus(status: DiscoveryRunStatus): "completed" | "failed" | "blocked" {
  if (status === "quota_exhausted") return "blocked";
  if (status === "failed") return "failed";
  return "completed";
}

async function finalizeDiscoveryRun(
  campaign: CampaignRow,
  runId: string,
  stats: DiscoveryStats,
  errors: string[],
  status: DiscoveryRunStatus
): Promise<void> {
  const supabase = createSupabaseServiceClient();

  await supabase
    .from("discovery_runs")
    .update({
      status,
      candidates_checked: stats.candidatesChecked,
      places_text_search_calls: stats.textSearchCalls,
      places_details_calls: stats.detailsCalls,
      total_places_calls: stats.textSearchCalls + stats.detailsCalls,
      duplicates_skipped: stats.duplicates,
      candidates_rejected: stats.rejected,
      candidates_promoted: stats.created,
      manual_review_candidates: stats.manualReview,
      crawl_failures: stats.crawlFailures,
      error_message: errors[0] ?? null,
      completed_at: new Date().toISOString()
    })
    .eq("id", runId);

  await logWorkflowEvent({
    campaign_id: campaign.id,
    discovery_run_id: runId,
    event_type: "discovery_run",
    status: mapEventStatus(status),
    error_message: errors[0],
    payload: { created: stats.created, duplicates: stats.duplicates, manual_review: stats.manualReview, enriched: stats.enriched, scored: stats.scored, errors_count: errors.length }
  });
}

export async function runLeadDiscovery(input: RunLeadDiscoveryInput = {}): Promise<RunLeadDiscoveryOutput> {
  const supabase = createSupabaseServiceClient();
  const campaign = await getCampaign(input.campaign_id);

  if (!campaign) {
    return { run_id: null, status: "paused", created: 0, duplicates: 0, manual_review: 0, errors: ["No active campaign found"] };
  }

  if (!(await reserveQuota(campaign, "run_count", campaign.max_discovery_runs_per_day))) {
    await logWorkflowEvent({ campaign_id: campaign.id, event_type: "quota_enforced", status: "blocked", payload: { counter: "run_count" } });
    return { run_id: null, status: "quota_exhausted", created: 0, duplicates: 0, manual_review: 0, errors: ["Daily discovery run cap reached"] };
  }

  const { data: run, error: runError } = await supabase
    .from("discovery_runs")
    .insert({ campaign_id: campaign.id, trigger_type: input.dry_run ? "manual" : "schedule", source: campaign.lead_source })
    .select("id")
    .single();

  if (runError) throw new Error(runError.message);

  const runId = run.id as string;
  const errors: string[] = [];
  const stats: DiscoveryStats = { created: 0, duplicates: 0, manualReview: 0, rejected: 0, crawlFailures: 0, candidatesChecked: 0, textSearchCalls: 0, detailsCalls: 0, enriched: 0, scored: 0 };

  await logWorkflowEvent({ campaign_id: campaign.id, discovery_run_id: runId, event_type: "discovery_run", status: "started" });

  const queries = buildQueries(campaign);
  const { promotable, quotaExhausted } = await executeSearchQueries(queries, campaign, runId, stats, errors);

  const promotionResults = await promoteAndProcessLeads(promotable, campaign, runId, !!input.dry_run);
  stats.created = promotionResults.created;
  stats.duplicates += promotionResults.duplicates;
  stats.enriched = promotionResults.enriched;
  stats.scored = promotionResults.scored;
  errors.push(...promotionResults.errors);

  const status = resolveRunStatus(quotaExhausted, errors.length);
  await finalizeDiscoveryRun(campaign, runId, stats, errors, status);

  return { run_id: runId, status, created: stats.created, duplicates: stats.duplicates, manual_review: stats.manualReview, errors };
}
