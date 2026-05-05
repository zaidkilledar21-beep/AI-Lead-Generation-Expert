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

export async function updateGlobalOutreachSettingsAction(formData: FormData) {
  const actor = await requireAppActor();
  const supabase = createSupabaseServiceClient();
  const paused = cleanText(formData.get("paused")) === "true";
  const dailyCap = Number(formData.get("dailyCap"));
  if (!Number.isInteger(dailyCap) || dailyCap < 0) throw new Error("Daily cap must be a non-negative integer");

  const { error } = await supabase.from("app_settings").upsert(
    {
      key: "global_outreach",
      value: {
        paused,
        daily_cap: dailyCap,
        updated_by: actor.displayName,
        updated_at: new Date().toISOString()
      }
    },
    { onConflict: "key" }
  );
  if (error) throw new Error(error.message);

  revalidatePath("/settings");
  revalidatePath("/", "layout");
}

export async function createInboxAction(formData: FormData) {
  await requireAppActor();
  const emailAddress = cleanText(formData.get("emailAddress"));
  const provider = cleanText(formData.get("provider")) ?? "gmail";
  const dailySendLimit = Number(formData.get("dailySendLimit"));
  if (!emailAddress) throw new Error("Email address is required");
  if (!Number.isInteger(dailySendLimit) || dailySendLimit < 0) throw new Error("Daily send limit must be a non-negative integer");

  const supabase = createSupabaseServiceClient();
  const { error } = await supabase.from("inboxes").insert({
    email_address: emailAddress,
    provider,
    daily_send_limit: dailySendLimit,
    active: true,
    warmup_stage: cleanText(formData.get("warmupStage")) ?? "new"
  });
  if (error) throw new Error(error.message);

  revalidatePath("/settings/inboxes");
  revalidatePath("/", "layout");
}

export async function updateInboxActiveAction(formData: FormData) {
  await requireAppActor();
  const inboxId = cleanText(formData.get("inboxId"));
  const active = cleanText(formData.get("active")) === "true";
  if (!inboxId) throw new Error("inboxId is required");

  const supabase = createSupabaseServiceClient();
  const { error } = await supabase.from("inboxes").update({ active }).eq("id", inboxId);
  if (error) throw new Error(error.message);

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
  const draftApprovals = cleanText(formData.get("draftApprovals")) === "true";
  const sendFailures = cleanText(formData.get("sendFailures")) === "true";

  const { error } = await supabase.from("founder_profiles").upsert({
    user_id: actor.userId,
    display_name: displayName,
    email: actor.email,
    timezone,
    telegram_chat_id: telegramChatId,
    notification_preferences: {
      positive_replies: positiveReplies,
      review_backlog: reviewBacklog,
      weekly_report: weeklyReport,
      draft_approvals: draftApprovals,
      send_failures: sendFailures
    }
  });

  if (error) throw new Error(error.message);

  revalidatePath("/settings/account");
  revalidatePath("/settings/notifications");
  revalidatePath("/", "layout");
}

export async function sendTestNotificationAction() {
  await requireAppActor();
  revalidatePath("/settings/notifications");
}
