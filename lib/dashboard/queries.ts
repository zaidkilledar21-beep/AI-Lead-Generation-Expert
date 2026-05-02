import { createOptionalSupabaseServiceClient } from "@/lib/supabase/server";

type PipelineLead = {
  id: string;
  businessName: string;
  niche: string | null;
  country: string | null;
  city: string | null;
  status: string;
  createdAt?: string | null;
  totalScore: number | null;
  band: string | null;
  outreachStatus: string | null;
};

export async function getPipelineSnapshot() {
  const supabase = createOptionalSupabaseServiceClient();

  if (!supabase) {
    return {
      metrics: { discovered: 0, scored: 0, priority: 0, replies: 0 },
      leads: [] as PipelineLead[]
    };
  }

  const [{ count: discovered }, { count: scored }, { count: priority }, { count: replies }, leadsResult] =
    await Promise.all([
      supabase.from("leads").select("*", { count: "exact", head: true }),
      supabase.from("lead_scores").select("*", { count: "exact", head: true }),
      supabase.from("lead_scores").select("*", { count: "exact", head: true }).in("band", ["A", "B"]),
      supabase.from("reply_events").select("*", { count: "exact", head: true }),
      supabase
        .from("leads")
        .select("id,business_name,niche,country,city,status,created_at")
        .order("created_at", { ascending: false })
        .limit(50)
    ]);

  const leads = await Promise.all(
    (leadsResult.data ?? []).map(async (lead) => {
      const [{ data: score }, { data: queue }] = await Promise.all([
        supabase
          .from("lead_scores")
          .select("total_score,band")
          .eq("lead_id", lead.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from("outreach_queue")
          .select("status")
          .eq("lead_id", lead.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle()
      ]);

      return {
        id: lead.id,
        businessName: lead.business_name,
        niche: lead.niche,
        country: lead.country,
        city: lead.city,
        status: lead.status,
        createdAt: lead.created_at,
        totalScore: score?.total_score ?? null,
        band: score?.band ?? null,
        outreachStatus: queue?.status ?? null
      };
    })
  );

  return {
    metrics: {
      discovered: discovered ?? 0,
      scored: scored ?? 0,
      priority: priority ?? 0,
      replies: replies ?? 0
    },
    leads
  };
}

export async function getLeadDetail(leadId: string) {
  const supabase = createOptionalSupabaseServiceClient();
  if (!supabase) return null;

  const { data: lead } = await supabase.from("leads").select("*").eq("id", leadId).maybeSingle();
  if (!lead) return null;

  const [{ data: score }, { data: evidence }, { data: hypothesis }] = await Promise.all([
    supabase
      .from("lead_scores")
      .select("*")
      .eq("lead_id", leadId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase.from("score_evidence").select("*").eq("lead_id", leadId).order("created_at", { ascending: false }),
    supabase
      .from("automation_hypotheses")
      .select("*")
      .eq("lead_id", leadId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()
  ]);

  return {
    id: lead.id,
    businessName: lead.business_name,
    website: lead.website,
    country: lead.country,
    city: lead.city,
    niche: lead.niche,
    email: lead.email,
    phone: lead.phone,
    status: lead.status,
    score: score
      ? {
          totalScore: score.total_score,
          band: score.band,
          confidence: score.confidence
        }
      : null,
    evidence: (evidence ?? []).map((item) => ({
      id: item.id,
      metricName: item.metric_name,
      score: item.score,
      maxScore: item.max_score,
      evidence: item.evidence,
      missingData: item.missing_data
    })),
    hypothesis: hypothesis
      ? {
          outreachHook: hypothesis.outreach_hook
        }
      : null
  };
}

export async function getManualReviewItems() {
  const supabase = createOptionalSupabaseServiceClient();
  if (!supabase) return [];

  const { data } = await supabase
    .from("manual_review_queue")
    .select("id,lead_id,reason,priority,review_status,created_at,leads(business_name)")
    .eq("review_status", "pending")
    .order("created_at", { ascending: true });

  return ((data ?? []) as Array<{
    id: string;
    lead_id: string;
    reason: string | null;
    priority: string | null;
    review_status: string;
    created_at: string;
    leads: { business_name: string } | Array<{ business_name: string }> | null;
  }>).map((item) => ({
    id: item.id,
    leadId: item.lead_id,
    businessName: Array.isArray(item.leads) ? item.leads[0]?.business_name ?? "Unknown" : item.leads?.business_name ?? "Unknown",
    reason: item.reason ?? "Manual review required",
    priority: item.priority ?? "normal",
    reviewStatus: item.review_status,
    createdAt: item.created_at
  }));
}

export async function getMetricsSnapshot() {
  const snapshot = await getPipelineSnapshot();

  return [
    { label: "Leads discovered", value: snapshot.metrics.discovered },
    { label: "Leads scored", value: snapshot.metrics.scored },
    { label: "Priority leads", value: snapshot.metrics.priority },
    { label: "Replies", value: snapshot.metrics.replies }
  ];
}

export async function getCrmNavSnapshot() {
  const supabase = createOptionalSupabaseServiceClient();
  if (!supabase) {
    return { inboxUnhandled: 0, reviewPending: 0, globalPaused: true };
  }

  const [{ count: inboxUnhandled }, { count: reviewPending }, { data: globalOutreach }] = await Promise.all([
    supabase.from("reply_events").select("*", { count: "exact", head: true }).eq("requires_human_review", true),
    supabase.from("manual_review_queue").select("*", { count: "exact", head: true }).eq("review_status", "pending"),
    supabase.from("app_settings").select("value").eq("key", "global_outreach").maybeSingle()
  ]);

  const value = globalOutreach?.value as { paused?: boolean } | null;
  return {
    inboxUnhandled: inboxUnhandled ?? 0,
    reviewPending: reviewPending ?? 0,
    globalPaused: value?.paused ?? true
  };
}

export async function getPipelineDashboard() {
  const snapshot = await getPipelineSnapshot();
  const bands = {
    A: snapshot.leads.filter((lead) => lead.band === "A").length,
    B: snapshot.leads.filter((lead) => lead.band === "B").length,
    C: snapshot.leads.filter((lead) => lead.band === "C").length,
    D: snapshot.leads.filter((lead) => lead.band === "D").length
  };

  return {
    ...snapshot,
    bands,
    awaitingReview: snapshot.leads.filter((lead) => lead.status === "review_pending").length
  };
}

export async function getCampaignDashboard() {
  const supabase = createOptionalSupabaseServiceClient();
  if (!supabase) {
    return {
      campaigns: [],
      recentRuns: [],
      manualCandidates: []
    };
  }

  const [{ data: campaigns }, { data: recentRuns }, { data: manualCandidates }] = await Promise.all([
    supabase
      .from("campaigns")
      .select("id,name,niche,region,keywords,excluded_keywords,target_business_types,status,max_leads_per_day,max_candidates_per_day,max_details_calls_per_day,max_total_places_calls_per_day,crawl_website,schedule,timezone,created_at")
      .order("created_at", { ascending: false }),
    supabase
      .from("discovery_runs")
      .select("id,campaign_id,status,candidates_checked,places_details_calls,total_places_calls,duplicates_skipped,candidates_promoted,manual_review_candidates,error_message,started_at,campaigns(name)")
      .order("started_at", { ascending: false })
      .limit(20),
    supabase
      .from("lead_candidates")
      .select("id,campaign_id,business_name,niche,city,country,address,phone,google_maps_url,rejection_reason,created_at,campaigns(name)")
      .eq("candidate_status", "manual_review")
      .order("created_at", { ascending: false })
      .limit(25)
  ]);

  return {
    campaigns: ((campaigns ?? []) as Array<{
      id: string;
      name: string;
      niche: string;
      region: string;
      keywords: string[] | null;
      excluded_keywords: string[] | null;
      target_business_types: string[] | null;
      status: string;
      max_leads_per_day: number;
      max_candidates_per_day: number;
      max_details_calls_per_day: number;
      max_total_places_calls_per_day: number;
      crawl_website: boolean;
      schedule: string;
      timezone: string;
      created_at: string;
    }>).map((campaign) => ({
      id: campaign.id,
      name: campaign.name,
      niche: campaign.niche,
      region: campaign.region,
      keywords: campaign.keywords ?? [],
      excludedKeywords: campaign.excluded_keywords ?? [],
      targetBusinessTypes: campaign.target_business_types ?? [],
      status: campaign.status,
      maxLeadsPerDay: campaign.max_leads_per_day,
      maxCandidatesPerDay: campaign.max_candidates_per_day,
      maxDetailsCallsPerDay: campaign.max_details_calls_per_day,
      maxTotalPlacesCallsPerDay: campaign.max_total_places_calls_per_day,
      crawlWebsite: campaign.crawl_website,
      schedule: campaign.schedule,
      timezone: campaign.timezone,
      createdAt: campaign.created_at
    })),
    recentRuns: ((recentRuns ?? []) as Array<{
      id: string;
      campaign_id: string;
      status: string;
      candidates_checked: number;
      places_details_calls: number;
      total_places_calls: number;
      duplicates_skipped: number;
      candidates_promoted: number;
      manual_review_candidates: number;
      error_message: string | null;
      started_at: string;
      campaigns: { name: string } | Array<{ name: string }> | null;
    }>).map((run) => ({
      id: run.id,
      campaignId: run.campaign_id,
      campaignName: Array.isArray(run.campaigns) ? run.campaigns[0]?.name ?? "Unknown" : run.campaigns?.name ?? "Unknown",
      status: run.status,
      candidatesChecked: run.candidates_checked,
      detailsCalls: run.places_details_calls,
      totalPlacesCalls: run.total_places_calls,
      duplicatesSkipped: run.duplicates_skipped,
      promoted: run.candidates_promoted,
      manualReview: run.manual_review_candidates,
      errorMessage: run.error_message,
      startedAt: run.started_at
    })),
    manualCandidates: ((manualCandidates ?? []) as Array<{
      id: string;
      campaign_id: string;
      business_name: string;
      niche: string | null;
      city: string | null;
      country: string | null;
      address: string | null;
      phone: string | null;
      google_maps_url: string | null;
      rejection_reason: string | null;
      created_at: string;
      campaigns: { name: string } | Array<{ name: string }> | null;
    }>).map((candidate) => ({
      id: candidate.id,
      campaignId: candidate.campaign_id,
      campaignName: Array.isArray(candidate.campaigns) ? candidate.campaigns[0]?.name ?? "Unknown" : candidate.campaigns?.name ?? "Unknown",
      businessName: candidate.business_name,
      niche: candidate.niche,
      location: [candidate.city, candidate.country].filter(Boolean).join(", ") || candidate.address || "Unknown",
      phone: candidate.phone,
      googleMapsUrl: candidate.google_maps_url,
      reason: candidate.rejection_reason ?? "manual_review",
      createdAt: candidate.created_at
    }))
  };
}

export async function getCampaignDetail(campaignId: string) {
  const supabase = createOptionalSupabaseServiceClient();
  if (!supabase) return null;

  const { data: campaign } = await supabase
    .from("campaigns")
    .select("id,name,niche,region,keywords,excluded_keywords,target_business_types,status,max_leads_per_day,max_candidates_per_day,max_details_calls_per_day,max_total_places_calls_per_day,crawl_website,schedule,timezone,created_at")
    .eq("id", campaignId)
    .maybeSingle();

  if (!campaign) return null;

  const [{ count: leadsCount }, { data: runs }, { data: leads }] = await Promise.all([
    supabase.from("leads").select("*", { count: "exact", head: true }).eq("campaign_id", campaignId),
    supabase
      .from("discovery_runs")
      .select("id,status,trigger_type,candidates_checked,duplicates_skipped,candidates_promoted,manual_review_candidates,error_message,started_at,completed_at")
      .eq("campaign_id", campaignId)
      .order("started_at", { ascending: false })
      .limit(20),
    supabase
      .from("leads")
      .select("id,business_name,niche,country,city,status,created_at")
      .eq("campaign_id", campaignId)
      .order("created_at", { ascending: false })
      .limit(25)
  ]);

  return {
    campaign: {
      id: campaign.id,
      name: campaign.name,
      niche: campaign.niche,
      region: campaign.region,
      keywords: campaign.keywords ?? [],
      excludedKeywords: campaign.excluded_keywords ?? [],
      targetBusinessTypes: campaign.target_business_types ?? [],
      status: campaign.status,
      maxLeadsPerDay: campaign.max_leads_per_day,
      maxCandidatesPerDay: campaign.max_candidates_per_day,
      maxDetailsCallsPerDay: campaign.max_details_calls_per_day,
      maxTotalPlacesCallsPerDay: campaign.max_total_places_calls_per_day,
      crawlWebsite: campaign.crawl_website,
      schedule: campaign.schedule,
      timezone: campaign.timezone,
      createdAt: campaign.created_at
    },
    stats: {
      leadsDiscovered: leadsCount ?? 0,
      enriched: 0,
      scored: 0,
      bandA: 0,
      bandB: 0
    },
    leads: ((leads ?? []) as Array<{
      id: string;
      business_name: string;
      niche: string | null;
      country: string | null;
      city: string | null;
      status: string;
      created_at: string;
    }>).map((lead) => ({
      id: lead.id,
      businessName: lead.business_name,
      niche: lead.niche,
      country: lead.country,
      city: lead.city,
      status: lead.status,
      createdAt: lead.created_at
    })),
    runs: ((runs ?? []) as Array<{
      id: string;
      status: string;
      trigger_type: string;
      candidates_checked: number;
      duplicates_skipped: number;
      candidates_promoted: number;
      manual_review_candidates: number;
      error_message: string | null;
      started_at: string;
      completed_at: string | null;
    }>).map((run) => ({
      id: run.id,
      status: run.status,
      triggerType: run.trigger_type,
      candidatesChecked: run.candidates_checked,
      duplicatesSkipped: run.duplicates_skipped,
      promoted: run.candidates_promoted,
      manualReview: run.manual_review_candidates,
      errorMessage: run.error_message,
      startedAt: run.started_at,
      completedAt: run.completed_at
    }))
  };
}

export async function getInboxSnapshot() {
  const supabase = createOptionalSupabaseServiceClient();
  if (!supabase) {
    return { replies: [], tabs: { all: 0, unhandled: 0, positive: 0, neutral: 0, objections: 0, bounced: 0 } };
  }

  const { data } = await supabase
    .from("reply_events")
    .select("id,lead_id,reply_body,reply_received_at,intent_classification,sentiment,requires_human_review,leads(business_name,niche,country,city)")
    .order("reply_received_at", { ascending: false })
    .limit(50);

  const replies = ((data ?? []) as Array<{
    id: string;
    lead_id: string;
    reply_body: string | null;
    reply_received_at: string;
    intent_classification: string | null;
    sentiment: string | null;
    requires_human_review: boolean | null;
    leads: { business_name: string; niche: string | null; country: string | null; city: string | null } | Array<{ business_name: string; niche: string | null; country: string | null; city: string | null }> | null;
  }>).map((reply) => {
    const lead = Array.isArray(reply.leads) ? reply.leads[0] : reply.leads;
    return {
      id: reply.id,
      leadId: reply.lead_id,
      businessName: lead?.business_name ?? "Unknown lead",
      niche: lead?.niche ?? null,
      location: [lead?.city, lead?.country].filter(Boolean).join(", "),
      body: reply.reply_body ?? "",
      receivedAt: reply.reply_received_at,
      intent: reply.intent_classification ?? "manual_review_required",
      sentiment: reply.sentiment ?? "neutral",
      unhandled: reply.requires_human_review ?? true
    };
  });

  return {
    replies,
    tabs: {
      all: replies.length,
      unhandled: replies.filter((reply) => reply.unhandled).length,
      positive: replies.filter((reply) => reply.intent === "positive_interest").length,
      neutral: replies.filter((reply) => reply.intent === "neutral_question").length,
      objections: replies.filter((reply) => reply.intent === "objection").length,
      bounced: replies.filter((reply) => reply.intent === "bounce").length
    }
  };
}

export async function getReviewDashboard() {
  const [manualItems, inbox] = await Promise.all([getManualReviewItems(), getInboxSnapshot()]);
  const positiveReplies = inbox.replies.filter((reply) => reply.intent === "positive_interest" && reply.unhandled);

  return {
    urgent: [
      ...manualItems.filter((item) => item.priority === "urgent" || item.reason?.includes("band_a")),
      ...positiveReplies.map((reply) => ({
        id: reply.id,
        leadId: reply.leadId,
        businessName: reply.businessName,
        reason: "Positive reply unhandled",
        priority: "urgent",
        reviewStatus: "pending",
        createdAt: reply.receivedAt
      }))
    ],
    needsAttention: manualItems.filter((item) => item.priority !== "urgent" && item.priority !== "low"),
    lowPriority: manualItems.filter((item) => item.priority === "low")
  };
}

export async function getAnalyticsDashboard() {
  const [pipeline, campaigns, inbox] = await Promise.all([getPipelineSnapshot(), getCampaignDashboard(), getInboxSnapshot()]);
  const emailsSent = campaigns.recentRuns.reduce((sum, run) => sum + run.promoted, 0);
  const positiveReplies = inbox.replies.filter((reply) => reply.intent === "positive_interest").length;

  return {
    kpis: [
      { label: "Leads Discovered", value: pipeline.metrics.discovered, delta: "Current total" },
      { label: "Leads Scored", value: pipeline.metrics.scored, delta: "ICP coverage" },
      { label: "Band A+B", value: pipeline.metrics.priority, delta: "Priority pool" },
      { label: "Emails Sent", value: emailsSent, delta: "From run output" },
      { label: "Reply Rate", value: emailsSent ? `${Math.round((inbox.replies.length / emailsSent) * 1000) / 10}%` : "0%", delta: "All replies" },
      { label: "Positive Rate", value: emailsSent ? `${Math.round((positiveReplies / emailsSent) * 1000) / 10}%` : "0%", delta: "Interested replies" }
    ],
    campaignRows: campaigns.campaigns.map((campaign) => ({
      id: campaign.id,
      name: campaign.name,
      niche: campaign.niche,
      countries: campaign.region,
      leads: pipeline.leads.filter((lead) => lead.niche === campaign.niche).length,
      status: campaign.status
    })),
    replyBreakdown: inbox.tabs
  };
}

export async function getSettingsDashboard() {
  const supabase = createOptionalSupabaseServiceClient();
  if (!supabase) {
    return { inboxes: [], settings: [] };
  }

  const [{ data: inboxes }, { data: settings }] = await Promise.all([
    supabase.from("inboxes").select("id,email_address,provider,daily_send_limit,current_daily_sent,warmup_stage,active,last_sent_at").order("email_address"),
    supabase.from("app_settings").select("key,value").order("key")
  ]);

  return {
    inboxes: ((inboxes ?? []) as Array<{
      id: string;
      email_address: string;
      provider: string | null;
      daily_send_limit: number | null;
      current_daily_sent: number | null;
      warmup_stage: string | null;
      active: boolean | null;
      last_sent_at: string | null;
    }>).map((inbox) => ({
      id: inbox.id,
      email: inbox.email_address,
      provider: inbox.provider ?? "google_workspace",
      dailyLimit: inbox.daily_send_limit ?? 0,
      sentToday: inbox.current_daily_sent ?? 0,
      warmupStage: inbox.warmup_stage ?? "n/a",
      active: inbox.active ?? false,
      lastSentAt: inbox.last_sent_at
    })),
    settings: ((settings ?? []) as Array<{ key: string; value: unknown }>).map((setting) => ({
      key: setting.key,
      value: JSON.stringify(setting.value)
    }))
  };
}
