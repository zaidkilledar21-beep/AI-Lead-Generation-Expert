import type { CampaignStatus, Confidence, EmailGenerationOutput, ReplyClassificationOutput, RunFrequency, ScoringOutput } from "@/lib/types";

export type DiscoverLeadsInput = {
  niche: string;
  location: string;
  max_results: number;
};

export const discoveryLimits = {
  maxFinalLeadsPerDay: 30,
  maxCandidatesCheckedPerDay: 75,
  maxPlacesDetailsCallsPerDay: 100,
  maxTotalPlacesCallsPerDay: 150,
  maxDiscoveryRunsPerDay: 1
} as const;

export type CampaignConfigInput = {
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
  crawl_website: boolean;
  schedule: string;
  timezone: string;
  status: CampaignStatus;
  description?: string | null;
  primary_niche?: string | null;
  niche_keywords?: string[];
  target_countries?: string[];
  target_cities?: string[];
  exclude_cities?: string[];
  language_of_business?: string[];
  max_leads_per_run?: number;
  lead_source?: "google_maps" | "google_search" | "directory" | "manual_import" | string;
  min_google_rating?: number;
  min_review_count?: number;
  exclude_chains?: boolean;
  exclude_already_discovered?: boolean;
  run_frequency?: RunFrequency;
  next_run_at?: string | null;
  min_score_band_a?: number;
  min_score_band_b?: number;
  min_automation_opportunity?: number;
  min_ability_to_pay?: number;
  min_reachability?: number;
  confidence_required?: Confidence;
  sequence_band_a?: string | null;
  sequence_band_b?: string | null;
  sequence_band_c?: string | null;
  auto_approve_band_b?: boolean;
  require_approval_band_a?: boolean;
  assigned_inbox_id?: string | null;
  tags?: string[];
  notes?: string | null;
};

export type GooglePlacesLeadInput = {
  candidate_id?: string | null;
  campaign_id?: string | null;
  discovery_run_id?: string | null;
  google_place_id?: string | null;
  dedupe_key?: string | null;
  business_name: string;
  website?: string | null;
  country?: string | null;
  city?: string | null;
  niche?: string | null;
  source?: "google_places" | "manual_import" | string;
  google_maps_url?: string | null;
  phone?: string | null;
  email?: string | null;
  whatsapp?: string | null;
  rating?: number | null;
  review_count?: number | null;
  address?: string | null;
  source_attribution?: Record<string, unknown>;
};

export type DiscoverLeadsOutput = {
  created: number;
  duplicates: number;
  errors: string[];
  created_lead_ids?: string[];
};

export type EnrichLeadInput = {
  lead_id: string;
};

export type EnrichLeadOutput = {
  lead_id: string;
  status: "completed" | "failed";
  enrichment_confidence: "low" | "medium" | "high";
  email_found?: string;
  workflow_signals: string[];
};

export type ScoreLeadInput = {
  lead_id: string;
};

export type GenerateEmailInput = {
  lead_id: string;
  sequence_id: string;
  step_number: number;
};

export type DetectRepliesOutput = {
  processed: number;
  matched: number;
  unmatched: number;
  errors: string[];
};

export function assertDiscoverInput(input: DiscoverLeadsInput) {
  if (!input.niche.trim()) throw new Error("niche is required");
  if (!input.location.trim()) throw new Error("location is required");
  if (!Number.isInteger(input.max_results) || input.max_results < 1 || input.max_results > discoveryLimits.maxFinalLeadsPerDay) {
    throw new Error(`max_results must be an integer between 1 and ${discoveryLimits.maxFinalLeadsPerDay}`);
  }
}

export function assertCampaignConfigInput(input: CampaignConfigInput) {
  if (!input.name.trim()) throw new Error("campaign name is required");
  if (!input.niche.trim()) throw new Error("niche is required");
  if (!input.region.trim()) throw new Error("region is required");
  if (input.max_leads_per_day < 1 || input.max_leads_per_day > discoveryLimits.maxFinalLeadsPerDay) {
    throw new Error(`max leads per day must be 1-${discoveryLimits.maxFinalLeadsPerDay}`);
  }
  if (input.max_candidates_per_day < 1 || input.max_candidates_per_day > discoveryLimits.maxCandidatesCheckedPerDay) {
    throw new Error(`max candidates per day must be 1-${discoveryLimits.maxCandidatesCheckedPerDay}`);
  }
  if (input.max_details_calls_per_day < 1 || input.max_details_calls_per_day > discoveryLimits.maxPlacesDetailsCallsPerDay) {
    throw new Error(`max details calls per day must be 1-${discoveryLimits.maxPlacesDetailsCallsPerDay}`);
  }
  if (input.max_total_places_calls_per_day < 1 || input.max_total_places_calls_per_day > discoveryLimits.maxTotalPlacesCallsPerDay) {
    throw new Error(`max total Places calls per day must be 1-${discoveryLimits.maxTotalPlacesCallsPerDay}`);
  }
  if (!["draft", "active", "paused", "completed", "archived"].includes(input.status)) throw new Error("invalid campaign status");
  if (input.max_leads_per_run !== undefined && (input.max_leads_per_run < 1 || input.max_leads_per_run > 1000)) {
    throw new Error("max leads per run must be 1-1000");
  }
  if (input.min_google_rating !== undefined && (input.min_google_rating < 0 || input.min_google_rating > 5)) {
    throw new Error("min google rating must be between 0 and 5");
  }
  if (input.min_review_count !== undefined && input.min_review_count < 0) {
    throw new Error("min review count must be zero or greater");
  }
  if (input.run_frequency !== undefined && !["manual", "daily", "every_3_days", "weekly"].includes(input.run_frequency)) {
    throw new Error("invalid run frequency");
  }
  if (input.confidence_required !== undefined && !["low", "medium", "high"].includes(input.confidence_required)) {
    throw new Error("invalid confidence requirement");
  }
  if (input.min_score_band_a !== undefined && (input.min_score_band_a < 0 || input.min_score_band_a > 100)) {
    throw new Error("min score for Band A must be between 0 and 100");
  }
  if (input.min_score_band_b !== undefined && (input.min_score_band_b < 0 || input.min_score_band_b > 100)) {
    throw new Error("min score for Band B must be between 0 and 100");
  }
  if (
    input.min_score_band_a !== undefined &&
    input.min_score_band_b !== undefined &&
    input.min_score_band_b > input.min_score_band_a
  ) {
    throw new Error("min score for Band B cannot exceed Band A");
  }
}

export function assertScoringOutput(output: ScoringOutput) {
  if (output.total_score < 0 || output.total_score > 100) {
    throw new Error("total_score must be between 0 and 100");
  }

  const maxByMetric = {
    automation_opportunity: 20,
    lead_customer_volume: 15,
    digital_workflow_gap: 15,
    revenue_ability_to_pay: 15,
    niche_fit: 10,
    reachability: 10,
    operational_complexity: 10,
    growth_activity: 5
  };

  for (const [metric, max] of Object.entries(maxByMetric)) {
    const score = output.metric_scores[metric as keyof typeof output.metric_scores];
    if (!score) throw new Error(`missing metric score: ${metric}`);
    if (score.score < 0 || score.score > max || score.max !== max) {
      throw new Error(`invalid score bounds for ${metric}`);
    }
    if (!score.evidence && !score.missing_data) {
      throw new Error(`metric ${metric} needs evidence or missing_data`);
    }
  }

  if (!output.automation_hypothesis.outreach_hook.trim()) {
    throw new Error("automation hypothesis outreach_hook is required");
  }
}

export function assertEmailGenerationOutput(output: EmailGenerationOutput) {
  if (!output.subject_line.trim()) throw new Error("subject_line is required");
  if (!output.message_body.trim()) throw new Error("message_body is required");
  if (!Number.isInteger(output.word_count) || output.word_count < 1) {
    throw new Error("word_count must be a positive integer");
  }
  if (!output.validation.has_specific_observation) throw new Error("specific observation is required");
  if (!output.validation.has_one_automation_idea) throw new Error("one automation idea is required");
  if (!output.validation.has_one_cta && output.cta_type !== "none") throw new Error("one CTA is required");
  if (!output.validation.no_false_claims) throw new Error("false claims are not allowed");
}

export function assertReplyClassificationOutput(output: ReplyClassificationOutput) {
  if (!output.intent_classification) throw new Error("intent_classification is required");
  if (!output.sentiment) throw new Error("sentiment is required");
  if (!output.summary.trim()) throw new Error("summary is required");
}
