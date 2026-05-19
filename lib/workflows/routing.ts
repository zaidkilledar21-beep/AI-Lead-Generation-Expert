import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { isValidBusinessEmail, normalizeDomain, normalizePhone } from "@/lib/workflows/contact-extraction";
import type { LeadStatus } from "@/lib/types";

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

export async function routeApprovedLead(leadId: string) {
  const supabase = createSupabaseServiceClient();

  const [{ data: lead, error: leadError }, { data: score, error: scoreError }, { count: replyCount }] = await Promise.all([
    supabase.from("leads").select("email,phone,website,status").eq("id", leadId).maybeSingle(),
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
    await createOrUpdateManualReview(leadId, "missing_valid_email", "normal");
    await updateLeadStatus(leadId, "review_pending");
    return { status: "review_pending", reasons: ["missing_valid_email"] };
  }
  if (blockedApprovalStatuses.has(lead.status)) {
    throw new Error(`Lead status blocks outreach approval: ${lead.status}`);
  }
  if ((replyCount ?? 0) > 0) {
    await updateLeadStatus(leadId, "paused");
    return { status: "paused", reasons: ["reply_exists"] };
  }
  if (scoreError) throw new Error(scoreError.message);
  if (!score?.band) throw new Error("Lead must be scored before approval");
  if (await isSuppressed(lead)) {
    await createOrUpdateManualReview(leadId, "suppressed_contact", "high");
    await updateLeadStatus(leadId, "review_pending");
    return { status: "review_pending", reasons: ["suppressed_contact"] };
  }
  if (await isGlobalOutreachPaused()) {
    await createOrUpdateManualReview(leadId, "global_outreach_paused", "normal");
    await updateLeadStatus(leadId, "review_pending");
    return { status: "review_pending", reasons: ["global_outreach_paused"] };
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
    await createOrUpdateManualReview(leadId, `missing_outreach_sequence_${score.band}`, "high");
    await updateLeadStatus(leadId, "review_pending");
    return { status: "review_pending", reasons: [`missing_outreach_sequence_${score.band}`] };
  }

  const { error: queueError } = await supabase.from("outreach_queue").upsert(
    {
      lead_id: leadId,
      sequence_id: sequence.id,
      current_step: 1,
      next_send_at: new Date().toISOString(),
      status: "queued"
    },
    { onConflict: "lead_id,sequence_id" }
  );

  if (queueError) throw new Error(`Failed to queue lead: ${queueError.message}`);

  await supabase
    .from("manual_review_queue")
    .update({ review_status: "approved" })
    .eq("lead_id", leadId)
    .eq("review_status", "pending");

  await updateLeadStatus(leadId, "queued");
  return { status: "queued", reasons: [] };
}

export async function routeLead(leadId: string) {
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

  if (!lead || !score) throw new Error("Lead and score are required for routing");

  const hasValidEmail = isValidBusinessEmail(lead.email);
  const reachable = Boolean(hasValidEmail || lead.phone || lead.whatsapp);
  const weakHypothesis = !hypothesis?.outreach_hook;
  const needsReview = score.band === "A" || score.confidence === "low" || !reachable || weakHypothesis || score.manual_review_required;

  if (needsReview) {
    const reasons = [
      score.band === "A" ? "band_a_first_email" : null,
      score.confidence === "low" ? "low_confidence" : null,
      !reachable ? "missing_contact" : null,
      lead.email && !hasValidEmail ? "invalid_email" : null,
      weakHypothesis ? "generic_hypothesis" : null,
      score.manual_review_required ? "scoring_flag" : null
    ].filter(Boolean);

    const { data: existingReview, error: existingError } = await supabase
      .from("manual_review_queue")
      .select("id")
      .eq("lead_id", leadId)
      .eq("review_status", "pending")
      .maybeSingle();

    if (existingError) throw new Error(existingError.message);

    const reviewPayload = {
      lead_id: leadId,
      reason: reasons.join(", "),
      priority: score.band === "A" ? "high" : "normal",
      review_status: "pending"
    };

    const { error } = existingReview
      ? await supabase.from("manual_review_queue").update(reviewPayload).eq("id", existingReview.id)
      : await supabase.from("manual_review_queue").insert(reviewPayload);

    if (error) throw new Error(error.message);

    await updateLeadStatus(leadId, "review_pending");
    return { status: "review_pending", reasons };
  }

  if (score.band === "B") {
    return routeApprovedLead(leadId);
  }

  await updateLeadStatus(leadId, score.band === "C" ? "paused" : "archived");
  return { status: score.band === "C" ? "paused" : "archived", reasons: [] };
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

  if (error) throw new Error(error.message);
}
