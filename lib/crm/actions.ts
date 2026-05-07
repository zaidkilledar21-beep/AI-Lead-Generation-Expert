"use server";

import { revalidatePath } from "next/cache";
import { requireAppActor } from "@/lib/app/auth";
import { logCrmAction } from "@/lib/app/audit";
import { approveCrmLeadForOutreach, updateCrmLeadStatus, type DashboardLeadStatus } from "@/lib/app/leads";
import { updateGlobalOutreachSettings } from "@/lib/app/settings";
import { MANUAL_BOARD_MOVE_STATUSES, type ManualBoardMoveStatus } from "@/lib/crm/status-contract";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

function cleanText(value: FormDataEntryValue | null) {
  const text = typeof value === "string" ? value.trim() : "";
  return text.length > 0 ? text : null;
}

const rejectionNoteRequiredMessage = "Please explain why this item is being rejected.";

const editableLeadFields = [
  "business_name",
  "email",
  "phone",
  "whatsapp",
  "website",
  "linkedin_url",
  "decision_maker_name",
  "decision_maker_role"
] as const;

type EditableLeadField = typeof editableLeadFields[number];

function isEditableLeadField(field: string): field is EditableLeadField {
  return (editableLeadFields as readonly string[]).includes(field);
}

function isAsciiWhitespace(char: string) {
  return char === " " || char === "\t" || char === "\n" || char === "\r" || char === "\f";
}

function hasAsciiWhitespace(value: string) {
  for (const char of value) {
    if (isAsciiWhitespace(char)) return true;
  }
  return false;
}

function hasHttpScheme(value: string) {
  const prefix = value.slice(0, 8).toLowerCase();
  return prefix.startsWith("http://") || prefix.startsWith("https://");
}

function normalizeInlineText(value: string) {
  let normalized = "";
  let previousWasSpace = false;

  for (const char of value) {
    if (isAsciiWhitespace(char)) {
      if (!previousWasSpace) normalized += " ";
      previousWasSpace = true;
    } else {
      normalized += char;
      previousWasSpace = false;
    }
  }

  return normalized.trim();
}

function isValidEmailAddress(value: string) {
  if (value.length > 254 || hasAsciiWhitespace(value)) return false;

  const atIndex = value.indexOf("@");
  if (atIndex <= 0 || atIndex !== value.lastIndexOf("@") || atIndex === value.length - 1) {
    return false;
  }

  const localPart = value.slice(0, atIndex);
  const domain = value.slice(atIndex + 1);
  if (localPart.length > 64 || domain.length > 253) return false;
  if (!domain.includes(".") || domain.startsWith(".") || domain.endsWith(".")) return false;

  return domain.split(".").every((label) => label.length > 0 && label.length <= 63);
}

function normalizeEditableLeadValue(field: EditableLeadField, value: string) {
  const trimmed = value.trim();
  if (field === "business_name") {
    if (!trimmed) throw new Error("Business name cannot be blank");
    return trimmed;
  }
  if (field === "email") {
    if (!trimmed) return null;
    if (!isValidEmailAddress(trimmed)) throw new Error("Email must be a valid email address");
    return trimmed.toLowerCase();
  }
  if (field === "website" || field === "linkedin_url") {
    if (!trimmed) return null;
    try {
      const url = new URL(hasHttpScheme(trimmed) ? trimmed : `https://${trimmed}`);
      if (url.protocol !== "http:" && url.protocol !== "https:") {
        throw new Error("Unsupported URL protocol");
      }
      return url.toString();
    } catch {
      throw new Error(field === "website" ? "Website must be a valid URL" : "LinkedIn URL must be a valid URL");
    }
  }
  if (field === "phone" || field === "whatsapp") {
    return normalizeInlineText(trimmed) || null;
  }
  return trimmed || null;
}

async function closePendingReplyReviewItems({
  supabase,
  leadId,
  actor,
  notes
}: Readonly<{
  supabase: ReturnType<typeof createSupabaseServiceClient>;
  leadId: string | null;
  actor: Awaited<ReturnType<typeof requireAppActor>>;
  notes?: string | null;
}>) {
  if (!leadId) return;

  const { error } = await supabase
    .from("manual_review_queue")
    .update({
      review_status: "approved",
      review_notes: notes ?? "Reply review resolved from CRM.",
      completed_at: new Date().toISOString(),
      completed_by: actor.displayName,
      completed_by_user_id: actor.userId
    })
    .eq("lead_id", leadId)
    .eq("review_status", "pending")
    .like("reason", "reply_%");

  if (error) throw new Error(error.message);
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
  revalidatePath("/inbox");
}

export async function approveLeadAction(formData: FormData) {
  const leadId = cleanText(formData.get("leadId"));
  if (!leadId) throw new Error("leadId is required");
  await approveCrmLeadForOutreach(leadId);
  revalidatePath("/pipeline");
  revalidatePath(`/pipeline/${leadId}`);
}

export async function changeLeadStatusAction(formData: FormData) {
  const leadId = cleanText(formData.get("leadId"));
  const status = cleanText(formData.get("status"));
  if (!leadId) throw new Error("leadId is required");
  if (!status || !["paused", "unsubscribed", "archived"].includes(status)) {
    throw new Error("Unsupported status");
  }
  await updateCrmLeadStatus(leadId, status as DashboardLeadStatus);
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
  const replyEventId = cleanText(formData.get("replyEventId"));
  const notes = cleanText(formData.get("notes"));
  if (!leadId) throw new Error("leadId is required");
  if (outcome !== "won" && outcome !== "lost") throw new Error("Unsupported close outcome");
  if (outcome === "lost" && replyEventId && !notes) throw new Error(rejectionNoteRequiredMessage);

  const actor = await requireAppActor();
  const status = outcome === "won" ? "closed_won" : "closed_lost";
  await updateCrmLeadStatus(leadId, status);

  const supabase = createSupabaseServiceClient();
  const { error } = await supabase
    .from("leads")
    .update({ closed_at: new Date().toISOString(), closed_by: actor.displayName })
    .eq("id", leadId);
  if (error) throw new Error(error.message);

  if (replyEventId) {
    const { error: replyError } = await supabase
      .from("reply_events")
      .update({
        handled_at: new Date().toISOString(),
        handled_by: actor.displayName,
        handled_by_user_id: actor.userId,
        handled_notes: notes ?? `Marked ${outcome}`,
        requires_human_review: false
      })
      .eq("id", replyEventId);
    if (replyError) throw new Error(replyError.message);
  }

  const { error: replyReviewError } = await supabase
    .from("reply_events")
    .update({ requires_human_review: false })
    .eq("lead_id", leadId)
    .eq("requires_human_review", true);
  if (replyReviewError) throw new Error(replyReviewError.message);

  await closePendingReplyReviewItems({
    supabase,
    leadId,
    actor,
    notes: notes ?? `Marked ${outcome}; pending reply review closed.`
  });

  await logCrmAction({
    actor,
    actionType: outcome === "won" ? "marked_closed_won" : "marked_closed_lost",
    leadId,
    replyEventId,
    detail: { outcome, notes, closed_pending_reply_reviews: true }
  });

  revalidatePath("/pipeline");
  revalidatePath(`/pipeline/${leadId}`);
  revalidatePath("/inbox");
  revalidatePath("/review");
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
      handled_notes: notes,
      requires_human_review: false
    })
    .eq("id", replyEventId);
  if (error) throw new Error(error.message);

  if (leadId) {
    const { error: eventError } = await supabase.from("outreach_events").insert({
      lead_id: leadId,
      event_type: "manual_takeover",
      metadata: {
        source: "crm_inbox",
        reply_event_id: replyEventId,
        handled_by: actor.displayName
      },
      created_at: new Date().toISOString()
    });
    if (eventError) throw new Error(eventError.message);

    await closePendingReplyReviewItems({
      supabase,
      leadId,
      actor,
      notes
    });
  }

  await logCrmAction({ actor, actionType: "reply_handled", leadId, replyEventId, detail: { notes } });
  revalidatePath("/inbox");
  revalidatePath("/review");
  revalidatePath("/pipeline");
  if (leadId) revalidatePath(`/pipeline/${leadId}`);
}

export async function completeReviewAction(formData: FormData) {
  const reviewId = cleanText(formData.get("reviewId"));
  const leadId = cleanText(formData.get("leadId"));
  const decision = cleanText(formData.get("decision"));
  const notes = cleanText(formData.get("notes"));
  if (!reviewId) throw new Error("reviewId is required");
  if (!leadId) throw new Error("leadId is required");
  if (decision !== "approved" && decision !== "rejected") {
    throw new Error("Unsupported review decision");
  }
  if (decision === "rejected" && !notes) throw new Error(rejectionNoteRequiredMessage);

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

  if (decision === "approved") {
    await approveCrmLeadForOutreach(leadId);
  } else {
    await updateCrmLeadStatus(leadId, "archived");
  }

  await logCrmAction({
    actor,
    actionType: "manual_review_completed",
    leadId,
    manualReviewId: reviewId,
    detail: { decision, notes }
  });
  revalidatePath("/review");
  revalidatePath("/pipeline");
  revalidatePath(`/pipeline/${leadId}`);
}

export async function completeReviewQueueItemAction(formData: FormData) {
  const source = cleanText(formData.get("source"));
  const decision = cleanText(formData.get("decision"));

  if (source === "manual_review") {
    return completeReviewAction(formData);
  }

  if (source === "email_draft") {
    if (decision === "approved") return approveEmailDraftAction(formData);
    if (decision === "rejected") return rejectEmailDraftAction(formData);
    throw new Error("Unsupported draft review decision");
  }

  if (source === "reply_event") {
    if (decision === "mark_reply_handled") return markReplyHandledAction(formData);
    if (decision === "won" || decision === "lost") return closeLeadAction(formData);
    throw new Error("Unsupported reply review decision");
  }

  throw new Error("Unsupported review item source");
}

export async function approveEmailDraftAction(formData: FormData) {
  const draftId = cleanText(formData.get("draftId"));
  const leadId = cleanText(formData.get("leadId"));
  if (!draftId) throw new Error("draftId is required");
  if (!leadId) throw new Error("leadId is required");

  const actor = await requireAppActor();
  const supabase = createSupabaseServiceClient();

  const { error } = await supabase
    .from("email_drafts")
    .update({
      approval_status: "approved",
      validation_passed: true,
      approved_at: new Date().toISOString(),
      approved_by: actor.displayName,
      updated_at: new Date().toISOString()
    })
    .eq("id", draftId)
    .eq("lead_id", leadId);

  if (error) throw new Error(error.message);

  await logCrmAction({
    actor,
    actionType: "email_draft_approved",
    leadId,
    detail: { draft_id: draftId }
  });

  revalidatePath(`/pipeline/${leadId}`);
  revalidatePath("/pipeline");
  revalidatePath("/review");
}

export async function updateEmailDraftAction(formData: FormData) {
  const draftId = cleanText(formData.get("draftId"));
  const leadId = cleanText(formData.get("leadId"));
  const subject = cleanText(formData.get("subject"));
  const body = cleanText(formData.get("body"));
  if (!draftId) throw new Error("draftId is required");
  if (!leadId) throw new Error("leadId is required");
  if (!subject) throw new Error("Subject is required");
  if (!body) throw new Error("Body is required");

  const actor = await requireAppActor();
  const supabase = createSupabaseServiceClient();
  const { error } = await supabase
    .from("email_drafts")
    .update({
      subject,
      subject_line: subject,
      body,
      message_body: body,
      validation_passed: true,
      approval_status: "pending",
      edited_by_founder: actor.displayName,
      edited_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq("id", draftId)
    .eq("lead_id", leadId)
    .eq("sent", false);

  if (error) throw new Error(error.message);

  await logCrmAction({
    actor,
    actionType: "email_draft_edited",
    leadId,
    detail: { draft_id: draftId, subject_length: subject.length, body_length: body.length }
  });

  revalidatePath(`/pipeline/${leadId}`);
  revalidatePath("/review");
}

export async function regenerateEmailDraftAction(formData: FormData) {
  const draftId = cleanText(formData.get("draftId"));
  const leadId = cleanText(formData.get("leadId"));
  const reason = cleanText(formData.get("reason"));
  if (!draftId) throw new Error("draftId is required");
  if (!leadId) throw new Error("leadId is required");
  if (!reason) throw new Error(rejectionNoteRequiredMessage);

  const actor = await requireAppActor();
  const supabase = createSupabaseServiceClient();
  const requestedAt = new Date().toISOString();
  const { error } = await supabase
    .from("email_drafts")
    .update({
      approval_status: "regeneration_requested",
      block_reason: reason ?? "regeneration_requested_by_founder",
      updated_at: requestedAt
    })
    .eq("id", draftId)
    .eq("lead_id", leadId)
    .eq("sent", false);

  if (error) throw new Error(error.message);

  const { error: workflowError } = await supabase.from("workflow_events").insert({
    workflow_name: "WF-05 Draft Generation",
    lead_id: leadId,
    event_type: "draft_regeneration_requested",
    status: "started",
    payload: {
      draft_id: draftId,
      lead_id: leadId,
      requested_by_user_id: actor.userId,
      requested_by: actor.displayName,
      reason,
      requested_at: requestedAt
    }
  });
  if (workflowError) throw new Error(workflowError.message);

  await logCrmAction({
    actor,
    actionType: "email_draft_regeneration_requested",
    leadId,
    detail: { draft_id: draftId, reason, requested_at: requestedAt, requested_by_user_id: actor.userId }
  });

  revalidatePath(`/pipeline/${leadId}`);
  revalidatePath("/review");
}

export async function rejectEmailDraftAction(formData: FormData) {
  const draftId = cleanText(formData.get("draftId"));
  const leadId = cleanText(formData.get("leadId"));
  const reason = cleanText(formData.get("reason"));
  if (!draftId) throw new Error("draftId is required");
  if (!leadId) throw new Error("leadId is required");

  const actor = await requireAppActor();
  const supabase = createSupabaseServiceClient();

  const { data: draft, error: draftLoadError } = await supabase
    .from("email_drafts")
    .select("queue_id")
    .eq("id", draftId)
    .eq("lead_id", leadId)
    .maybeSingle();
  if (draftLoadError) throw new Error(draftLoadError.message);

  const { error } = await supabase
    .from("email_drafts")
    .update({
      approval_status: "rejected",
      block_reason: reason ?? "draft_rejected_by_founder",
      updated_at: new Date().toISOString()
    })
    .eq("id", draftId)
    .eq("lead_id", leadId);

  if (error) throw new Error(error.message);

  if (draft?.queue_id) {
    const { error: queueError } = await supabase
      .from("outreach_queue")
      .update({
        status: "blocked",
        pause_reason: "draft_rejected_by_founder",
        updated_at: new Date().toISOString()
      })
      .eq("id", draft.queue_id);
    if (queueError) throw new Error(queueError.message);

    const { error: blockError } = await supabase.from("send_blocks").insert({
      queue_id: draft.queue_id,
      lead_id: leadId,
      reason: reason ?? "draft_rejected_by_founder",
      raw_payload: { source: "crm", draft_id: draftId },
      created_at: new Date().toISOString()
    });
    if (blockError) throw new Error(blockError.message);
  }

  await updateCrmLeadStatus(leadId, "blocked");

  await logCrmAction({
    actor,
    actionType: "email_draft_rejected",
    leadId,
    detail: { draft_id: draftId, reason }
  });

  revalidatePath(`/pipeline/${leadId}`);
  revalidatePath("/pipeline");
  revalidatePath("/review");
}

export async function saveFilterAction(formData: FormData) {
  const actor = await requireAppActor();
  const supabase = createSupabaseServiceClient();
  const name = cleanText(formData.get("name"));
  const viewKey = cleanText(formData.get("viewKey")) ?? "pipeline";
  const filtersRaw = cleanText(formData.get("filters"));
  if (!name || !filtersRaw) throw new Error("Filter name and filters are required");

  const filters = JSON.parse(filtersRaw);
  const { error } = await supabase.from("saved_filters").insert({
    name,
    view_key: viewKey,
    filters,
    created_by: actor.displayName,
    created_by_user_id: actor.userId,
    is_shared: true
  });

  if (error) throw new Error(error.message);
  revalidatePath("/pipeline");
}

export async function deleteFilterAction(formData: FormData) {
  const id = cleanText(formData.get("id"));
  if (!id) throw new Error("Saved filter id is required");
  await requireAppActor();
  const supabase = createSupabaseServiceClient();
  const { error } = await supabase.from("saved_filters").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/pipeline");
}

export async function toggleGlobalPauseAction() {
  await requireAppActor();
  const supabase = createSupabaseServiceClient();
  const { data: current } = await supabase
    .from("app_settings")
    .select("value")
    .eq("key", "global_outreach")
    .maybeSingle();
  const value = current?.value as { paused?: boolean } | null;
  const isCurrentlyPaused = value?.paused ?? true;
  const newPausedState = !isCurrentlyPaused;

  await updateGlobalOutreachSettings({ paused: newPausedState });
  revalidatePath("/", "layout");
  revalidatePath("/pipeline");
  revalidatePath("/settings");
}

export async function bulkApproveLeadsAction(leadIds: string[]) {
  if (!leadIds || leadIds.length === 0) return;
  const actor = await requireAppActor();
  const uniqueLeadIds = [...new Set(leadIds.filter(Boolean))];

  const results = await Promise.allSettled(uniqueLeadIds.map((leadId) => approveCrmLeadForOutreach(leadId)));

  const failed = results
    .map((result, index) => ({ result, leadId: uniqueLeadIds[index] }))
    .filter((item) => item.result.status === "rejected");

  await logCrmAction({
    actor,
    actionType: "bulk_approved",
    leadId: null,
    detail: {
      count: uniqueLeadIds.length,
      success_count: uniqueLeadIds.length - failed.length,
      failed_count: failed.length,
      failed_lead_ids: failed.map((item) => item.leadId)
    }
  });

  if (failed.length > 0) {
    throw new Error(`${failed.length} lead(s) failed approval. Check CRM action log/workflow events.`);
  }

  revalidatePath("/pipeline");
  revalidatePath("/review");
}

export async function bulkChangeLeadStatusAction(leadIds: string[], status: "paused" | "unsubscribed" | "archived") {
  if (!leadIds || leadIds.length === 0) return;
  if (!["paused", "unsubscribed", "archived"].includes(status)) {
    throw new Error("Unsupported status");
  }

  const actor = await requireAppActor();
  const uniqueLeadIds = [...new Set(leadIds.filter(Boolean))];

  const results = await Promise.allSettled(uniqueLeadIds.map((leadId) => updateCrmLeadStatus(leadId, status)));

  const failed = results
    .map((result, index) => ({ result, leadId: uniqueLeadIds[index] }))
    .filter((item) => item.result.status === "rejected");

  await logCrmAction({
    actor,
    actionType: "bulk_status_change",
    leadId: null,
    detail: {
      count: uniqueLeadIds.length,
      status,
      success_count: uniqueLeadIds.length - failed.length,
      failed_count: failed.length,
      failed_lead_ids: failed.map((item) => item.leadId)
    }
  });

  if (failed.length > 0) {
    throw new Error(`${failed.length} lead(s) failed status update. Check CRM action log/workflow events.`);
  }

  revalidatePath("/pipeline");
  revalidatePath("/review");
  revalidatePath("/inbox");
}

export async function bulkAssignLeadsAction(leadIds: string[], assignedTo: string | null) {
  if (!leadIds || leadIds.length === 0) return;

  const actor = await requireAppActor();
  const uniqueLeadIds = [...new Set(leadIds.filter(Boolean))];
  const supabase = createSupabaseServiceClient();
  const { error } = await supabase.from("leads").update({ assigned_to: assignedTo }).in("id", uniqueLeadIds);
  if (error) throw new Error(error.message);

  await logCrmAction({
    actor,
    actionType: "assigned_to_founder",
    leadId: null,
    detail: {
      event: "bulk_assigned",
      count: uniqueLeadIds.length,
      assigned_to: assignedTo,
      lead_ids: uniqueLeadIds
    }
  });

  revalidatePath("/pipeline");
  revalidatePath("/review");
}

export async function moveLeadOnBoardAction(leadId: string, status: ManualBoardMoveStatus) {
  if (!leadId) throw new Error("leadId is required");
  if (!(MANUAL_BOARD_MOVE_STATUSES as readonly string[]).includes(status)) {
    throw new Error("Unsupported board transition");
  }

  const actor = await requireAppActor();
  const supabase = createSupabaseServiceClient();
  const { data: lead, error: leadError } = await supabase
    .from("leads")
    .select("status")
    .eq("id", leadId)
    .maybeSingle();
  if (leadError) throw new Error(leadError.message);
  if (!lead) throw new Error("Lead not found");
  const oldStatus = lead.status as string;
  if (oldStatus === status) return;

  await updateCrmLeadStatus(leadId, status);

  await logCrmAction({
    actor,
    actionType: "manual_board_move",
    leadId,
    detail: {
      event_type: "manual_board_move",
      old_status: oldStatus,
      new_status: status,
      metadata: {
        source: "pipeline_kanban_board",
        actor_id: actor.userId,
        performed_by: actor.displayName
      }
    }
  });

  if (status === "closed_won" || status === "closed_lost") {
    const { error } = await supabase
      .from("leads")
      .update({
        closed_at: new Date().toISOString(),
        closed_by: actor.displayName
      })
      .eq("id", leadId);
    if (error) throw new Error(error.message);

    const { error: replyError } = await supabase
      .from("reply_events")
      .update({ requires_human_review: false })
      .eq("lead_id", leadId)
      .eq("requires_human_review", true);
    if (replyError) throw new Error(replyError.message);

    await closePendingReplyReviewItems({
      supabase,
      leadId,
      actor,
      notes: `Lead moved to ${status}; pending reply review closed.`
    });

    await logCrmAction({
      actor,
      actionType: status === "closed_won" ? "marked_closed_won" : "marked_closed_lost",
      leadId,
      detail: { source: "manual_board_move", status, closed_pending_reply_reviews: true }
    });
  }

  revalidatePath("/pipeline");
  revalidatePath(`/pipeline/${leadId}`);
}

export async function updateLeadFieldAction(leadId: string, field: string, value: string) {
  if (!leadId || !field) throw new Error("leadId and field are required");
  if (!isEditableLeadField(field)) {
    throw new Error(`Unsupported field update: ${field}`);
  }
  const normalizedValue = normalizeEditableLeadValue(field, value);

  const actor = await requireAppActor();
  const supabase = createSupabaseServiceClient();
  const { data: lead, error: loadError } = await supabase
    .from("leads")
    .select(field)
    .eq("id", leadId)
    .maybeSingle();
  if (loadError) throw new Error(loadError.message);
  if (!lead) throw new Error("Lead not found");
  const oldValue = (lead as Record<string, unknown>)[field] ?? null;

  const { error } = await supabase
    .from("leads")
    .update({ [field]: normalizedValue, updated_at: new Date().toISOString() })
    .eq("id", leadId);

  if (error) throw new Error(error.message);

  await logCrmAction({
    actor,
    actionType: "lead_field_updated",
    leadId,
    detail: {
      field_changed: field,
      old_value: oldValue,
      new_value: normalizedValue,
      actor_id: actor.userId,
      performed_by: actor.displayName
    }
  });

  revalidatePath(`/pipeline/${leadId}`);
  revalidatePath("/pipeline");
  return { value: normalizedValue };
}
