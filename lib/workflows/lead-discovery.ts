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
  keywords: string[];
  excluded_keywords: string[];
  target_business_types: string[];
  max_leads_per_day: number;
  max_candidates_per_day: number;
  max_details_calls_per_day: number;
  max_total_places_calls_per_day: number;
  max_discovery_runs_per_day: number;
  crawl_website: boolean;
  status: "active" | "paused" | "archived";
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

export type RunLeadDiscoveryOutput = {
  run_id: string | null;
  status: "completed" | "failed" | "quota_exhausted" | "paused";
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
  return parts.length >= 2 ? parts[parts.length - 2] : fallback ?? null;
}

function countryFromAddress(address?: string | null, fallback?: string | null) {
  if (!address) return fallback ?? null;
  const parts = address.split(",").map((part) => part.trim()).filter(Boolean);
  return parts.at(-1) ?? fallback ?? null;
}

function buildQueries(campaign: CampaignRow) {
  const baseTerms = [
    campaign.niche,
    ...campaign.target_business_types.slice(0, 2),
    ...campaign.keywords.slice(0, 2)
  ]
    .map((term) => term.trim())
    .filter(Boolean);

  const uniqueTerms = [...new Set(baseTerms.length ? baseTerms : [campaign.niche])];
  return uniqueTerms.slice(0, 3).map((term) => `${term} in ${campaign.region}`);
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
  const phone = candidate.phone?.replace(/\D/g, "") || null;

  const checks = [];
  if (candidate.email) checks.push(supabase.from("suppression_list").select("id", { count: "exact", head: true }).eq("normalized_email", candidate.email.toLowerCase()));
  if (domain) checks.push(supabase.from("suppression_list").select("id", { count: "exact", head: true }).eq("normalized_domain", domain));
  if (phone) checks.push(supabase.from("suppression_list").select("id", { count: "exact", head: true }).eq("normalized_phone", phone));
  if (checks.length === 0) return false;

  const results = await Promise.all(checks);
  return results.some((result) => (result.count ?? 0) > 0);
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
    .insert({ campaign_id: campaign.id, trigger_type: input.dry_run ? "manual" : "schedule" })
    .select("id")
    .single();

  if (runError) throw new Error(runError.message);

  const runId = run.id as string;
  const errors: string[] = [];
  let created = 0;
  let duplicates = 0;
  let manualReview = 0;
  let rejected = 0;
  let crawlFailures = 0;
  let candidatesChecked = 0;
  let textSearchCalls = 0;
  let detailsCalls = 0;
  let enriched = 0;
  let scored = 0;
  let quotaExhausted = false;

  await logWorkflowEvent({ campaign_id: campaign.id, discovery_run_id: runId, event_type: "discovery_run", status: "started" });

  const promotable: RawLeadInput[] = [];
  const queries = buildQueries(campaign);

  for (const queryText of queries) {
    if (!(await reserveQuota(campaign, "places_text_search_calls", 50))) {
      quotaExhausted = true;
      break;
    }
    textSearchCalls += 1;

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

    for (const place of searchResult.places ?? []) {
      if (promotable.length >= campaign.max_leads_per_day) break;

      if (!(await reserveQuota(campaign, "candidates_checked", campaign.max_candidates_per_day))) {
        quotaExhausted = true;
        break;
      }
      candidatesChecked += 1;

      if (await candidateExists(place.id)) {
        duplicates += 1;
        continue;
      }

      if (!(await reserveQuota(campaign, "places_details_calls", campaign.max_details_calls_per_day))) {
        quotaExhausted = true;
        break;
      }
      detailsCalls += 1;

      let details: PlacesDetails;
      try {
        details = await placeDetails(place.id);
      } catch (error) {
        errors.push(error instanceof Error ? error.message : `Details failed for ${place.id}`);
        continue;
      }

      const businessName = details.displayName?.text?.trim();
      if (!businessName || !details.formattedAddress) {
        rejected += 1;
        continue;
      }

      const candidate: RawLeadInput = {
        business_name: businessName,
        website: details.websiteUri ?? null,
        city: cityFromAddress(details.formattedAddress, campaign.region),
        country: countryFromAddress(details.formattedAddress, campaign.region),
        niche: campaign.niche,
        source: "google_places",
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

      let candidateStatus: "details_fetched" | "duplicate" | "rejected" | "manual_review" = "details_fetched";
      let rejectionReason: string | null = null;
      let crawlStatus: "pending" | "skipped" | "success" | "failed" = candidate.website ? "pending" : "skipped";
      let crawlSummary: string | null = null;

      if (hasExcludedTerm(candidate, campaign.excluded_keywords)) {
        candidateStatus = "rejected";
        rejectionReason = "excluded_keyword";
        rejected += 1;
      } else if (await isSuppressed(candidate)) {
        candidateStatus = "rejected";
        rejectionReason = "suppressed";
        rejected += 1;
      } else if (!candidate.website) {
        candidateStatus = "manual_review";
        rejectionReason = "missing_website";
        manualReview += 1;
      }

      if (candidateStatus === "details_fetched" && campaign.crawl_website && candidate.website) {
        const crawl = await crawlBusinessWebsite(candidate.website);
        crawlStatus = crawl.status === "success" ? "success" : "failed";
        crawlSummary = crawl.summary;
        if (crawl.status === "success") {
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
        } else {
          crawlFailures += 1;
        }
      }

      const { data: insertedCandidate, error: candidateError } = await supabase
        .from("lead_candidates")
        .insert({
          campaign_id: campaign.id,
          discovery_run_id: runId,
          search_query_id: searchQuery?.id ?? null,
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
          candidate_status: candidateStatus,
          rejection_reason: rejectionReason
        })
        .select("id")
        .single();

      if (candidateError) {
        errors.push(candidateError.message);
        continue;
      }

      if (candidateStatus === "details_fetched") {
        promotable.push({ ...candidate, candidate_id: insertedCandidate.id, campaign_id: campaign.id, discovery_run_id: runId });
      }
    }

    if (quotaExhausted || promotable.length >= campaign.max_leads_per_day) break;
  }

  if (!input.dry_run && promotable.length > 0) {
    const importResult = await importDiscoveredLeads(
      { niche: campaign.niche, location: campaign.region, max_results: Math.min(campaign.max_leads_per_day, discoveryLimits.maxFinalLeadsPerDay) },
      promotable
    );
    created = importResult.created;
    duplicates += importResult.duplicates;
    errors.push(...importResult.errors);

    for (const leadId of importResult.created_lead_ids ?? []) {
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
          continue;
        }
        enriched += 1;
        await logWorkflowEvent({
          campaign_id: campaign.id,
          discovery_run_id: runId,
          event_type: "wf_02_enrichment",
          status: "completed",
          payload: { lead_id: leadId }
        });
      } catch (error) {
        errors.push(error instanceof Error ? `WF-02 enrichment failed for ${leadId}: ${error.message}` : `WF-02 enrichment failed for ${leadId}`);
        await logWorkflowEvent({
          campaign_id: campaign.id,
          discovery_run_id: runId,
          event_type: "wf_02_enrichment",
          status: "failed",
          error_message: error instanceof Error ? error.message : "Unknown enrichment error",
          payload: { lead_id: leadId }
        });
        continue;
      }

      try {
        await scoreLead(leadId);
        scored += 1;
        await logWorkflowEvent({
          campaign_id: campaign.id,
          discovery_run_id: runId,
          event_type: "wf_03_scoring",
          status: "completed",
          payload: { lead_id: leadId }
        });
      } catch (error) {
        errors.push(error instanceof Error ? `WF-03 scoring failed for ${leadId}: ${error.message}` : `WF-03 scoring failed for ${leadId}`);
        await logWorkflowEvent({
          campaign_id: campaign.id,
          discovery_run_id: runId,
          event_type: "wf_03_scoring",
          status: "failed",
          error_message: error instanceof Error ? error.message : "Unknown scoring error",
          payload: { lead_id: leadId }
        });
      }
    }

    for (const lead of promotable) {
      if (lead.candidate_id) {
        await supabase
          .from("lead_candidates")
          .update({ candidate_status: "promoted" })
          .eq("id", lead.candidate_id)
          .is("final_lead_id", null);
      }
    }

    for (let i = 0; i < created; i += 1) {
      await reserveQuota(campaign, "final_leads", campaign.max_leads_per_day);
    }
  }

  const status = quotaExhausted ? "quota_exhausted" : errors.length ? "failed" : "completed";
  await supabase
    .from("discovery_runs")
    .update({
      status,
      candidates_checked: candidatesChecked,
      places_text_search_calls: textSearchCalls,
      places_details_calls: detailsCalls,
      total_places_calls: textSearchCalls + detailsCalls,
      duplicates_skipped: duplicates,
      candidates_rejected: rejected,
      candidates_promoted: created,
      manual_review_candidates: manualReview,
      crawl_failures: crawlFailures,
      error_message: errors[0] ?? null,
      completed_at: new Date().toISOString()
    })
    .eq("id", runId);

  await logWorkflowEvent({
    campaign_id: campaign.id,
    discovery_run_id: runId,
    event_type: "discovery_run",
    status: status === "failed" ? "failed" : status === "quota_exhausted" ? "blocked" : "completed",
    error_message: errors[0],
    payload: { created, duplicates, manual_review: manualReview, enriched, scored, errors_count: errors.length }
  });

  return { run_id: runId, status, created, duplicates, manual_review: manualReview, errors };
}
