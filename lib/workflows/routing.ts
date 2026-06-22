import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { isValidBusinessEmail, normalizeDomain, normalizePhone } from "@/lib/workflows/contact-extraction";
import { rejectLeadWithoutUsableEmail } from "@/lib/workflows/email-gate";
import type { LeadStatus } from "@/lib/types";

type RoutingOutcome =
  | "manual_review_pending"
  | "queued"
  | "drafted"
  | "rejected_missing_email"
  | "blocked_missing_sequence"
  | "blocked_missing_inbox"
  | "paused_campaign"
  | "paused_global"
  | "archived/nurture"
  | "routing_failed";

type RoutingResult = {
  status: RoutingOutcome;
  reasons: string[];
};

const blockedApprovalStatuses = new Set([
  "paused",
  "replied",
  "replied_interested",
  "replied_not_interested",
  "replied_needs_review",
  "unsubscribed",
  "bounced",
  "not_interested",
  "archived"
]);

const closedQueueStatuses = new Set(["replied", "completed"]);

export async function updateLeadStatus(leadId: string, status: LeadStatus) {
  const supabase = createSupabaseServiceClient();
  const { error } = await supabase.from("leads").update({ status }).eq("id", leadId);

  if (error) {
    throw new Error(`Failed to update lead status: ${error.message}`);
  }
}

async function isGlobalOutreachPaused() {
  const supabase = createSupabaseServiceClient();
  const { data: globalOutreach } = await supabase.from("app_settings").select("value").eq("key", "global_outreach").maybeSingle();
  return (
    globalOutreach?.value && typeof globalOutreach.value === "object" && "paused" in globalOutreach.value
      ? Boolean((globalOutreach.value as { paused?: unknown }).paused)
      : true
  );
}

async function isSuppressed(lead: { email?: string | null; website?: string | null; phone?: string | null }) {
  const supabase = createSupabaseServiceClient();
  const email = isValidBusinessEmail(lead.email) ? lead.email?.toLowerCase() ?? null : null;
  const domain = normalizeDomain(lead.website);
  const phone = normalizePhone(lead.phone);
  const checks = [];

  if (email) checks.push(supabase.from("suppression_list").select("id", { count: "exact", head: true }).eq("normalized_email", email));
  if (domain) checks.push(supabase.from("suppression_list").select("id", { count: "exact", head: true }).eq("normalized_domain", domain));
  if (phone) checks.push(supabase.from("suppression_list").select("id", { count: "exact", head: true }).eq("normalized_phone", phone));
  if (checks.length === 0) return false;

  const results = await Promise.all(checks);
  return results.some((result) => (result.count ?? 0) > 0);
}

function isUniqueConflict(error: { code?: string; message?: string } | null | undefined) {
  const message = error?.message?.toLowerCase() ?? "";
  return error?.code === "23505" || message.includes("duplicate") || message.includes("unique");
}

async function getCampaignRoutingState(
  supabase: ReturnType<typeof createSupabaseServiceClient>,
  campaignId?: string | null
) {
  if (!campaignId) return null;

  const { data, error } = await supabase
    .from("campaigns")
    .select("status,assigned_inbox_id")
    .eq("id", campaignId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data as { status?: string | null; assigned_inbox_id?: string | null } | null;
}

async function createOrUpdateOutreachQueue(input: {
  leadId: string;
  sequenceId: string;
  assignedInboxId?: string | null;
}): Promise<RoutingResult> {
  const supabase = createSupabaseServiceClient();
  const { data: existingQueue, error: existingError } = await supabase
    .from("outreach_queue")
    .select("id,status")
    .eq("lead_id", input.leadId)
    .eq("sequence_id", input.sequenceId)
    .maybeSingle();

  if (existingError) throw new Error(existingError.message);

  if (existingQueue?.status === "drafted") {
    await updateLeadStatus(input.leadId, "drafted");
    return { status: "drafted", reasons: [] };
  }

  if (closedQueueStatuses.has(existingQueue?.status)) {
    await updateLeadStatus(input.leadId, "archived");
    return { status: "archived/nurture", reasons: [existingQueue?.status ?? "queue_closed"] };
  }

  const payload = {
    lead_id: input.leadId,
    sequence_id: input.sequenceId,
    current_step: 1,
    next_send_at: new Date().toISOString(),
    status: "queued",
    assigned_inbox: input.assignedInboxId ?? null
  };

  const { error } = existingQueue
    ? await supabase.from("outreach_queue").update(payload).eq("id", existingQueue.id)
    : await supabase.from("outreach_queue").insert(payload);

  if (error && !isUniqueConflict(error)) throw new Error(`Failed to queue lead: ${error.message}`);
  if (error) return createOrUpdateOutreachQueue(input);

  await updateLeadStatus(input.leadId, "queued");
  return { status: "queued", reasons: [] };
}

export async function routeApprovedLead(leadId: string): Promise<RoutingResult> {
  const supabase = createSupabaseServiceClient();

  const [{ data: lead, error: leadError }, { data: score, error: scoreError }, { count: replyCount }] = await Promise.all([
    supabase.from("leads").select("email,phone,website,status,campaign_id").eq("id", leadId).maybeSingle(),
    supabase
      .from("lead_scores")
      .select("band")
      .eq("lead_id", leadId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase.from("reply_events").select("*", { count: "exact", head: true }).eq("lead_id", leadId)
  ]);

  if (leadError) throw new Error(leadError.message);
  if (!lead) throw new Error("Lead not found");
  if (!isValidBusinessEmail(lead.email)) {
    await rejectLeadWithoutUsableEmail(leadId);
    return { status: "rejected_missing_email", reasons: ["missing_valid_email"] };
  }
  if (blockedApprovalStatuses.has(lead.status)) {
    return { status: "archived/nurture", reasons: [`lead_status_${lead.status}`] };
  }
  if ((replyCount ?? 0) > 0) {
    await updateLeadStatus(leadId, "archived");
    return { status: "archived/nurture", reasons: ["reply_exists"] };
  }
  if (scoreError) throw new Error(scoreError.message);
  if (!score?.band) throw new Error("Lead must be scored before approval");
  if (await isSuppressed(lead)) {
    await createOrUpdateManualReview(leadId, "suppressed_contact", "high");
    await updateLeadStatus(leadId, "review_pending");
    return { status: "manual_review_pending", reasons: ["suppressed_contact"] };
  }

  const campaign = await getCampaignRoutingState(supabase, lead.campaign_id);
  if (campaign?.status === "archived") {
    await updateLeadStatus(leadId, "archived");
    return { status: "archived/nurture", reasons: ["campaign_archived"] };
  }
  if (campaign?.status === "paused") {
    await updateLeadStatus(leadId, "paused");
    return { status: "paused_campaign", reasons: ["campaign_paused"] };
  }
  if (!campaign?.assigned_inbox_id) {
    await createOrUpdateManualReview(leadId, "blocked_missing_inbox", "high");
    await updateLeadStatus(leadId, "blocked");
    return { status: "blocked_missing_inbox", reasons: ["missing_assigned_inbox"] };
  }
  if (await isGlobalOutreachPaused()) {
    await updateLeadStatus(leadId, "paused");
    return { status: "paused_global", reasons: ["global_outreach_paused"] };
  }

  const { data: sequence, error: sequenceError } = await supabase
    .from("outreach_sequences")
    .select("id")
    .eq("band", score.band)
    .eq("active", true)
    .eq("archived", false)
    .limit(1)
    .maybeSingle();

  if (sequenceError) throw new Error(sequenceError.message);
  if (!sequence?.id) {
    await createOrUpdateManualReview(leadId, `blocked_missing_sequence_${score.band}`, "high");
    await updateLeadStatus(leadId, "blocked");
    return { status: "blocked_missing_sequence", reasons: [`missing_outreach_sequence_${score.band}`] };
  }

  const queueResult = await createOrUpdateOutreachQueue({
    leadId,
    sequenceId: sequence.id,
    assignedInboxId: campaign.assigned_inbox_id
  });

  await supabase
    .from("manual_review_queue")
    .update({ review_status: "approved" })
    .eq("lead_id", leadId)
    .eq("review_status", "pending");

  return queueResult;
}

function leadNeedsManualReview(input: {
  band: string;
  confidence: string;
  weakHypothesis: boolean;
  manualReviewRequired: boolean;
}) {
  return (
    input.band === "A" ||
    input.confidence === "low" ||
    input.weakHypothesis ||
    input.manualReviewRequired
  );
}

function manualReviewReasons(input: {
  band: string;
  confidence: string;
  weakHypothesis: boolean;
  manualReviewRequired: boolean;
}) {
  return [
    input.band === "A" ? "band_a_first_email" : null,
    input.confidence === "low" ? "low_confidence" : null,
    input.weakHypothesis ? "generic_hypothesis" : null,
    input.manualReviewRequired ? "scoring_flag" : null
  ].filter((reason): reason is string => Boolean(reason));
}

async function routeManualReviewLead(leadId: string, reasons: string[], band: string): Promise<RoutingResult> {
  await createOrUpdateManualReview(leadId, reasons.join(", "), band === "A" ? "high" : "normal");
  await updateLeadStatus(leadId, "review_pending");
  return { status: "manual_review_pending", reasons };
}

async function routeNonReviewLead(leadId: string, band: string): Promise<RoutingResult> {
  if (band === "B") {
    return routeApprovedLead(leadId);
  }

  await updateLeadStatus(leadId, band === "C" ? "paused" : "archived");
  return { status: "archived/nurture", reasons: [`band_${band.toLowerCase()}`] };
}

async function routeLeadInternal(leadId: string): Promise<RoutingResult> {
  const supabase = createSupabaseServiceClient();

  const [{ data: lead }, { data: score }, { data: hypothesis }] = await Promise.all([
    supabase.from("leads").select("email,phone,whatsapp,website,status").eq("id", leadId).maybeSingle(),
    supabase
      .from("lead_scores")
      .select("*")
      .eq("lead_id", leadId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("automation_hypotheses")
      .select("outreach_hook")
      .eq("lead_id", leadId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()
  ]);

  if (!lead) throw new Error("Lead is required for routing");

  const hasValidEmail = isValidBusinessEmail(lead.email);
  if (!hasValidEmail) {
    await rejectLeadWithoutUsableEmail(leadId);
    return { status: "rejected_missing_email", reasons: ["missing_valid_email"] };
  }
  if (!score) throw new Error("Lead and score are required for routing");
  const weakHypothesis = !hypothesis?.outreach_hook;
  const reviewInput = {
    band: score.band,
    confidence: score.confidence,
    weakHypothesis,
    manualReviewRequired: score.manual_review_required
  };

  if (leadNeedsManualReview(reviewInput)) {
    return routeManualReviewLead(leadId, manualReviewReasons(reviewInput), score.band);
  }

  return routeNonReviewLead(leadId, score.band);
}

export async function routeLead(leadId: string): Promise<RoutingResult> {
  try {
    return await routeLeadInternal(leadId);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown routing error";
    try {
      await updateLeadStatus(leadId, "blocked");
    } catch {
      throw error;
    }
    return { status: "routing_failed", reasons: [message] };
  }
}

export async function createOrUpdateManualReview(
  leadId: string,
  reason: string,
  priority: "low" | "normal" | "high" = "normal"
) {
  const supabase = createSupabaseServiceClient();
  const { data: existingReview, error: existingError } = await supabase
    .from("manual_review_queue")
    .select("id")
    .eq("lead_id", leadId)
    .eq("review_status", "pending")
    .maybeSingle();

  if (existingError) throw new Error(existingError.message);

  const payload = {
    lead_id: leadId,
    reason,
    priority,
    review_status: "pending"
  };

  const { error } = existingReview
    ? await supabase.from("manual_review_queue").update(payload).eq("id", existingReview.id)
    : await supabase.from("manual_review_queue").insert(payload);

  if (error && !isUniqueConflict(error)) throw new Error(error.message);
  if (!error) return;

  const { data: conflictingReview, error: conflictFetchError } = await supabase
    .from("manual_review_queue")
    .select("id")
    .eq("lead_id", leadId)
    .eq("review_status", "pending")
    .maybeSingle();

  if (conflictFetchError) throw new Error(conflictFetchError.message);
  if (!conflictingReview?.id) throw new Error(error.message);

  const { error: updateError } = await supabase
    .from("manual_review_queue")
    .update(payload)
    .eq("id", conflictingReview.id);

  if (updateError) throw new Error(updateError.message);
}
