"use server";

import { revalidatePath } from "next/cache";
import { requireAppActor } from "@/lib/app/auth";
import { logCrmAction } from "@/lib/app/audit";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

function cleanText(value: FormDataEntryValue | null) {
  const text = typeof value === "string" ? value.trim() : "";
  return text.length > 0 ? text : null;
}

export async function assignLeadAction(formData: FormData) {
  const leadId = cleanText(formData.get("leadId"));
  const assignedTo = cleanText(formData.get("assignedTo"));
  if (!leadId) throw new Error("leadId is required");

  const actor = await requireAppActor();
  const supabase = createSupabaseServiceClient();
  const { error } = await supabase.from("leads").update({ assigned_to: assignedTo }).eq("id", leadId);
  if (error) throw new Error(error.message);

  await logCrmAction({ actor, actionType: "assigned_to_founder", leadId, detail: { assigned_to: assignedTo } });
  revalidatePath("/pipeline");
  revalidatePath(`/pipeline/${leadId}`);
}

export async function updateLeadNotesAction(formData: FormData) {
  const leadId = cleanText(formData.get("leadId"));
  const notes = cleanText(formData.get("notes"));
  if (!leadId) throw new Error("leadId is required");

  const actor = await requireAppActor();
  const supabase = createSupabaseServiceClient();
  const { error } = await supabase
    .from("leads")
    .update({
      notes,
      notes_updated_at: new Date().toISOString(),
      notes_updated_by: actor.displayName
    })
    .eq("id", leadId);
  if (error) throw new Error(error.message);

  const { error: noteError } = await supabase.from("lead_notes").insert({
    lead_id: leadId,
    body: notes ?? "",
    created_by: actor.displayName,
    created_by_user_id: actor.userId
  });
  if (noteError) throw new Error(noteError.message);

  await logCrmAction({ actor, actionType: "note_added", leadId, detail: { length: notes?.length ?? 0 } });
  revalidatePath(`/pipeline/${leadId}`);
}

export async function closeLeadAction(formData: FormData) {
  const leadId = cleanText(formData.get("leadId"));
  const outcome = cleanText(formData.get("outcome"));
  if (!leadId) throw new Error("leadId is required");
  if (outcome !== "won" && outcome !== "lost") throw new Error("Unsupported close outcome");

  const actor = await requireAppActor();
  const status = outcome === "won" ? "closed_won" : "closed_lost";
  const supabase = createSupabaseServiceClient();
  const { error } = await supabase
    .from("leads")
    .update({ status, closed_at: new Date().toISOString(), closed_by: actor.displayName })
    .eq("id", leadId);
  if (error) throw new Error(error.message);

  await logCrmAction({
    actor,
    actionType: outcome === "won" ? "marked_closed_won" : "marked_closed_lost",
    leadId,
    detail: { status }
  });
  revalidatePath("/pipeline");
  revalidatePath(`/pipeline/${leadId}`);
}

export async function overrideBandAction(formData: FormData) {
  const leadId = cleanText(formData.get("leadId"));
  const band = cleanText(formData.get("band"));
  const reason = cleanText(formData.get("reason"));
  if (!leadId) throw new Error("leadId is required");
  if (!["A", "B", "C", "D"].includes(band ?? "")) throw new Error("Unsupported band");

  const actor = await requireAppActor();
  const supabase = createSupabaseServiceClient();
  const { error } = await supabase
    .from("leads")
    .update({
      band_override: band,
      band_override_reason: reason,
      band_override_by: actor.displayName,
      band_override_at: new Date().toISOString()
    })
    .eq("id", leadId);
  if (error) throw new Error(error.message);

  await logCrmAction({ actor, actionType: "band_overridden", leadId, detail: { band, reason } });
  revalidatePath("/pipeline");
  revalidatePath(`/pipeline/${leadId}`);
}

export async function markReplyHandledAction(formData: FormData) {
  const replyEventId = cleanText(formData.get("replyEventId"));
  const leadId = cleanText(formData.get("leadId"));
  const notes = cleanText(formData.get("notes"));
  if (!replyEventId) throw new Error("replyEventId is required");

  const actor = await requireAppActor();
  const supabase = createSupabaseServiceClient();
  const { error } = await supabase
    .from("reply_events")
    .update({
      handled_at: new Date().toISOString(),
      handled_by: actor.displayName,
      handled_by_user_id: actor.userId,
      handled_notes: notes
    })
    .eq("id", replyEventId);
  if (error) throw new Error(error.message);

  await logCrmAction({ actor, actionType: "reply_handled", leadId, replyEventId, detail: { notes } });
  revalidatePath("/inbox");
  if (leadId) revalidatePath(`/pipeline/${leadId}`);
}

export async function completeReviewAction(formData: FormData) {
  const reviewId = cleanText(formData.get("reviewId"));
  const leadId = cleanText(formData.get("leadId"));
  const decision = cleanText(formData.get("decision"));
  const notes = cleanText(formData.get("notes"));
  if (!reviewId) throw new Error("reviewId is required");
  if (decision !== "approved" && decision !== "rejected" && decision !== "handled") {
    throw new Error("Unsupported review decision");
  }

  const actor = await requireAppActor();
  const supabase = createSupabaseServiceClient();
  const { error } = await supabase
    .from("manual_review_queue")
    .update({
      review_status: decision,
      review_notes: notes,
      completed_at: new Date().toISOString(),
      completed_by: actor.displayName,
      completed_by_user_id: actor.userId
    })
    .eq("id", reviewId);
  if (error) throw new Error(error.message);

  await logCrmAction({
    actor,
    actionType: "manual_review_completed",
    leadId,
    manualReviewId: reviewId,
    detail: { decision, notes }
  });
  revalidatePath("/review");
  if (leadId) revalidatePath(`/pipeline/${leadId}`);
}
