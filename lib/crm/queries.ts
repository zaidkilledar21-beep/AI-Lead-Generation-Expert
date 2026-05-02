import { createOptionalSupabaseServiceClient } from "@/lib/supabase/server";
import type { CampaignRow, CrmMetric, InboxThread, LeadDetail, PipelineRow, ReviewItem } from "@/lib/crm/types";

type SupabaseClient = NonNullable<ReturnType<typeof createOptionalSupabaseServiceClient>>;

function asArray<T>(value: T[] | null | undefined): T[] {
  return value ?? [];
}

function relationOne<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

export async function getCrmHomeMetrics(): Promise<CrmMetric[]> {
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

export async function getPipelineRows(limit = 100): Promise<PipelineRow[]> {
  const supabase = createOptionalSupabaseServiceClient();
  if (!supabase) return [];

  const viewRows = await getPipelineRowsFromView(supabase, limit);
  if (viewRows.length > 0) return viewRows;

  const { data } = await supabase
    .from("leads")
    .select("id,business_name,niche,city,country,status,campaign_id,assigned_to,band_override,created_at,campaigns(name)")
    .order("created_at", { ascending: false })
    .limit(limit);

  return Promise.all(
    asArray(data as Array<Record<string, any>>).map(async (lead) => {
      const [{ data: score }, { data: queue }, { data: review }, { data: reply }] = await Promise.all([
        supabase
          .from("lead_scores")
          .select("total_score,band")
          .eq("lead_id", lead.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from("outreach_queue")
          .select("status,next_send_at")
          .eq("lead_id", lead.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from("manual_review_queue")
          .select("review_status")
          .eq("lead_id", lead.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from("reply_events")
          .select("intent_classification")
          .eq("lead_id", lead.id)
          .order("reply_received_at", { ascending: false })
          .limit(1)
          .maybeSingle()
      ]);

      const campaign = relationOne<{ name: string }>(lead.campaigns);
      const band = (score as any)?.band ?? null;
      return {
        id: lead.id,
        businessName: lead.business_name,
        niche: lead.niche,
        city: lead.city,
        country: lead.country,
        status: lead.status,
        score: (score as any)?.total_score ?? null,
        band,
        effectiveBand: lead.band_override ?? band,
        campaignName: campaign?.name ?? null,
        assignedTo: lead.assigned_to ?? null,
        replyIntent: (reply as any)?.intent_classification ?? null,
        reviewStatus: (review as any)?.review_status ?? null,
        nextSendAt: (queue as any)?.next_send_at ?? null,
        createdAt: lead.created_at ?? null
      };
    })
  );
}

async function getPipelineRowsFromView(supabase: SupabaseClient, limit: number): Promise<PipelineRow[]> {
  const { data, error } = await supabase.from("pipeline_view").select("*").limit(limit);
  if (error || !data) return [];

  return (data as Array<Record<string, any>>).map((row) => ({
    id: row.lead_id ?? row.id,
    businessName: row.business_name,
    niche: row.niche,
    city: row.city,
    country: row.country,
    status: row.status,
    score: row.total_score,
    band: row.band,
    effectiveBand: row.effective_band ?? row.band,
    campaignName: row.campaign_name,
    assignedTo: row.assigned_to,
    replyIntent: row.reply_intent ?? row.latest_reply_intent ?? null,
    reviewStatus: row.review_status ?? (row.has_pending_review ? "pending" : null),
    nextSendAt: row.next_send_at,
    createdAt: row.created_at
  }));
}

export async function getCampaignRows(): Promise<CampaignRow[]> {
  const supabase = createOptionalSupabaseServiceClient();
  if (!supabase) return [];

  const { data } = await supabase
    .from("campaigns")
    .select("id,name,status,niche,region,primary_niche,target_countries,run_frequency,last_run_at,created_at")
    .order("created_at", { ascending: false });

  return Promise.all(
    asArray(data as Array<Record<string, any>>).map(async (campaign) => {
      const [{ count: leads }, { count: replies }] = await Promise.all([
        supabase.from("leads").select("*", { count: "exact", head: true }).eq("campaign_id", campaign.id),
        supabase
          .from("reply_events")
          .select("*,leads!inner(campaign_id)", { count: "exact", head: true })
          .eq("leads.campaign_id", campaign.id)
      ]);

      return {
        id: campaign.id,
        name: campaign.name,
        status: campaign.status,
        niche: campaign.niche,
        region: campaign.region,
        primaryNiche: campaign.primary_niche ?? null,
        targetCountries: campaign.target_countries ?? [],
        runFrequency: campaign.run_frequency ?? null,
        leads: leads ?? 0,
        replies: replies ?? 0,
        lastRunAt: campaign.last_run_at ?? null,
        createdAt: campaign.created_at ?? null
      };
    })
  );
}

export async function getLeadDetail(leadId: string): Promise<LeadDetail | null> {
  const supabase = createOptionalSupabaseServiceClient();
  if (!supabase) return null;

  const rows = await getPipelineRows(250);
  const pipelineRow = rows.find((row) => row.id === leadId);
  const { data: lead } = await supabase.from("leads").select("*").eq("id", leadId).maybeSingle();
  if (!lead) return null;

  const [{ data: evidence }, { data: hypothesis }, { data: actions }, { data: replies }, { data: drafts }] = await Promise.all([
    supabase.from("score_evidence").select("*").eq("lead_id", leadId).order("created_at", { ascending: false }),
    supabase
      .from("automation_hypotheses")
      .select("outreach_hook")
      .eq("lead_id", leadId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase.from("crm_action_log").select("id,action_type,action_detail,performed_by,performed_at").eq("lead_id", leadId).order("performed_at", { ascending: false }).limit(20),
    supabase.from("reply_events").select("id,intent_classification,summary,reply_received_at").eq("lead_id", leadId).order("reply_received_at", { ascending: false }).limit(10),
    supabase.from("email_drafts").select("id,approval_status,subject,created_at").eq("lead_id", leadId).order("created_at", { ascending: false }).limit(10)
  ]);

  const timeline = [
    ...asArray(actions as Array<Record<string, any>>).map((item) => ({
      id: item.id,
      type: "action",
      label: item.action_type,
      detail: `${item.performed_by} updated this lead`,
      at: item.performed_at ?? null
    })),
    ...asArray(replies as Array<Record<string, any>>).map((item) => ({
      id: item.id,
      type: "reply",
      label: item.intent_classification ?? "reply",
      detail: item.summary ?? "Reply received",
      at: item.reply_received_at ?? null
    })),
    ...asArray(drafts as Array<Record<string, any>>).map((item) => ({
      id: item.id,
      type: "draft",
      label: item.approval_status ?? "draft",
      detail: item.subject ?? "Email draft created",
      at: item.created_at ?? null
    }))
  ].sort((a, b) => new Date(b.at ?? 0).getTime() - new Date(a.at ?? 0).getTime());

  const row = pipelineRow ?? {
    id: lead.id,
    businessName: lead.business_name,
    niche: lead.niche,
    city: lead.city,
    country: lead.country,
    status: lead.status,
    score: null,
    band: null,
    effectiveBand: lead.band_override ?? null,
    campaignName: null,
    assignedTo: lead.assigned_to ?? null,
    replyIntent: null,
    reviewStatus: null,
    nextSendAt: null,
    createdAt: lead.created_at ?? null
  };

  return {
    ...row,
    website: lead.website ?? null,
    email: lead.email ?? null,
    phone: lead.phone ?? null,
    googleMapsUrl: lead.google_maps_url ?? null,
    linkedinUrl: lead.linkedin_url ?? null,
    notes: lead.notes ?? null,
    scoreEvidence: asArray(evidence as Array<Record<string, any>>).map((item) => ({
      id: item.id,
      metricName: item.metric_name,
      score: item.score,
      maxScore: item.max_score,
      evidence: item.evidence,
      missingData: item.missing_data
    })),
    hypothesis: (hypothesis as any)?.outreach_hook ?? null,
    timeline
  };
}

export async function getReviewItems(): Promise<ReviewItem[]> {
  const supabase = createOptionalSupabaseServiceClient();
  if (!supabase) return [];

  const { data } = await supabase
    .from("manual_review_queue")
    .select("id,lead_id,reason,priority,review_status,created_at,leads(business_name)")
    .eq("review_status", "pending")
    .order("created_at", { ascending: true });

  return asArray(data as Array<Record<string, any>>).map((item) => {
    const lead = relationOne<{ business_name: string }>(item.leads);
    return {
      id: item.id,
      leadId: item.lead_id,
      businessName: lead?.business_name ?? "Unknown lead",
      reason: item.reason ?? "Manual review required",
      priority: item.priority ?? "normal",
      reviewStatus: item.review_status,
      createdAt: item.created_at ?? null
    };
  });
}

export async function getInboxThreads(): Promise<InboxThread[]> {
  const supabase = createOptionalSupabaseServiceClient();
  if (!supabase) return [];

  const { data } = await supabase
    .from("reply_events")
    .select("id,lead_id,from_email,intent_classification,sentiment,summary,handled_at,reply_received_at,leads(business_name)")
    .order("reply_received_at", { ascending: false })
    .limit(100);

  return asArray(data as Array<Record<string, any>>).map((item) => {
    const lead = relationOne<{ business_name: string }>(item.leads);
    return {
      id: item.id,
      leadId: item.lead_id,
      businessName: lead?.business_name ?? "Unknown lead",
      fromEmail: item.from_email ?? null,
      intent: item.intent_classification ?? null,
      sentiment: item.sentiment ?? null,
      summary: item.summary ?? null,
      handledAt: item.handled_at ?? null,
      receivedAt: item.reply_received_at ?? null
    };
  });
}
