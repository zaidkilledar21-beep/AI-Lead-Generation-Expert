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
  status: string;
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
