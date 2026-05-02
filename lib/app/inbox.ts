import { requireAppActor } from "@/lib/app/auth";
import { logCrmAction } from "@/lib/app/audit";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

export async function markReplyHandled(replyEventId: string, notes?: string) {
  const actor = await requireAppActor();
  const supabase = createSupabaseServiceClient();
  const handledAt = new Date().toISOString();
  const { data, error } = await supabase
    .from("reply_events")
    .update({
      handled_at: handledAt,
      handled_by: actor.displayName,
      handled_by_user_id: actor.userId,
      handled_notes: notes ?? null,
      requires_human_review: false
    })
    .eq("id", replyEventId)
    .select("id,lead_id")
    .single();

  if (error) throw new Error(error.message);

  await logCrmAction({
    actor,
    actionType: "reply_handled",
    leadId: data.lead_id,
    replyEventId: data.id,
    detail: { handled_at: handledAt, notes: notes ?? null }
  });
}
