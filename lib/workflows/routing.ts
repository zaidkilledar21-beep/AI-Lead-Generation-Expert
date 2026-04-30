import { createSupabaseServiceClient } from "@/lib/supabase/server";
import type { LeadStatus } from "@/lib/types";

const blockedApprovalStatuses = new Set(["paused", "replied", "unsubscribed", "bounced", "not_interested", "archived"]);

export async function updateLeadStatus(leadId: string, status: LeadStatus) {
  const supabase = createSupabaseServiceClient();
  const { error } = await supabase.from("leads").update({ status }).eq("id", leadId);

  if (error) {
    throw new Error(`Failed to update lead status: ${error.message}`);
  }
}

export async function routeApprovedLead(leadId: string) {
  const supabase = createSupabaseServiceClient();

  if (process.env.GLOBAL_OUTREACH_PAUSED === "true") {
    throw new Error("Global outreach is paused");
  }

  const [{ data: lead, error: leadError }, { data: score, error: scoreError }, { count: replyCount }] = await Promise.all([
    supabase.from("leads").select("email,status").eq("id", leadId).maybeSingle(),
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
  if (!lead.email) throw new Error("Lead needs a prospect email before outreach approval");
  if (blockedApprovalStatuses.has(lead.status)) {
    throw new Error(`Lead status blocks outreach approval: ${lead.status}`);
  }
  if ((replyCount ?? 0) > 0) throw new Error("Lead already has a reply; outreach must remain paused");
  if (scoreError) throw new Error(scoreError.message);
  if (!score?.band) throw new Error("Lead must be scored before approval");

  const { data: sequence, error: sequenceError } = await supabase
    .from("outreach_sequences")
    .select("id")
    .eq("band", score.band)
    .eq("active", true)
    .limit(1)
    .maybeSingle();

  if (sequenceError) throw new Error(sequenceError.message);
  if (!sequence?.id) throw new Error(`No active sequence found for band ${score.band}`);

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
}

export async function routeLead(leadId: string) {
  const supabase = createSupabaseServiceClient();

  const [{ data: lead }, { data: score }, { data: hypothesis }] = await Promise.all([
    supabase.from("leads").select("email,phone,whatsapp,status").eq("id", leadId).maybeSingle(),
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

  const reachable = Boolean(lead.email || lead.phone || lead.whatsapp);
  const weakHypothesis = !hypothesis?.outreach_hook;
  const needsReview = score.band === "A" || score.confidence === "low" || !reachable || weakHypothesis || score.manual_review_required;

  if (needsReview) {
    const reasons = [
      score.band === "A" ? "band_a_first_email" : null,
      score.confidence === "low" ? "low_confidence" : null,
      !reachable ? "missing_contact" : null,
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
    await routeApprovedLead(leadId);
    return { status: "queued", reasons: [] };
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
