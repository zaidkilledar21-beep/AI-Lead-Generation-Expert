export type Band = "A" | "B" | "C" | "D";
export type Confidence = "low" | "medium" | "high";
export type LeadStatus =
  | "new"
  | "enriched"
  | "scored"
  | "review_pending"
  | "pending_approval"
  | "queued"
  | "in_sequence"
  | "paused"
  | "blocked"
  | "completed"
  | "replied"
  | "replied_interested"
  | "replied_not_interested"
  | "replied_needs_review"
  | "closed_won"
  | "closed_lost"
  | "unsubscribed"
  | "bounced"
  | "not_interested"
  | "archived";

export type CampaignStatus = "draft" | "active" | "paused" | "completed" | "archived";
export type RunFrequency = "manual" | "daily" | "every_3_days" | "weekly";

export type ReplyIntent =
  | "interested"
  | "pricing_request"
  | "call_request"
  | "not_interested"
  | "unsubscribe"
  | "opt_out"
  | "question"
  | "ambiguous"
  | "bounce_or_noise"
  | "positive_interest"
  | "neutral_question"
  | "objection"
  | "out_of_office"
  | "wrong_person"
  | "bounce"
  | "manual_review_required";

export type CrmActionType =
  | "approved_for_outreach"
  | "rejected"
  | "archived"
  | "paused_sequence"
  | "resumed_sequence"
  | "marked_closed_won"
  | "marked_closed_lost"
  | "marked_unsubscribed"
  | "reply_handled"
  | "band_overridden"
  | "note_added"
  | "email_draft_approved"
  | "email_draft_rejected"
  | "manual_review_completed"
  | "campaign_created"
  | "campaign_updated"
  | "campaign_launched"
  | "campaign_paused"
  | "campaign_resumed"
  | "campaign_archived"
  | "inbox_paused"
  | "inbox_updated"
  | "global_pause_toggled"
  | "global_pause_enabled"
  | "global_pause_disabled"
  | "bulk_approved"
  | "bulk_status_change"
  | "assigned_to_founder";

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
  notes?: string | null;
  notes_updated_at?: string | null;
  notes_updated_by?: string | null;
  assigned_to?: string | null;
  closed_at?: string | null;
  closed_by?: string | null;
  band_override?: Band | null;
  band_override_reason?: string | null;
  band_override_by?: string | null;
  band_override_at?: string | null;
  approved_for_outreach?: boolean;
  approved_by?: string | null;
  approved_at?: string | null;
  last_activity_at?: string | null;
  status: LeadStatus;
  created_at: string;
  updated_at: string;
};

export type CrmCampaignRecord = {
  id: string;
  name: string;
  niche: string;
  region: string;
  status: CampaignStatus;
  description: string | null;
  primary_niche: string | null;
  niche_keywords: string[];
  target_countries: string[];
  target_cities: string[];
  exclude_cities: string[];
  language_of_business: string[];
  max_leads_per_run: number;
  lead_source: string;
  min_google_rating: number;
  min_review_count: number;
  exclude_chains: boolean;
  exclude_already_discovered: boolean;
  run_frequency: RunFrequency;
  next_run_at: string | null;
  last_run_at: string | null;
  min_score_band_a: number;
  min_score_band_b: number;
  min_automation_opportunity: number;
  min_ability_to_pay: number;
  min_reachability: number;
  confidence_required: Confidence;
  sequence_band_a: string | null;
  sequence_band_b: string | null;
  sequence_band_c: string | null;
  auto_approve_band_b: boolean;
  require_approval_band_a: boolean;
  assigned_inbox_id: string | null;
  tags: string[];
  notes: string | null;
  created_by: string | null;
  created_by_name: string | null;
  created_at: string;
  updated_at: string;
};

export type FounderProfileRecord = {
  user_id: string;
  display_name: string;
  email: string | null;
  timezone: string;
  telegram_chat_id: string | null;
  notification_preferences: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type CrmActionLogRecord = {
  id: string;
  lead_id: string | null;
  campaign_id: string | null;
  reply_event_id: string | null;
  manual_review_id: string | null;
  email_draft_id: string | null;
  action_type: CrmActionType;
  action_detail: Record<string, unknown>;
  performed_by: string;
  performed_by_user_id: string | null;
  performed_at: string;
};

export type SavedFilterRecord = {
  id: string;
  name: string;
  view_key: "pipeline" | "inbox" | "review" | "campaigns" | "analytics";
  filters: Record<string, unknown>;
  created_by: string;
  created_by_user_id: string | null;
  is_shared: boolean;
  created_at: string;
  updated_at: string;
};

export type LeadNoteRecord = {
  id: string;
  lead_id: string;
  body: string;
  created_by: string;
  created_by_user_id: string | null;
  created_at: string;
  updated_at: string;
};

export type PipelineViewRow = {
  id: string;
  business_name: string;
  niche: string | null;
  country: string | null;
  city: string | null;
  email: string | null;
  phone: string | null;
  status: LeadStatus;
  assigned_to: string | null;
  approved_for_outreach: boolean;
  created_at: string;
  updated_at: string;
  last_activity_at: string | null;
  campaign_id: string | null;
  campaign_name: string | null;
  campaign_niche: string | null;
  target_countries: string[] | null;
  total_score: number | null;
  band: Band | null;
  scored_band: Band | null;
  band_override: Band | null;
  confidence: Confidence | null;
  manual_review_required: boolean | null;
  outreach_status: string | null;
  current_step: number | null;
  next_send_at: string | null;
  emails_sent: number;
  last_email_sent_at: string | null;
  reply_count: number;
  last_reply_at: string | null;
  latest_reply_intent: ReplyIntent | null;
  has_unhandled_reply: boolean;
  has_pending_review: boolean;
  pending_review_since: string | null;
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
    | "interested"
    | "pricing_request"
    | "call_request"
    | "not_interested"
    | "unsubscribe"
    | "opt_out"
    | "question"
    | "ambiguous"
    | "bounce_or_noise";
  sentiment: "positive" | "neutral" | "negative" | "unclear";
  requires_human_review: boolean;
  summary: string;
  suggested_next_action: string;
};
