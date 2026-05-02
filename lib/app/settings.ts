import { requireAppActor } from "@/lib/app/auth";
import { logCrmAction } from "@/lib/app/audit";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

export async function setGlobalOutreachPaused(paused: boolean) {
  const actor = await requireAppActor();
  const supabase = createSupabaseServiceClient();
  const { error } = await supabase.from("app_settings").upsert(
    {
      key: "global_outreach",
      value: { paused }
    },
    { onConflict: "key" }
  );

  if (error) throw new Error(error.message);

  await logCrmAction({
    actor,
    actionType: "global_pause_toggled",
    detail: { paused }
  });
}

export async function updateInboxDailyLimit(inboxId: string, dailySendLimit: number) {
  if (!Number.isInteger(dailySendLimit) || dailySendLimit < 0) {
    throw new Error("Daily send limit must be a non-negative integer");
  }

  const actor = await requireAppActor();
  const supabase = createSupabaseServiceClient();
  const { error } = await supabase.from("inboxes").update({ daily_send_limit: dailySendLimit }).eq("id", inboxId);

  if (error) throw new Error(error.message);

  await logCrmAction({
    actor,
    actionType: "inbox_updated",
    detail: { inbox_id: inboxId, daily_send_limit: dailySendLimit }
  });
}
