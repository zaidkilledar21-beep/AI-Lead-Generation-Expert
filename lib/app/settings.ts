import { requireAppActor } from "@/lib/app/auth";
import { logCrmAction } from "@/lib/app/audit";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

export async function updateGlobalOutreachSettings({
  paused,
  dailyCap
}: Readonly<{
  paused: boolean;
  dailyCap?: number;
}>) {
  const actor = await requireAppActor();
  const supabase = createSupabaseServiceClient();
  const { data: current } = await supabase.from("app_settings").select("value").eq("key", "global_outreach").maybeSingle();
  const currentValue = (current?.value as Record<string, unknown> | null) ?? {};
  const nextValue: Record<string, unknown> = {
    ...currentValue,
    paused,
    updated_by: actor.displayName,
    updated_at: new Date().toISOString()
  };
  if (dailyCap !== undefined) {
    nextValue.daily_cap = dailyCap;
  }

  const { error } = await supabase.from("app_settings").upsert(
    {
      key: "global_outreach",
      value: nextValue
    },
    { onConflict: "key" }
  );

  if (error) throw new Error(error.message);

  await logCrmAction({
    actor,
    actionType: "global_pause_toggled",
    detail: { paused, daily_cap: nextValue.daily_cap ?? null }
  });
}

export async function setGlobalOutreachPaused(paused: boolean) {
  await updateGlobalOutreachSettings({ paused });
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
