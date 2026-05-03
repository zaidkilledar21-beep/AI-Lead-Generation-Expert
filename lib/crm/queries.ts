import { createOptionalSupabaseServiceClient } from "@/lib/supabase/server";

function asArray<T>(value: T[] | null | undefined): T[] {
  return value ?? [];
}

function relationOne<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
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

  const [{ count: pipeline }, { count: priority }, { count: replies }, { count: reviews }] = await Promise.all([
    supabase.from("leads").select("*", { count: "exact", head: true }),
    supabase.from("lead_scores").select("*", { count: "exact", head: true }).in("band", ["A", "B"]),
    supabase.from("reply_events").select("*", { count: "exact", head: true }).is("handled_at", null),
    supabase.from("manual_review_queue").select("*", { count: "exact", head: true }).eq("review_status", "pending")
  ]);

  return [
    { label: "Pipeline", value: pipeline ?? 0 },
    { label: "Priority Leads", value: priority ?? 0 },
    { label: "Unhandled Replies", value: replies ?? 0 },
    { label: "Open Reviews", value: reviews ?? 0 }
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

  return (data as Array<Record<string, any>>).map((row) => ({
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
    latestReplyIntent: row.latest_reply_intent ?? null,
    hasUnhandledReply: Boolean(row.has_unhandled_reply),
    hasPendingReview: Boolean(row.has_pending_review),
    pendingReviewSince: row.pending_review_since ?? null
  }));
}

export async function getCampaignRows() {
  const supabase = createOptionalSupabaseServiceClient();
  if (!supabase) return [];

  const [{ data: analytics }, { data: campaigns }] = await Promise.all([
    supabase.from("campaign_analytics").select("*").order("name"),
    supabase.from("campaigns").select("*").order("created_at", { ascending: false })
  ]);

  const analyticsById = new Map(
    asArray(analytics as Array<Record<string, any>>).map((row) => [row.campaign_id, row])
  );

  return asArray(campaigns as Array<Record<string, any>>).map((campaign) => {
    const analyticsRow = analyticsById.get(campaign.id) ?? {};
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
      leadSource: campaign.lead_source ?? "google_maps",
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

  return {
    campaign,
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

  const rows = await getPipelineRows(500);
  const pipelineRow = rows.find((row) => row.id === leadId) ?? null;
  const { data: lead } = await supabase.from("leads").select("*").eq("id", leadId).maybeSingle();
  if (!lead) return null;

  const [{ data: enrichment }, { data: evidence }, { data: hypothesis }, { data: actions }, { data: replies }, { data: drafts }, { data: notes }, { data: reviews }] = await Promise.all([
    supabase.from("lead_enrichment").select("*").eq("lead_id", leadId).order("last_enriched_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("score_evidence").select("*").eq("lead_id", leadId).order("created_at", { ascending: false }),
    supabase.from("automation_hypotheses").select("*").eq("lead_id", leadId).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("crm_action_log").select("*").eq("lead_id", leadId).order("performed_at", { ascending: false }).limit(20),
    supabase.from("reply_events").select("*").eq("lead_id", leadId).order("reply_received_at", { ascending: false }).limit(10),
    supabase.from("email_drafts").select("*").eq("lead_id", leadId).order("created_at", { ascending: false }).limit(10),
    supabase.from("lead_notes").select("*").eq("lead_id", leadId).order("created_at", { ascending: false }).limit(10),
    supabase.from("manual_review_queue").select("*").eq("lead_id", leadId).order("created_at", { ascending: false }).limit(10)
  ]);

  const timeline = [
    ...asArray(actions as Array<Record<string, any>>).map((item) => ({
      id: `action-${item.id}`,
      type: "action",
      label: item.action_type,
      detail: `${item.performed_by} updated this record`,
      at: item.performed_at ?? null
    })),
    ...asArray(replies as Array<Record<string, any>>).map((item) => ({
      id: `reply-${item.id}`,
      type: "reply",
      label: item.intent_classification ?? "reply",
      detail: item.summary ?? item.reply_body ?? "Reply received",
      at: item.reply_received_at ?? null
    })),
    ...asArray(drafts as Array<Record<string, any>>).map((item) => ({
      id: `draft-${item.id}`,
      type: "draft",
      label: item.approval_status ?? "draft",
      detail: item.subject ?? item.subject_line ?? "Email draft created",
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

  const { data } = await supabase
    .from("manual_review_queue")
    .select("*,leads(business_name,niche,country,city,status)")
    .eq("review_status", "pending")
    .order("created_at", { ascending: true });

  return asArray(data as Array<Record<string, any>>).map((item) => {
    const lead = relationOne<Record<string, any>>(item.leads);
    return {
      id: item.id,
      leadId: item.lead_id,
      businessName: lead?.business_name ?? "Unknown lead",
      niche: lead?.niche ?? null,
      country: lead?.country ?? null,
      city: lead?.city ?? null,
      leadStatus: lead?.status ?? null,
      reason: item.reason ?? "Manual review required",
      priority: item.priority ?? "normal",
      reviewStatus: item.review_status,
      notes: item.review_notes ?? null,
      createdAt: item.created_at ?? null
    };
  });
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
    body: item.reply_body ?? "",
    excerpt: item.reply_excerpt ?? "",
    intent: item.intent_classification ?? null,
    sentiment: item.sentiment ?? null,
    summary: item.summary ?? null,
    suggestedNextAction: item.suggested_next_action ?? null,
    aiDraftReply: item.ai_draft_reply ?? null,
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
    lastSentAt: item.last_sent_at ?? null
  }));
}

export async function getSettingsData() {
  const supabase = createOptionalSupabaseServiceClient();
  if (!supabase) {
    return { inboxes: [], profiles: [], sequences: [], settings: [], savedFilters: [] };
  }

  const [{ data: inboxes }, { data: profiles }, { data: sequences }, { data: settings }, savedFilters] = await Promise.all([
    supabase.from("inboxes").select("*").order("email_address"),
    supabase.from("founder_profiles").select("*").order("display_name"),
    supabase.from("outreach_sequences").select("*,outreach_steps(*)").order("band"),
    supabase.from("app_settings").select("*").order("key"),
    getSavedFilters("pipeline")
  ]);

  return {
    inboxes: asArray(inboxes as Array<Record<string, any>>),
    profiles: asArray(profiles as Array<Record<string, any>>),
    sequences: asArray(sequences as Array<Record<string, any>>),
    settings: asArray(settings as Array<Record<string, any>>),
    savedFilters
  };
}

export async function getAnalyticsData(rangeDays = 30) {
  const supabase = createOptionalSupabaseServiceClient();
  if (!supabase) {
    return { metrics: [], campaigns: [], daily: [], sequenceFunnel: [] };
  }

  const fromDate = new Date();
  fromDate.setDate(fromDate.getDate() - (rangeDays - 1));
  const since = fromDate.toISOString().slice(0, 10);

  const [homeMetrics, campaigns, daily, sequenceFunnel] = await Promise.all([
    getCrmHomeMetrics(),
    supabase.from("campaign_analytics").select("*").order("reply_rate", { ascending: false }),
    supabase.from("analytics_daily_rollup").select("*").gte("metric_date", since).order("metric_date"),
    supabase.from("sequence_step_funnel").select("*").order("band").order("step_number")
  ]);

  return {
    metrics: homeMetrics,
    campaigns: asArray(campaigns.data as Array<Record<string, any>>),
    daily: asArray(daily.data as Array<Record<string, any>>),
    sequenceFunnel: asArray(sequenceFunnel.data as Array<Record<string, any>>)
  };
}
