import { createOptionalSupabaseServiceClient } from "@/lib/supabase/server";

type PipelineLead = {
  id: string;
  businessName: string;
  niche: string | null;
  country: string | null;
  city: string | null;
  status: string;
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
