import { requireAppActor } from "@/lib/app/auth";
import { logCrmAction } from "@/lib/app/audit";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

export async function completeManualReview(
  manualReviewId: string,
  reviewStatus: "approved" | "rejected" | "handled",
  reviewNotes?: string
) {
  const actor = await requireAppActor();
  const supabase = createSupabaseServiceClient();
  const completedAt = new Date().toISOString();
  const { data, error } = await supabase
    .from("manual_review_queue")
    .update({
      review_status: reviewStatus,
      review_notes: reviewNotes ?? null,
      completed_at: completedAt,
      completed_by: actor.displayName,
      completed_by_user_id: actor.userId
    })
    .eq("id", manualReviewId)
    .select("id,lead_id")
    .single();

  if (error) throw new Error(error.message);

  await logCrmAction({
    actor,
    actionType: "manual_review_completed",
    leadId: data.lead_id,
    manualReviewId: data.id,
    detail: { review_status: reviewStatus, review_notes: reviewNotes ?? null }
  });
}
