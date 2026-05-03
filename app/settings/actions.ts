"use server";

import { revalidatePath } from "next/cache";
import { setGlobalOutreachPaused, updateInboxDailyLimit } from "@/lib/app/settings";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { requireAppActor } from "@/lib/app/auth";

function cleanText(value: FormDataEntryValue | null) {
  const text = typeof value === "string" ? value.trim() : "";
  return text.length > 0 ? text : null;
}

export async function toggleGlobalPauseAction(formData: FormData) {
  const paused = cleanText(formData.get("paused")) === "true";
  await setGlobalOutreachPaused(paused);
  revalidatePath("/", "layout");
}

export async function updateInboxDailyLimitAction(formData: FormData) {
  const inboxId = cleanText(formData.get("inboxId"));
  const dailySendLimit = Number(formData.get("dailySendLimit"));
  if (!inboxId) throw new Error("inboxId is required");
  await updateInboxDailyLimit(inboxId, dailySendLimit);
  revalidatePath("/settings/inboxes");
  revalidatePath("/", "layout");
}

export async function updateFounderProfileAction(formData: FormData) {
  const actor = await requireAppActor();
  const supabase = createSupabaseServiceClient();
  const displayName = cleanText(formData.get("displayName")) ?? actor.displayName;
  const timezone = cleanText(formData.get("timezone")) ?? "UTC";
  const telegramChatId = cleanText(formData.get("telegramChatId"));
  const positiveReplies = cleanText(formData.get("positiveReplies")) === "true";
  const reviewBacklog = cleanText(formData.get("reviewBacklog")) === "true";
  const weeklyReport = cleanText(formData.get("weeklyReport")) === "true";

  const { error } = await supabase.from("founder_profiles").upsert({
    user_id: actor.userId,
    display_name: displayName,
    email: actor.email,
    timezone,
    telegram_chat_id: telegramChatId,
    notification_preferences: {
      positive_replies: positiveReplies,
      review_backlog: reviewBacklog,
      weekly_report: weeklyReport
    }
  });

  if (error) throw new Error(error.message);

  revalidatePath("/settings/account");
  revalidatePath("/settings/notifications");
  revalidatePath("/", "layout");
}
