export type Band = "A" | "B" | "C" | "D";
export type Confidence = "low" | "medium" | "high";
export type LeadStatus =
  | "new"
  | "enriched"
  | "scored"
  | "review_pending"
  | "queued"
  | "paused"
  | "replied"
  | "unsubscribed"
  | "bounced"
  | "not_interested"
  | "archived";

export type LeadRecord = {
  id: string;
  business_name: string;
  website: string | null;
  country: string | null;
  city: string | null;
  niche: string | null;
  source: string | null;
  google_maps_url: string | null;
  linkedin_url: string | null;
  phone: string | null;
  email: string | null;
  whatsapp: string | null;
  campaign_id?: string | null;
  candidate_id?: string | null;
  discovery_run_id?: string | null;
  google_place_id?: string | null;
  dedupe_key?: string | null;
  source_attribution?: Record<string, unknown> | null;
  status: LeadStatus;
  created_at: string;
  updated_at: string;
};

export type MetricScore = {
  score: number;
  max: number;
  evidence: string;
  missing_data: string;
};

export type ScoringOutput = {
  total_score: number;
  band_recommendation: Band;
  confidence: Confidence;
  metric_scores: {
    automation_opportunity: MetricScore;
    lead_customer_volume: MetricScore;
    digital_workflow_gap: MetricScore;
    revenue_ability_to_pay: MetricScore;
    niche_fit: MetricScore;
    reachability: MetricScore;
    operational_complexity: MetricScore;
    growth_activity: MetricScore;
  };
  automation_hypothesis: {
    primary_pain_point: string;
    likely_manual_workflow: string;
    suggested_solution: string;
    business_impact: string;
    outreach_hook: string;
  };
  manual_review_required: boolean;
  manual_review_reason: string;
};

export type EmailGenerationOutput = {
  subject_line: string;
  preview_text: string;
  message_body: string;
  word_count: number;
  personalization_elements_used: string[];
  cta_type: "call" | "reply" | "question" | "none";
  validation: {
    has_specific_observation: boolean;
    has_one_automation_idea: boolean;
    has_one_cta: boolean;
    no_false_claims: boolean;
    within_word_limit: boolean;
    link_count: number;
  };
  generation_warnings: string[];
};

export type ReplyClassificationOutput = {
  intent_classification:
    | "positive_interest"
    | "neutral_question"
    | "objection"
    | "not_interested"
    | "unsubscribe"
    | "out_of_office"
    | "wrong_person"
    | "bounce"
    | "manual_review_required";
  sentiment: "positive" | "neutral" | "negative";
  requires_human_review: boolean;
  summary: string;
  suggested_next_action: string;
  suggested_reply_draft: string;
};
