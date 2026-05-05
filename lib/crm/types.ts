import type { LeadLifecycleStatus } from "@/lib/crm/status-contract";

export type CrmMetric = {
  label: string;
  value: number | string;
  delta?: string;
};

export type PipelineRow = {
  id: string;
  businessName: string;
  niche: string | null;
  city: string | null;
  country: string | null;
  status: LeadLifecycleStatus | string;
  score: number | null;
  band: string | null;
  effectiveBand: string | null;
  campaignName: string | null;
  assignedTo: string | null;
  replyIntent: string | null;
  reviewStatus: string | null;
  nextSendAt: string | null;
  createdAt: string | null;
};

export type CampaignRow = {
  id: string;
  name: string;
  status: string;
  niche: string;
  region: string;
  primaryNiche: string | null;
  targetCountries: string[];
  runFrequency: string | null;
  leads: number;
  replies: number;
  lastRunAt: string | null;
  createdAt: string | null;
};

export type LeadTimelineItem = {
  id: string;
  type: string;
  label: string;
  detail: string;
  at: string | null;
};

export type LeadDetail = PipelineRow & {
  website: string | null;
  email: string | null;
  phone: string | null;
  googleMapsUrl: string | null;
  linkedinUrl: string | null;
  notes: string | null;
  scoreEvidence: Array<{
    id: string;
    metricName: string;
    score: number;
    maxScore: number;
    evidence: string | null;
    missingData: string | null;
  }>;
  hypothesis: string | null;
  timeline: LeadTimelineItem[];
};

export type ReviewItem = {
  id: string;
  leadId: string;
  businessName: string;
  reason: string;
  priority: string;
  reviewStatus: string;
  createdAt: string | null;
};

export type InboxThread = {
  id: string;
  leadId: string;
  businessName: string;
  fromEmail: string | null;
  intent: string | null;
  sentiment: string | null;
  summary: string | null;
  handledAt: string | null;
  receivedAt: string | null;
};

export interface AnalyticsCampaign {
  campaign_id: string;
  name: string;
  status: string;
  primary_niche: string | null;
  total_leads: number;
  scored_leads: number;
  replies: number;
  positive_replies: number;
  reply_rate: number;
}

export interface AnalyticsDaily {
  metric_date: string;
  campaign_id: string | null;
  campaign_name: string | null;
  leads_discovered: number;
  emails_sent: number;
  replies: number;
  positive_replies: number;
}

export interface AnalyticsSequenceStep {
  sequence_id: string;
  sequence_name: string;
  step_number: number;
  sent: number;
  replies: number;
  positive_replies: number;
  reply_rate: number;
}

export interface IntentData {
  name: string;
  value: number;
}

export interface NicheData {
  niche: string;
  replies: number;
  positive: number;
}

export interface CountryData {
  country: string;
  leads: number;
  replies: number;
  positive: number;
}

export interface WeeklySnapshot {
  week: string;
  leads: number;
  emails: number;
  replies: number;
  positive: number;
}

export interface LeadProfile {
  user_id: string;
  display_name: string;
  timezone?: string | null;
  telegram_chat_id?: string | null;
  notification_preferences?: Record<string, unknown> | null;
}
