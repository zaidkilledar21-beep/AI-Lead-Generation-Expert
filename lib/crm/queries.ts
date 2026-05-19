import { createOptionalSupabaseServiceClient } from "@/lib/supabase/server";
import { createSupabaseDashboardClient } from "@/lib/supabase/dashboard";
import { getActiveDashboardUserRole } from "@/lib/app/auth";
import { getCampaignReadiness } from "@/lib/app/campaigns";
import { resolveAnalyticsDateRange } from "@/lib/crm/analytics-utils";
import {
  HUMAN_REVIEW_REPLY_INTENTS,
  POSITIVE_REPLY_INTENTS,
  formatReplyIntentLabel,
  normalizeReplyIntent,
  normalizeReplyReviewReason
} from "@/lib/crm/status-contract";
import { previewText } from "@/lib/crm/inbox-utils";
import type { AnalyticsCampaign, AnalyticsDaily, AnalyticsSequenceStep, CountryData, IntentData, NicheData, LeadProfile, WeeklySnapshot } from "@/lib/crm/types";

export type AnalyticsExportKind = "campaign-performance" | "daily-rollup" | "sequence-funnel" | "reply-intent-breakdown";
type OptionalSupabaseClient = ReturnType<typeof createOptionalSupabaseServiceClient>;
type AnalyticsSupabaseClient = NonNullable<OptionalSupabaseClient>;
type AnalyticsCampaignExportRow = {
  campaignName: string;
  niche: string;
  status: string;
  leadsDiscovered: number;
  emailsSent: number;
  replies: number;
  positiveReplies: number;
};

/** Safely coerce an `unknown` DB value to string. Objects would produce `[object Object]` via String(), so we guard against that. */
function toStr(value: unknown, fallback = ""): string {
  if (value == null) return fallback;
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return fallback;
}

/** Like toStr but returns null when the value is nullish. Uses a positive null-check to satisfy the no-negated-condition lint rule. */
function toStrOrNull(value: unknown): string | null {
  if (value == null) return null;
  return toStr(value);
}

function asArray<T>(value: T[] | null | undefined): T[] {
  return value ?? [];
}

function relationOne<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function mapPipelineRow(row: Record<string, any>) {
  return {
    id: row.id,
    businessName: row.business_name,
    niche: row.niche,
    country: row.country,
    city: row.city,
    email: row.email ?? null,
    phone: row.phone ?? null,
    status: row.status,
    assignedTo: row.assigned_to ?? null,
    approvedForOutreach: Boolean(row.approved_for_outreach),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastActivityAt: row.last_activity_at ?? null,
    campaignId: row.campaign_id ?? null,
    campaignName: row.campaign_name ?? null,
    campaignNiche: row.campaign_niche ?? null,
    targetCountries: row.target_countries ?? [],
    score: row.total_score ?? null,
    band: row.band ?? null,
    scoredBand: row.scored_band ?? null,
    effectiveBand: row.band ?? row.scored_band ?? null,
    confidence: row.confidence ?? null,
    manualReviewRequired: Boolean(row.manual_review_required),
    outreachStatus: row.outreach_status ?? null,
    currentStep: row.current_step ?? null,
    nextSendAt: row.next_send_at ?? null,
    emailsSent: row.emails_sent ?? 0,
    lastEmailSentAt: row.last_email_sent_at ?? null,
    replyCount: row.reply_count ?? 0,
    lastReplyAt: row.last_reply_at ?? null,
    latestReplyIntent: row.latest_reply_intent ? normalizeReplyIntent(row.latest_reply_intent) : null,
    hasUnhandledReply: Boolean(row.has_unhandled_reply),
    hasPendingReview: Boolean(row.has_pending_review),
    pendingReviewSince: row.pending_review_since ?? null
  };
}

export async function getCrmHomeMetrics() {
  const supabase = createOptionalSupabaseServiceClient();
  if (!supabase) {
    return [
      { label: "Pipeline", value: 0 },
      { label: "Priority Leads", value: 0 },
      { label: "Unhandled Replies", value: 0 },
      { label: "Open Reviews", value: 0 }
    ];
  }

  const [{ count: pipeline }, { count: priority }, { count: replies }, { count: manualReviews }, { count: draftReviews }] = await Promise.all([
    supabase.from("leads").select("*", { count: "exact", head: true }),
    supabase.from("lead_scores").select("*", { count: "exact", head: true }).in("band", ["A", "B"]),
    supabase.from("reply_events").select("*", { count: "exact", head: true }).eq("requires_human_review", true),
    supabase.from("manual_review_queue").select("*", { count: "exact", head: true }).eq("review_status", "pending"),
    supabase.from("email_drafts").select("*", { count: "exact", head: true }).eq("approval_status", "pending").eq("sent", false)
  ]);

  return [
    { label: "Pipeline", value: pipeline ?? 0 },
    { label: "Priority Leads", value: priority ?? 0 },
    { label: "Unhandled Replies", value: replies ?? 0 },
    { label: "Open Reviews", value: (manualReviews ?? 0) + (draftReviews ?? 0) }
  ];
}

export async function getPipelineRows(limit = 250) {
  const supabase = createOptionalSupabaseServiceClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("pipeline_view")
    .select("*")
    .order("last_activity_at", { ascending: false })
    .limit(limit);

  if (error || !data) return [];

  return (data as Array<Record<string, any>>).map(mapPipelineRow);
}

async function getPipelineRowById(leadId: string) {
  const supabase = createOptionalSupabaseServiceClient();
  if (!supabase) return null;

  const { data, error } = await supabase.from("pipeline_view").select("*").eq("id", leadId).maybeSingle();
  if (error || !data) return null;

  return mapPipelineRow(data as Record<string, any>);
}

export async function getCampaignRows() {
  const supabase = createOptionalSupabaseServiceClient();
  if (!supabase) return [];

  const [{ data: analytics }, { data: campaigns }, { data: discoveryRuns }] = await Promise.all([
    supabase.from("campaign_analytics").select("*").order("name"),
    supabase.from("campaigns").select("*").order("created_at", { ascending: false }),
    supabase
      .from("discovery_runs")
      .select("id,campaign_id,status,started_at,completed_at,error_message")
      .order("started_at", { ascending: false })
      .limit(100)
  ]);

  const analyticsById = new Map(
    asArray(analytics as Array<Record<string, any>>).map((row) => [row.campaign_id, row])
  );
  const latestRunByCampaignId = new Map<string, Record<string, any>>();
  asArray(discoveryRuns as Array<Record<string, any>>).forEach((run) => {
    if (typeof run.campaign_id === "string" && !latestRunByCampaignId.has(run.campaign_id)) {
      latestRunByCampaignId.set(run.campaign_id, run);
    }
  });

  return asArray(campaigns as Array<Record<string, any>>).map((campaign) => {
    const analyticsRow = analyticsById.get(campaign.id) ?? {};
    const latestRun = latestRunByCampaignId.get(campaign.id);
    return {
      id: campaign.id,
      name: campaign.name,
      status: campaign.status,
      niche: campaign.niche,
      region: campaign.region,
      description: campaign.description ?? null,
      primaryNiche: campaign.primary_niche ?? campaign.niche,
      targetCountries: campaign.target_countries ?? [],
      targetCities: campaign.target_cities ?? [],
      excludeCities: campaign.exclude_cities ?? [],
      languageOfBusiness: campaign.language_of_business ?? [],
      nicheKeywords: campaign.niche_keywords ?? [],
      maxLeadsPerRun: campaign.max_leads_per_run ?? 100,
      maxCandidatesPerDay: campaign.max_candidates_per_day ?? 75,
      maxDetailsCallsPerDay: campaign.max_details_calls_per_day ?? 100,
      maxTotalPlacesCallsPerDay: campaign.max_total_places_calls_per_day ?? 150,
      maxDiscoveryRunsPerDay: campaign.max_discovery_runs_per_day ?? 1,
      leadSource: campaign.lead_source === "google_maps" ? "google_places" : (campaign.lead_source ?? "google_places"),
      runFrequency: campaign.run_frequency ?? "manual",
      nextRunAt: campaign.next_run_at ?? null,
      lastRunAt: campaign.last_run_at ?? null,
      minGoogleRating: campaign.min_google_rating ?? 3.5,
      minReviewCount: campaign.min_review_count ?? 5,
      minScoreBandA: campaign.min_score_band_a ?? 76,
      minScoreBandB: campaign.min_score_band_b ?? 51,
      minAutomationOpportunity: campaign.min_automation_opportunity ?? 13,
      minAbilityToPay: campaign.min_ability_to_pay ?? 9,
      minReachability: campaign.min_reachability ?? 6,
      confidenceRequired: campaign.confidence_required ?? "medium",
      sequenceBandA: campaign.sequence_band_a ?? null,
      sequenceBandB: campaign.sequence_band_b ?? null,
      sequenceBandC: campaign.sequence_band_c ?? null,
      autoApproveBandB: Boolean(campaign.auto_approve_band_b),
      requireApprovalBandA: Boolean(campaign.require_approval_band_a),
      assignedInboxId: campaign.assigned_inbox_id ?? null,
      tags: campaign.tags ?? [],
      notes: campaign.notes ?? null,
      createdAt: campaign.created_at,
      updatedAt: campaign.updated_at,
      latestRunStatus: latestRun?.status ?? null,
      latestRunStartedAt: latestRun?.started_at ?? null,
      latestRunCompletedAt: latestRun?.completed_at ?? null,
      latestRunError: latestRun?.error_message ?? null,
      leads: analyticsRow.total_leads ?? 0,
      enriched: analyticsRow.enriched_or_later ?? 0,
      scored: analyticsRow.scored_leads ?? 0,
      bandA: analyticsRow.band_a_count ?? 0,
      bandB: analyticsRow.band_b_count ?? 0,
      replies: analyticsRow.replies ?? 0,
      positiveReplies: analyticsRow.positive_replies ?? 0,
      replyRate: analyticsRow.reply_rate ?? 0
    };
  });
}

export async function getCampaignDetailData(campaignId: string) {
  const supabase = createOptionalSupabaseServiceClient();
  if (!supabase) return null;

  const [campaigns, leads, runs] = await Promise.all([
    getCampaignRows(),
    getPipelineRows(500),
    supabase.from("campaign_run_log").select("*").eq("campaign_id", campaignId).order("run_started_at", { ascending: false }).limit(25)
  ]);

  const campaign = campaigns.find((item) => item.id === campaignId);
  if (!campaign) return null;
  const readiness = await getCampaignReadiness(campaignId);

  return {
    campaign,
    readiness,
    leads: leads.filter((lead) => lead.campaignId === campaignId),
    runs: asArray(runs.data as Array<Record<string, any>>).map((run) => ({
      id: run.id,
      startedAt: run.run_started_at,
      completedAt: run.run_completed_at,
      leadsFound: run.leads_found ?? 0,
      duplicatesSkipped: run.duplicates_skipped ?? 0,
      errors: run.errors ?? 0,
      durationSeconds: run.duration_seconds ?? 0,
      triggeredBy: run.triggered_by ?? "scheduled",
      status: run.status ?? "completed"
    }))
  };
}

export async function getLeadDetail(leadId: string) {
  const supabase = createOptionalSupabaseServiceClient();
  if (!supabase) return null;

  const pipelineRow = await getPipelineRowById(leadId);
  const { data: lead } = await supabase.from("leads").select("*").eq("id", leadId).maybeSingle();
  if (!lead) return null;

  const [{ data: enrichment }, { data: evidence }, { data: hypothesis }, { data: actions }, { data: replies }, { data: drafts }, { data: notes }, { data: reviews }, { data: outreachEvents }] = await Promise.all([
    supabase.from("lead_enrichment").select("*").eq("lead_id", leadId).order("last_enriched_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("score_evidence").select("*").eq("lead_id", leadId).order("created_at", { ascending: false }),
    supabase.from("automation_hypotheses").select("*").eq("lead_id", leadId).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("crm_action_log").select("*").eq("lead_id", leadId).order("performed_at", { ascending: false }).limit(50),
    supabase.from("reply_events").select("*").eq("lead_id", leadId).order("reply_received_at", { ascending: false }).limit(50),
    supabase.from("email_drafts").select("*").eq("lead_id", leadId).order("created_at", { ascending: false }).limit(50),
    supabase.from("lead_notes").select("*").eq("lead_id", leadId).order("created_at", { ascending: false }).limit(50),
    supabase.from("manual_review_queue").select("*").eq("lead_id", leadId).order("created_at", { ascending: false }).limit(50),
    supabase.from("outreach_events").select("*").eq("lead_id", leadId).order("created_at", { ascending: false }).limit(50)
  ]);

  const timeline = [
    ...asArray(actions as Array<Record<string, any>>).map((item) => ({
      id: `action-${item.id}`,
      type: "action",
      label: item.action_type,
      detail: item.action_detail?.body ?? item.action_detail?.subject ?? `${item.performed_by} updated this record`,
      at: item.performed_at ?? null
    })),
    ...asArray(replies as Array<Record<string, any>>).map((item) => ({
      id: `reply-${item.id}`,
      type: "reply",
      label: formatReplyIntentLabel(item.intent_classification),
      detail: item.summary ?? item.reply_body ?? "Reply received",
      at: item.reply_received_at ?? null
    })),
    ...asArray(drafts as Array<Record<string, any>>).map((item) => ({
      id: `draft-${item.id}`,
      type: item.sent ? "sent" : "draft",
      label: item.approval_status ?? "draft",
      detail: item.subject ?? item.subject_line ?? "Email draft created",
      at: item.sent_at ?? item.created_at ?? null
    })),
    ...asArray(outreachEvents as Array<Record<string, any>>).map((item) => ({
      id: `outreach-${item.id}`,
      type: item.event_type === "email_sent" ? "sent" : "outreach",
      label: item.event_type,
      detail:
        item.metadata?.subject ??
        item.metadata?.gmail_message_id ??
        item.metadata?.provider_message_id ??
        item.event_type,
      at: item.created_at ?? null
    })),
    ...asArray(notes as Array<Record<string, any>>).map((item) => ({
      id: `note-${item.id}`,
      type: "note",
      label: "note",
      detail: item.body,
      at: item.created_at ?? null
    }))
  ].sort((a, b) => new Date(b.at ?? 0).getTime() - new Date(a.at ?? 0).getTime());

  return {
    ...(pipelineRow ?? {
      id: lead.id,
      businessName: lead.business_name,
      niche: lead.niche,
      city: lead.city,
      country: lead.country,
      status: lead.status,
      score: null,
      band: null,
      effectiveBand: lead.band_override ?? null,
      assignedTo: lead.assigned_to ?? null,
      approvedForOutreach: Boolean(lead.approved_for_outreach),
      campaignName: null,
      latestReplyIntent: null,
      lastActivityAt: lead.updated_at ?? lead.created_at,
      confidence: null
    }),
    website: lead.website ?? null,
    email: lead.email ?? null,
    phone: lead.phone ?? null,
    whatsapp: lead.whatsapp ?? null,
    decisionMakerName: lead.decision_maker_name ?? null,
    decisionMakerRole: lead.decision_maker_role ?? null,
    googleMapsUrl: lead.google_maps_url ?? null,
    linkedinUrl: lead.linkedin_url ?? null,
    source: lead.source ?? null,
    notes: lead.notes ?? null,
    notesHistory: asArray(notes as Array<Record<string, any>>),
    scoreEvidence: asArray(evidence as Array<Record<string, any>>).map((item) => ({
      id: item.id,
      metricName: item.metric_name,
      score: item.score,
      maxScore: item.max_score,
      evidence: item.evidence,
      missingData: item.missing_data
    })),
    hypothesis: hypothesis
      ? {
          painPoint: hypothesis.primary_pain_point ?? null,
          manualWorkflow: hypothesis.likely_manual_workflow ?? null,
          suggestedSolution: hypothesis.suggested_solution ?? null,
          businessImpact: hypothesis.business_impact ?? null,
          outreachHook: hypothesis.outreach_hook ?? null,
          confidence: hypothesis.confidence ?? null
        }
      : null,
    enrichment: enrichment ?? null,
    replies: asArray(replies as Array<Record<string, any>>),
    drafts: asArray(drafts as Array<Record<string, any>>),
    reviews: asArray(reviews as Array<Record<string, any>>),
    timeline
  };
}

export async function getSavedFilters(viewKey = "pipeline") {
  const supabase = createOptionalSupabaseServiceClient();
  if (!supabase) return [];

  const { data } = await supabase.from("saved_filters").select("*").eq("view_key", viewKey).order("created_at", { ascending: false });
  return asArray(data as Array<Record<string, any>>);
}

export async function getReviewItems() {
  const supabase = createOptionalSupabaseServiceClient();
  if (!supabase) return [];

  const [pipelineRows, { data: manualReviews }, { data: drafts }, { data: replies }] = await Promise.all([
    getPipelineRows(500),
    supabase
      .from("manual_review_queue")
      .select("*,leads(business_name,niche,country,city,status)")
      .eq("review_status", "pending")
      .order("created_at", { ascending: true }),
    supabase
      .from("email_drafts")
      .select("*,leads(business_name,niche,country,city,status)")
      .eq("approval_status", "pending")
      .eq("sent", false)
      .order("created_at", { ascending: true })
      .limit(100),
    supabase
      .from("inbox_reply_view")
      .select("*")
      .is("handled_at", null)
      .order("reply_received_at", { ascending: true })
      .limit(100)
  ]);

  const pipelineByLeadId = new Map(pipelineRows.map((row) => [row.id, row]));
  const importantReplyIntents = new Set<string>(HUMAN_REVIEW_REPLY_INTENTS);

  const pendingReplyReviewKeys = new Set<string>();

  const manualItems = asArray(manualReviews as Array<Record<string, any>>).map((item) => {
    const lead = relationOne<Record<string, any>>(item.leads);
    const pipeline = pipelineByLeadId.get(item.lead_id);
    const reason = normalizeReplyReviewReason(item.reason);
    if (reason.startsWith("reply_")) pendingReplyReviewKeys.add(`${item.lead_id}:${reason}`);
    return {
      id: `manual-${item.id}`,
      source: "manual_review" as const,
      sourceId: item.id,
      leadId: item.lead_id,
      businessName: lead?.business_name ?? "Unknown lead",
      niche: lead?.niche ?? pipeline?.niche ?? null,
      country: lead?.country ?? pipeline?.country ?? null,
      city: lead?.city ?? pipeline?.city ?? null,
      leadStatus: lead?.status ?? null,
      reason,
      priority: item.priority ?? "normal",
      reviewStatus: item.review_status,
      notes: item.review_notes ?? null,
      band: pipeline?.effectiveBand ?? null,
      score: pipeline?.score ?? null,
      campaignName: pipeline?.campaignName ?? null,
      createdAt: item.created_at ?? null
    };
  });

  const draftItems = asArray(drafts as Array<Record<string, any>>).map((item) => {
    const lead = relationOne<Record<string, any>>(item.leads);
    const pipeline = pipelineByLeadId.get(item.lead_id);
    return {
      id: `draft-${item.id}`,
      source: "email_draft" as const,
      sourceId: item.id,
      draftId: item.id,
      leadId: item.lead_id,
      businessName: lead?.business_name ?? pipeline?.businessName ?? "Unknown lead",
      niche: lead?.niche ?? pipeline?.niche ?? null,
      country: lead?.country ?? pipeline?.country ?? null,
      city: lead?.city ?? pipeline?.city ?? null,
      leadStatus: lead?.status ?? pipeline?.status ?? null,
      reason: "Draft approval pending",
      priority: pipeline?.effectiveBand === "A" ? "high" : "normal",
      reviewStatus: item.approval_status ?? "pending",
      notes: item.block_reason ?? null,
      band: pipeline?.effectiveBand ?? null,
      score: pipeline?.score ?? null,
      campaignName: pipeline?.campaignName ?? null,
      draftSubject: item.subject ?? item.subject_line ?? "Email draft",
      draftPreview: item.body ?? item.message_body ?? null,
      createdAt: item.created_at ?? null
    };
  });

  const replyItems = asArray(replies as Array<Record<string, any>>)
    .filter((item) => Boolean(item.requires_human_review) || importantReplyIntents.has(normalizeReplyIntent(item.intent_classification)))
    .filter((item) => {
      const intent = normalizeReplyIntent(item.intent_classification);
      return !pendingReplyReviewKeys.has(`${item.lead_id}:reply_${intent}`);
    })
    .map((item) => {
      const pipeline = pipelineByLeadId.get(item.lead_id);
      const intent = normalizeReplyIntent(item.intent_classification);
      return {
        id: `reply-${item.id}`,
        source: "reply_event" as const,
        sourceId: item.id,
        replyEventId: item.id,
        leadId: item.lead_id,
        businessName: item.business_name ?? pipeline?.businessName ?? "Unknown lead",
        niche: pipeline?.niche ?? null,
        country: pipeline?.country ?? null,
        city: pipeline?.city ?? null,
        leadStatus: pipeline?.status ?? null,
        reason: `reply_${intent}`,
        priority: (POSITIVE_REPLY_INTENTS as readonly string[]).includes(intent) ? "urgent" : "high",
        reviewStatus: "pending",
        notes: item.suggested_next_action ?? item.summary ?? null,
        band: item.band ?? pipeline?.effectiveBand ?? null,
        score: pipeline?.score ?? null,
        campaignName: item.campaign_name ?? pipeline?.campaignName ?? null,
        replyExcerpt: item.reply_excerpt ?? item.reply_body ?? null,
        intent,
        createdAt: item.reply_received_at ?? null
      };
    });

  return [...manualItems, ...draftItems, ...replyItems].sort(
    (a, b) => new Date(a.createdAt ?? 0).getTime() - new Date(b.createdAt ?? 0).getTime()
  );
}

export async function getInboxThreads() {
  const supabase = createOptionalSupabaseServiceClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("inbox_reply_view")
    .select("*")
    .order("reply_received_at", { ascending: false })
    .limit(100);

  if (error || !data) return [];

  return (data as Array<Record<string, any>>).map((item) => ({
    id: item.id,
    leadId: item.lead_id,
    businessName: item.business_name ?? "Unknown lead",
    fromEmail: item.from_email ?? null,
    toEmail: item.to_email ?? null,
    body: previewText(item.reply_body, 4000),
    excerpt: previewText(item.reply_excerpt, 500),
    intent: item.intent_classification ? normalizeReplyIntent(item.intent_classification) : null,
    sentiment: item.sentiment ?? null,
    summary: previewText(item.summary, 1200) || null,
    suggestedNextAction: previewText(item.suggested_next_action, 800) || null,
    aiDraftReply: previewText(item.ai_draft_reply, 4000) || null,
    handledAt: item.handled_at ?? null,
    handledBy: item.handled_by ?? null,
    receivedAt: item.reply_received_at ?? null,
    campaignName: item.campaign_name ?? null,
    band: item.band ?? null,
    confidence: item.confidence ?? null,
    isUnhandled: Boolean(item.is_unhandled),
    requiresHumanReview: Boolean(item.requires_human_review),
    providerThreadId: item.provider_thread_id ?? null,
    sentCount: item.sent_count ?? 0,
    lastSentAt: item.last_sent_at ?? null,
    leadAssignedTo: item.lead_assigned_to ?? null,
    replyAssignedTo: item.reply_assigned_to ?? null
  }));
}

export async function getSettingsData() {
  const supabase = createOptionalSupabaseServiceClient();
  if (!supabase) {
    return {
      inboxes: [],
      activeInboxes: [],
      profiles: [],
      sequences: [],
      activeSequences: [],
      settings: [],
      savedFilters: [],
      diagnostics: {
        hasFailures: true,
        requiresSetup: true,
        messages: ["Settings data could not be loaded because the Supabase server client is unavailable."]
      }
    };
  }

  const [inboxesResult, profilesResult, sequencesResult, settingsResult, assignedCampaignsResult, savedFilters] = await Promise.all([
    supabase.from("inboxes").select("*").order("email_address"),
    supabase.from("founder_profiles").select("*").order("display_name"),
    supabase.from("outreach_sequences").select("*,outreach_steps(*)").order("band"),
    supabase.from("app_settings").select("*").order("key"),
    supabase.from("campaigns").select("assigned_inbox_id").eq("status", "active").not("assigned_inbox_id", "is", null).limit(1000),
    getSavedFilters("pipeline")
  ]);

  const assignedCounts = new Map<string, number>();
  for (const campaign of asArray(assignedCampaignsResult.data as Array<Record<string, unknown>>)) {
    const inboxId = toStrOrNull(campaign.assigned_inbox_id);
    if (inboxId) assignedCounts.set(inboxId, (assignedCounts.get(inboxId) ?? 0) + 1);
  }
  const inboxes: Array<Record<string, unknown>> = asArray(inboxesResult.data as Array<Record<string, unknown>>).map((inbox) => ({
    ...inbox,
    active_campaign_assignments: assignedCounts.get(toStr(inbox.id)) ?? 0
  }));
  const profiles = asArray(profilesResult.data as Array<Record<string, unknown>>).map((p): LeadProfile => ({
    user_id: toStr(p.user_id ?? p.id),
    display_name: toStr(p.display_name),
    timezone: toStrOrNull(p.timezone),
    telegram_chat_id: null,
    notification_preferences: p.notification_preferences == null
      ? null
      : (p.notification_preferences as Record<string, unknown>),
  }));
  const sequences: Array<Record<string, unknown> & { outreach_steps: Array<Record<string, unknown>> }> = asArray(
    sequencesResult.data as Array<Record<string, unknown>>
  ).map((sequence) => ({
    ...sequence,
    outreach_steps: asArray(sequence.outreach_steps as Array<Record<string, unknown>>).sort(
      (a, b) => Number(a.step_number ?? 0) - Number(b.step_number ?? 0)
    )
  }));
  const settings = asArray(settingsResult.data as Array<Record<string, unknown>>);
  const activeInboxes = inboxes.filter((inbox) => inbox.active === true && inbox.archived !== true);
  const activeSequences = sequences.filter((sequence) => sequence.active === true && sequence.archived !== true);

  const messages = [
    inboxesResult.error ? "Sender inboxes could not be loaded. Check Supabase query access or schema alignment." : null,
    profilesResult.error ? "Founder profiles could not be loaded. Check Supabase query access or schema alignment." : null,
    sequencesResult.error ? "Outreach sequences could not be loaded. Check Supabase query access or schema alignment." : null,
    settingsResult.error ? "Global app settings could not be loaded. Check Supabase query access or schema alignment." : null,
    assignedCampaignsResult.error ? "Active campaign inbox assignments could not be loaded. Archive warnings may be incomplete." : null,
    !inboxesResult.error && activeInboxes.length === 0 ? "No sender inboxes configured. Add and activate at least one inbox before assigning campaigns or owners." : null,
    !profilesResult.error && profiles.length === 0 ? "No founder profiles configured. Inbox assignment and owner filters will stay empty until a profile exists." : null,
    !sequencesResult.error && activeSequences.length === 0 ? "No active outreach sequences found. Activate at least one sequence before assigning Band A/B/C routing." : null
  ].filter(Boolean) as string[];

  return {
    inboxes,
    activeInboxes,
    profiles,
    sequences,
    activeSequences,
    settings,
    savedFilters,
    diagnostics: {
      hasFailures: Boolean(inboxesResult.error || profilesResult.error || sequencesResult.error || settingsResult.error || assignedCampaignsResult.error),
      requiresSetup: activeInboxes.length === 0 || profiles.length === 0 || activeSequences.length === 0,
      messages
    }
  };
}

function latestDiagnosticLabel(row: Record<string, unknown> | null, fallback: string) {
  if (!row) return "Unavailable";
  const type = toStr(row.event_type ?? row.workflow_name ?? row.type, fallback);
  const status = toStrOrNull(row.status);
  const at = toStrOrNull(row.created_at ?? row.reply_received_at);
  return [type, status, at ? new Date(at).toLocaleString() : null].filter(Boolean).join(" - ");
}

export async function getSystemDiagnostics() {
  const supabase = createOptionalSupabaseServiceClient();
  if (!supabase) {
    return {
      globalPause: "Unavailable",
      activeInboxCount: "Unavailable",
      activeSequenceCount: "Unavailable",
      lastWorkflowEvent: "Unavailable",
      lastSendEvent: "Unavailable",
      lastReplyEvent: "Unavailable",
      n8nDiscoveryWebhook: "Unavailable"
    };
  }

  const [settingsResult, inboxesResult, sequencesResult, workflowResult, sendResult, replyResult] = await Promise.all([
    supabase.from("app_settings").select("value").eq("key", "global_outreach").maybeSingle(),
    supabase.from("inboxes").select("id", { count: "exact", head: true }).eq("active", true).eq("archived", false),
    supabase.from("outreach_sequences").select("id", { count: "exact", head: true }).eq("active", true).eq("archived", false),
    supabase.from("workflow_events").select("workflow_name,event_type,status,created_at").order("created_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("outreach_events").select("event_type,created_at").eq("event_type", "email_sent").order("created_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("reply_events").select("intent_classification,reply_received_at").order("reply_received_at", { ascending: false }).limit(1).maybeSingle()
  ]);

  const globalSettings = (settingsResult.data?.value as Record<string, unknown> | null) ?? {};
  const hasN8nWebhook = Boolean(process.env.N8N_DISCOVERY_WEBHOOK_URL || (process.env.N8N_BASE_URL && process.env.N8N_DISCOVERY_WEBHOOK_PATH));

  return {
    globalPause: settingsResult.error ? "Unavailable" : (globalSettings.paused ? "Paused" : "Allowed"),
    activeInboxCount: inboxesResult.error ? "Unavailable" : String(inboxesResult.count ?? 0),
    activeSequenceCount: sequencesResult.error ? "Unavailable" : String(sequencesResult.count ?? 0),
    lastWorkflowEvent: workflowResult.error ? "Unavailable" : latestDiagnosticLabel(workflowResult.data as Record<string, unknown> | null, "workflow_event"),
    lastSendEvent: sendResult.error ? "Unavailable" : latestDiagnosticLabel(sendResult.data as Record<string, unknown> | null, "email_sent"),
    lastReplyEvent: replyResult.error ? "Unavailable" : latestDiagnosticLabel(replyResult.data as Record<string, unknown> | null, "reply_event"),
    n8nDiscoveryWebhook: hasN8nWebhook ? "Configured" : "Not configured"
  };
}

export async function getAccountSettingsData() {
  const authClient = await createSupabaseDashboardClient();
  if (!authClient) return null;

  const {
    data: { user }
  } = await authClient.auth.getUser();
  if (!user) return null;

  let role = "Unavailable";
  let active = "Unavailable";
  try {
    role = await getActiveDashboardUserRole(user.id);
    active = "Active";
  } catch {
    active = "Inactive";
  }

  return {
    name: typeof user.user_metadata?.display_name === "string" ? user.user_metadata.display_name : (typeof user.user_metadata?.name === "string" ? user.user_metadata.name : user.email ?? user.id),
    email: user.email ?? "Email unavailable",
    role,
    active,
    lastLogin: user.last_sign_in_at ?? null
  };
}

export async function getLatestNotificationEvent() {
  const supabase = createOptionalSupabaseServiceClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("notification_events")
    .select("*")
    .eq("event_type", "test_notification")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;
  return data as Record<string, unknown>;
}

export async function getAnalyticsData(rangeDays = 30, from?: string, to?: string) {
  const dateRange = resolveAnalyticsDateRange(rangeDays, from, to);
  const supabase = createOptionalSupabaseServiceClient();
  if (!supabase) {
    return { metrics: [], campaigns: [] as AnalyticsCampaign[], daily: [] as AnalyticsDaily[], sequenceFunnel: [] as AnalyticsSequenceStep[], comparison: null, replyIntentBreakdown: [] as IntentData[], performanceByNiche: [] as NicheData[], performanceByCountry: [] as CountryData[], weeklySnapshot: [] as WeeklySnapshot[], dateRange };
  }

  const { since, until, previousSince, previousUntil } = dateRange;

  const [homeMetrics, campaigns, daily, prevDaily, sequenceFunnel, replies, pipelineRows] = await Promise.all([
    getCrmHomeMetrics(),
    supabase.from("campaign_analytics").select("*").order("reply_rate", { ascending: false }),
    supabase.from("analytics_daily_rollup").select("*").gte("metric_date", since).lte("metric_date", until).order("metric_date"),
    supabase.from("analytics_daily_rollup").select("*").gte("metric_date", previousSince).lte("metric_date", previousUntil).order("metric_date"),
    supabase.from("sequence_step_funnel").select("*").order("band").order("step_number"),
    supabase.from("reply_events").select("intent_classification").gte("reply_received_at", since).lte("reply_received_at", until),
    getPipelineRows(1000)
  ]);

  const currentStats = asArray(daily.data as any[]).reduce((acc, curr) => ({
    emails: acc.emails + Number(curr.emails_sent || 0),
    replies: acc.replies + Number(curr.replies || 0),
    positive: acc.positive + Number(curr.positive_replies || 0)
  }), { emails: 0, replies: 0, positive: 0 });

  const prevStats = asArray(prevDaily.data as any[]).reduce((acc, curr) => ({
    emails: acc.emails + Number(curr.emails_sent || 0),
    replies: acc.replies + Number(curr.replies || 0),
    positive: acc.positive + Number(curr.positive_replies || 0)
  }), { emails: 0, replies: 0, positive: 0 });

  const calculateChange = (curr: number, prev: number) => {
    if (prev === 0) return curr > 0 ? 100 : 0;
    return ((curr - prev) / prev) * 100;
  };

  const intentMap = asArray(replies.data as any[]).reduce((acc, curr) => {
    const key = curr.intent_classification ? normalizeReplyIntent(curr.intent_classification) : "unclassified";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const replyIntentBreakdown = Object.entries(intentMap).map(([name, value]) => ({ name, value }));

  const nicheMap = asArray(campaigns.data as any[]).reduce((acc, curr) => {
    const key = curr.primary_niche || "Unknown";
    if (!acc[key]) acc[key] = { niche: key, leads: 0, replies: 0, positive: 0 };
    acc[key].leads += Number(curr.total_leads || 0);
    acc[key].replies += Number(curr.replies || 0);
    acc[key].positive += Number(curr.positive_replies || 0);
    return acc;
  }, {} as Record<string, any>);

  const performanceByNiche = Object.values(nicheMap).sort((a: any, b: any) => b.leads - a.leads);
  const countryMap = (pipelineRows as Array<Record<string, any>>).reduce((acc, curr) => {
    const key = curr.country || "Unknown";
    if (!acc[key]) acc[key] = { country: key, leads: 0, replies: 0, positive: 0 };
    acc[key].leads += 1;
    acc[key].replies += Number(curr.replyCount || 0);
    if ((POSITIVE_REPLY_INTENTS as readonly string[]).includes(normalizeReplyIntent(curr.latestReplyIntent))) acc[key].positive += 1;
    return acc;
  }, {} as Record<string, CountryData>);
  const performanceByCountry = Object.values(countryMap).sort((a, b) => b.leads - a.leads);

  const weeklyMap = asArray(daily.data as Array<Record<string, any>>).reduce((acc, curr) => {
    const date = new Date(curr.metric_date);
    const weekStart = new Date(date);
    weekStart.setDate(date.getDate() - date.getDay());
    const key = weekStart.toISOString().slice(0, 10);
    if (!acc[key]) acc[key] = { week: key, leads: 0, emails: 0, replies: 0, positive: 0 };
    acc[key].leads += Number(curr.leads_discovered || 0);
    acc[key].emails += Number(curr.emails_sent || 0);
    acc[key].replies += Number(curr.replies || 0);
    acc[key].positive += Number(curr.positive_replies || 0);
    return acc;
  }, {} as Record<string, WeeklySnapshot>);
  const weeklySnapshot = Object.values(weeklyMap).sort((a, b) => a.week.localeCompare(b.week));

  return {
    metrics: homeMetrics,
    campaigns: asArray(campaigns.data as Array<Record<string, unknown>>).map((row): AnalyticsCampaign => ({
      campaign_id: toStr(row.campaign_id ?? row.id),
      name: toStr(row.name),
      status: toStr(row.status),
      primary_niche: toStrOrNull(row.primary_niche),
      total_leads: Number(row.total_leads ?? 0),
      scored_leads: Number(row.scored_leads ?? 0),
      replies: Number(row.replies ?? 0),
      positive_replies: Number(row.positive_replies ?? 0),
      reply_rate: Number(row.reply_rate ?? 0),
    })),
    daily: asArray(daily.data as Array<Record<string, unknown>>).map((row): AnalyticsDaily => ({
      metric_date: toStr(row.metric_date),
      campaign_id: toStrOrNull(row.campaign_id),
      campaign_name: toStrOrNull(row.campaign_name),
      leads_discovered: Number(row.leads_discovered ?? 0),
      emails_sent: Number(row.emails_sent ?? 0),
      replies: Number(row.replies ?? 0),
      positive_replies: Number(row.positive_replies ?? 0),
    })),
    sequenceFunnel: asArray(sequenceFunnel.data as Array<Record<string, unknown>>).map((row): AnalyticsSequenceStep => ({
      sequence_id: toStr(row.sequence_id ?? row.id),
      sequence_name: toStr(row.sequence_name ?? row.name),
      step_number: Number(row.step_number ?? 0),
      sent: Number(row.sent ?? 0),
      replies: Number(row.replies ?? 0),
      positive_replies: Number(row.positive_replies ?? 0),
      reply_rate: Number(row.reply_rate ?? 0),
    })),
    comparison: {
      emails: { current: currentStats.emails, prev: prevStats.emails, change: calculateChange(currentStats.emails, prevStats.emails) },
      replies: { current: currentStats.replies, prev: prevStats.replies, change: calculateChange(currentStats.replies, prevStats.replies) },
      positive: { current: currentStats.positive, prev: prevStats.positive, change: calculateChange(currentStats.positive, prevStats.positive) }
    },
    replyIntentBreakdown: replyIntentBreakdown as IntentData[],
    performanceByNiche: performanceByNiche as NicheData[],
    performanceByCountry,
    weeklySnapshot,
    dateRange,
  };
}

async function latestTimestamp(
  supabase: AnalyticsSupabaseClient,
  table: "leads" | "outreach_events" | "reply_events",
  timestampColumn: string,
  since: string,
  nextDay: string,
  eventType?: string
) {
  let query = supabase
    .from(table)
    .select(timestampColumn)
    .gte(timestampColumn, since)
    .lt(timestampColumn, nextDay)
    .order(timestampColumn, { ascending: false })
    .limit(1)
    .maybeSingle();

  if (eventType && table === "outreach_events") {
    query = supabase
      .from(table)
      .select(timestampColumn)
      .eq("event_type", eventType)
      .gte(timestampColumn, since)
      .lt(timestampColumn, nextDay)
      .order(timestampColumn, { ascending: false })
      .limit(1)
      .maybeSingle();
  }

  const { data, error } = await query;
  if (error || !data) return null;
  return toStrOrNull((data as unknown as Record<string, unknown>)[timestampColumn]);
}

export async function getAnalyticsDiagnostics(rangeDays = 30, from?: string, to?: string) {
  const dateRange = resolveAnalyticsDateRange(rangeDays, from, to);
  const supabase = createOptionalSupabaseServiceClient();
  if (!supabase) {
    return {
      dateRange,
      lastLeadDiscoveredAt: null,
      lastEmailSentAt: null,
      lastReplyAt: null,
      workflowEventCount: null,
      activeCampaignCount: null,
      activeInboxCount: null
    };
  }

  const { since, nextDay } = dateRange;
  const [
    lastLeadDiscoveredAt,
    lastEmailSentAt,
    lastReplyAt,
    workflowEvents,
    activeCampaigns,
    activeInboxes
  ] = await Promise.all([
    latestTimestamp(supabase, "leads", "created_at", since, nextDay),
    latestTimestamp(supabase, "outreach_events", "sent_at", since, nextDay, "email_sent"),
    latestTimestamp(supabase, "reply_events", "reply_received_at", since, nextDay),
    supabase.from("workflow_events").select("*", { count: "exact", head: true }).gte("created_at", since).lt("created_at", nextDay),
    supabase.from("campaigns").select("*", { count: "exact", head: true }).eq("status", "active"),
    supabase.from("inboxes").select("*", { count: "exact", head: true }).eq("active", true).eq("archived", false)
  ]);

  return {
    dateRange,
    lastLeadDiscoveredAt,
    lastEmailSentAt,
    lastReplyAt,
    workflowEventCount: workflowEvents.error ? null : workflowEvents.count ?? 0,
    activeCampaignCount: activeCampaigns.error ? null : activeCampaigns.count ?? 0,
    activeInboxCount: activeInboxes.error ? null : activeInboxes.count ?? 0
  };
}

export async function getAnalyticsExport(kind: AnalyticsExportKind, rangeDays = 30, from?: string, to?: string) {
  const analytics = await getAnalyticsData(rangeDays, from, to);
  const metadata = [
    ["Export", kind],
    ["Date range", analytics.dateRange.label],
    ["Timezone", analytics.dateRange.timezoneLabel]
  ] as const;

  if (kind === "campaign-performance") {
    const campaignsById = new Map(analytics.campaigns.map((campaign) => [campaign.campaign_id, campaign]));
    const rowsByCampaign = analytics.daily.reduce((acc, row) => {
      const key = row.campaign_id ?? "all";
      const campaign = row.campaign_id ? campaignsById.get(row.campaign_id) : null;
      const existing = acc.get(key) ?? {
        campaignName: row.campaign_name ?? campaign?.name ?? "All campaigns",
        niche: campaign?.primary_niche ?? "N/A",
        status: campaign?.status ?? "N/A",
        leadsDiscovered: 0,
        emailsSent: 0,
        replies: 0,
        positiveReplies: 0
      };
      existing.leadsDiscovered += row.leads_discovered;
      existing.emailsSent += row.emails_sent;
      existing.replies += row.replies;
      existing.positiveReplies += row.positive_replies;
      acc.set(key, existing);
      return acc;
    }, new Map<string, AnalyticsCampaignExportRow>());

    return {
      filename: `campaign-performance-${analytics.dateRange.since}-${analytics.dateRange.until}.csv`,
      metadata,
      columns: [
        { header: "Campaign", value: (row: AnalyticsCampaignExportRow) => row.campaignName },
        { header: "Niche", value: (row: AnalyticsCampaignExportRow) => row.niche },
        { header: "Status", value: (row: AnalyticsCampaignExportRow) => row.status },
        { header: "Leads discovered", value: (row: AnalyticsCampaignExportRow) => row.leadsDiscovered },
        { header: "Emails sent", value: (row: AnalyticsCampaignExportRow) => row.emailsSent },
        { header: "Replies", value: (row: AnalyticsCampaignExportRow) => row.replies },
        { header: "Positive replies", value: (row: AnalyticsCampaignExportRow) => row.positiveReplies }
      ],
      rows: Array.from(rowsByCampaign.values()).sort((a, b) => b.emailsSent - a.emailsSent)
    };
  }

  if (kind === "daily-rollup") {
    return {
      filename: `daily-rollup-${analytics.dateRange.since}-${analytics.dateRange.until}.csv`,
      metadata,
      columns: [
        { header: "Date", value: (row: AnalyticsDaily) => row.metric_date },
        { header: "Campaign", value: (row: AnalyticsDaily) => row.campaign_name ?? "All campaigns" },
        { header: "Leads discovered", value: (row: AnalyticsDaily) => row.leads_discovered },
        { header: "Emails sent", value: (row: AnalyticsDaily) => row.emails_sent },
        { header: "Replies", value: (row: AnalyticsDaily) => row.replies },
        { header: "Positive replies", value: (row: AnalyticsDaily) => row.positive_replies }
      ],
      rows: analytics.daily
    };
  }

  if (kind === "sequence-funnel") {
    return {
      filename: `sequence-funnel-${analytics.dateRange.since}-${analytics.dateRange.until}.csv`,
      metadata,
      columns: [
        { header: "Sequence", value: (row: AnalyticsSequenceStep) => row.sequence_name },
        { header: "Step", value: (row: AnalyticsSequenceStep) => row.step_number },
        { header: "Sent", value: (row: AnalyticsSequenceStep) => row.sent },
        { header: "Replies", value: (row: AnalyticsSequenceStep) => row.replies },
        { header: "Positive replies", value: (row: AnalyticsSequenceStep) => row.positive_replies },
        { header: "Reply rate", value: (row: AnalyticsSequenceStep) => row.reply_rate }
      ],
      rows: analytics.sequenceFunnel
    };
  }

  return {
    filename: `reply-intent-breakdown-${analytics.dateRange.since}-${analytics.dateRange.until}.csv`,
    metadata,
    columns: [
      { header: "Intent", value: (row: IntentData) => row.name },
      { header: "Replies", value: (row: IntentData) => row.value }
    ],
    rows: analytics.replyIntentBreakdown
  };
}

export async function getThreadHistory(leadId: string) {
  const supabase = createOptionalSupabaseServiceClient();
  if (!supabase) return [];

  const [{ data: actions }, { data: replies }, { data: sentDrafts }, { data: sentEvents }] = await Promise.all([
    supabase.from("crm_action_log").select("*").eq("lead_id", leadId).order("performed_at", { ascending: true }),
    supabase.from("reply_events").select("*").eq("lead_id", leadId).order("reply_received_at", { ascending: true }),
    supabase.from("email_drafts").select("*").eq("lead_id", leadId).eq("sent", true).order("sent_at", { ascending: true }),
    supabase
      .from("outreach_events")
      .select("*")
      .eq("lead_id", leadId)
      .eq("event_type", "email_sent")
      .order("created_at", { ascending: true })
  ]);

  const sentDraftMessageIds = new Set(
    asArray(sentDrafts as Array<Record<string, any>>)
      .map((item) => item.provider_message_id)
      .filter(Boolean)
  );

  const history = [
    ...asArray(actions as Array<Record<string, any>>).map((item) => {
      const actionDetail = item.action_detail ?? {};
      return {
        id: `action-${item.id}`,
        type: "action",
        label: item.action_type,
        body: actionDetail.body ?? actionDetail.subject ?? item.action_type,
        at: item.performed_at ?? null,
        sender: item.performed_by
      };
    }),
    ...asArray(sentDrafts as Array<Record<string, any>>).map((item) => ({
      id: `draft-sent-${item.id}`,
      type: "sent",
      label: "email_sent",
      body: item.body ?? item.subject ?? item.subject_line ?? "Email sent",
      at: item.sent_at ?? item.created_at,
      sender: item.assigned_inbox ?? "You"
    })),
    ...asArray(sentEvents as Array<Record<string, any>>)
      .filter((item) => {
        const messageId = item.metadata?.provider_message_id ?? item.metadata?.gmail_message_id;
        return !messageId || !sentDraftMessageIds.has(messageId);
      })
      .map((item) => ({
        id: `outreach-sent-${item.id}`,
        type: "sent",
        label: "email_sent",
        body: item.metadata?.body ?? item.metadata?.subject ?? "Email sent",
        at: item.created_at ?? null,
        sender: item.metadata?.inbox ?? "You"
      })),
    ...asArray(replies as Array<Record<string, any>>).map((item) => ({
      id: `reply-${item.id}`,
      type: "received",
      label: formatReplyIntentLabel(item.intent_classification),
      body: item.reply_body ?? item.summary ?? "Reply received",
      at: item.reply_received_at ?? null,
      sender: item.from_email
    }))
  ].sort((a, b) => new Date(a.at ?? 0).getTime() - new Date(b.at ?? 0).getTime());

  return history;
}
