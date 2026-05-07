"use server";

import { revalidatePath } from "next/cache";
import { setGlobalOutreachPaused, updateGlobalOutreachSettings, updateInboxDailyLimit } from "@/lib/app/settings";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { requireAppActor, requireDashboardWriteAccess } from "@/lib/app/auth";
import { logCrmAction } from "@/lib/app/audit";
import { isValidEmailAddress } from "@/lib/text-validation";

const maxDailySendLimit = 500;
const inboxWarmupStages = ["new", "warming", "ready", "paused", "week_1", "week_2", "week_3", "mature"] as const;
const inboxProviders = ["gmail", "google_workspace", "outlook", "smtp"] as const;

function cleanText(value: FormDataEntryValue | null) {
  const text = typeof value === "string" ? value.trim() : "";
  return text.length > 0 ? text : null;
}

function readBoolean(formData: FormData, name: string) {
  const value = cleanText(formData.get(name));
  return value === "true" || value === "on";
}

function readInteger(formData: FormData, name: string) {
  const parsed = Number(formData.get(name));
  return Number.isInteger(parsed) ? parsed : null;
}

function cleanEmail(formData: FormData, name: string) {
  const value = cleanText(formData.get(name));
  if (!value) return null;
  if (!isValidEmailAddress(value)) throw new Error(`${name} must be a valid email address`);
  return value.toLowerCase();
}

function assertAllowed(value: string | null, allowed: readonly string[], label: string) {
  if (!value || !allowed.includes(value)) throw new Error(`${label} is not supported`);
  return value;
}

function readSafeDailyLimit(formData: FormData) {
  const dailySendLimit = readInteger(formData, "dailySendLimit");
  if (dailySendLimit == null || dailySendLimit < 0 || dailySendLimit > maxDailySendLimit) {
    throw new Error(`Daily send limit must be a non-negative integer no greater than ${maxDailySendLimit}`);
  }
  return dailySendLimit;
}

function assertSequenceBand(value: string | null): asserts value is "A" | "B" | "C" {
  if (value !== "A" && value !== "B" && value !== "C") {
    throw new Error("Sequence band must be A, B, or C");
  }
}

async function sequenceHasActiveSteps(supabase: ReturnType<typeof createSupabaseServiceClient>, sequenceId: string) {
  const { count, error } = await supabase
    .from("outreach_steps")
    .select("id", { count: "exact", head: true })
    .eq("sequence_id", sequenceId)
    .eq("active", true)
    .eq("archived", false);
  if (error) throw new Error(error.message);
  return (count ?? 0) > 0;
}

async function getActiveAssignedCampaignIds(supabase: ReturnType<typeof createSupabaseServiceClient>, sequenceId: string) {
  const { data, error } = await supabase
    .from("campaigns")
    .select("id")
    .eq("status", "active")
    .or(`sequence_band_a.eq.${sequenceId},sequence_band_b.eq.${sequenceId},sequence_band_c.eq.${sequenceId}`);
  if (error) throw new Error(error.message);
  return (data ?? []).map((campaign) => campaign.id as string);
}

function revalidateSequenceSettings(campaignIds: string[] = []) {
  revalidatePath("/settings/sequences");
  if (campaignIds.length > 0) {
    revalidatePath("/campaigns");
    for (const campaignId of campaignIds) {
      revalidatePath(`/campaigns/${campaignId}`);
    }
  }
}

function sequenceInput(formData: FormData) {
  const name = cleanText(formData.get("name"));
  const description = cleanText(formData.get("description"));
  const band = cleanText(formData.get("band"))?.toUpperCase() ?? null;
  assertSequenceBand(band);
  if (!name) throw new Error("Sequence name is required");

  return {
    name,
    description,
    band,
    active: readBoolean(formData, "active") && !readBoolean(formData, "archived"),
    archived: readBoolean(formData, "archived")
  };
}

function sequenceStepInput(formData: FormData) {
  const sequenceId = cleanText(formData.get("sequence_id"));
  const stepNumber = readInteger(formData, "step_number");
  const delayDays = readInteger(formData, "delay_days");
  const templateType = cleanText(formData.get("template_type"));
  const promptGuidance = cleanText(formData.get("prompt_guidance"));
  const active = readBoolean(formData, "active");

  if (!sequenceId) throw new Error("sequence_id is required");
  if (!stepNumber || stepNumber < 1) throw new Error("Step number must be a positive integer");
  if (delayDays == null || delayDays < 0) throw new Error("Delay days must be a non-negative integer");
  if (active && !templateType && !promptGuidance) {
    throw new Error("Active steps require a template type or prompt guidance");
  }

  return {
    sequence_id: sequenceId,
    step_number: stepNumber,
    delay_days: delayDays,
    template_type: templateType,
    prompt_guidance: promptGuidance,
    active
  };
}

export async function toggleGlobalPauseAction(formData: FormData) {
  const paused = cleanText(formData.get("paused")) === "true";
  await setGlobalOutreachPaused(paused);
  revalidatePath("/", "layout");
}

export async function updateInboxDailyLimitAction(formData: FormData) {
  const inboxId = cleanText(formData.get("inboxId"));
  const dailySendLimit = readSafeDailyLimit(formData);
  if (!inboxId) throw new Error("inboxId is required");
  await updateInboxDailyLimit(inboxId, dailySendLimit);
  revalidatePath("/settings/inboxes");
  revalidatePath("/", "layout");
}

export async function updateGlobalOutreachSettingsAction(formData: FormData) {
  const paused = cleanText(formData.get("paused")) === "true";
  const dailyCap = Number(formData.get("dailyCap"));
  if (!Number.isInteger(dailyCap) || dailyCap < 0) throw new Error("Daily cap must be a non-negative integer");
  await updateGlobalOutreachSettings({ paused, dailyCap });

  revalidatePath("/settings");
  revalidatePath("/", "layout");
}

export async function createInboxAction(formData: FormData) {
  const actor = await requireDashboardWriteAccess();
  const emailAddress = cleanEmail(formData, "emailAddress");
  const provider = assertAllowed(cleanText(formData.get("provider")) ?? "gmail", inboxProviders, "Provider");
  const dailySendLimit = readSafeDailyLimit(formData);
  const warmupStage = assertAllowed(cleanText(formData.get("warmupStage")) ?? "new", inboxWarmupStages, "Warmup stage");
  const displayLabel = cleanText(formData.get("displayLabel"));
  if (!emailAddress) throw new Error("Email address is required");

  const supabase = createSupabaseServiceClient();
  const { error } = await supabase.from("inboxes").insert({
    email_address: emailAddress,
    provider,
    daily_send_limit: dailySendLimit,
    active: true,
    warmup_stage: warmupStage,
    display_label: displayLabel
  });
  if (error) throw new Error(error.message);

  await logCrmAction({ actor, actionType: "inbox_updated", detail: { event: "inbox_created", email_address: emailAddress, provider, daily_send_limit: dailySendLimit, warmup_stage: warmupStage } });
  revalidatePath("/settings/inboxes");
  revalidatePath("/", "layout");
}

export async function updateInboxActiveAction(formData: FormData) {
  const actor = await requireDashboardWriteAccess();
  const inboxId = cleanText(formData.get("inboxId"));
  const active = cleanText(formData.get("active")) === "true";
  if (!inboxId) throw new Error("inboxId is required");

  const supabase = createSupabaseServiceClient();
  const { error } = await supabase.from("inboxes").update({ active }).eq("id", inboxId);
  if (error) throw new Error(error.message);

  await logCrmAction({ actor, actionType: "inbox_updated", detail: { inbox_id: inboxId, active } });
  revalidatePath("/settings");
  revalidatePath("/settings/inboxes");
  revalidatePath("/", "layout");
}

export async function updateInboxAction(formData: FormData) {
  const actor = await requireDashboardWriteAccess();
  const inboxId = cleanText(formData.get("inboxId"));
  if (!inboxId) throw new Error("inboxId is required");

  const input = {
    display_label: cleanText(formData.get("displayLabel")),
    provider: assertAllowed(cleanText(formData.get("provider")) ?? "gmail", inboxProviders, "Provider"),
    daily_send_limit: readSafeDailyLimit(formData),
    warmup_stage: assertAllowed(cleanText(formData.get("warmupStage")) ?? "new", inboxWarmupStages, "Warmup stage"),
    active: readBoolean(formData, "active")
  };

  const supabase = createSupabaseServiceClient();
  const { error } = await supabase.from("inboxes").update(input).eq("id", inboxId).eq("archived", false);
  if (error) throw new Error(error.message);

  await logCrmAction({ actor, actionType: "inbox_updated", detail: { inbox_id: inboxId, ...input } });
  revalidatePath("/settings");
  revalidatePath("/settings/inboxes");
  revalidatePath("/", "layout");
}

export async function archiveInboxAction(formData: FormData) {
  const actor = await requireDashboardWriteAccess();
  const inboxId = cleanText(formData.get("inboxId"));
  const confirmed = readBoolean(formData, "confirmAssignedArchive");
  if (!inboxId) throw new Error("inboxId is required");

  const supabase = createSupabaseServiceClient();
  const { count, error: dependencyError } = await supabase
    .from("campaigns")
    .select("id", { count: "exact", head: true })
    .eq("assigned_inbox_id", inboxId)
    .eq("status", "active");
  if (dependencyError) throw new Error(dependencyError.message);
  const activeCampaignCount = count ?? 0;
  if (activeCampaignCount > 0 && !confirmed) {
    throw new Error("This inbox is assigned to active campaigns. Archiving it may prevent future sends for those campaigns.");
  }

  const { error } = await supabase
    .from("inboxes")
    .update({ active: false, archived: true })
    .eq("id", inboxId);
  if (error) throw new Error(error.message);

  await logCrmAction({ actor, actionType: "inbox_archived", detail: { inbox_id: inboxId, active_campaign_dependencies: activeCampaignCount } });
  revalidatePath("/settings");
  revalidatePath("/settings/inboxes");
  revalidatePath("/", "layout");
}

export async function updateNotificationSettingsAction(formData: FormData) {
  const actor = await requireDashboardWriteAccess();
  const input = {
    enabled: readBoolean(formData, "enabled"),
    founder_notification_email: cleanEmail(formData, "founderNotificationEmail"),
    reply_alert_recipient: cleanEmail(formData, "replyAlertRecipient"),
    weekly_report_recipient: cleanEmail(formData, "weeklyReportRecipient")
  };

  const supabase = createSupabaseServiceClient();
  const { error } = await supabase.from("app_settings").upsert(
    {
      key: "notification_settings",
      value: {
        ...input,
        updated_by: actor.displayName,
        updated_at: new Date().toISOString()
      }
    },
    { onConflict: "key" }
  );
  if (error) throw new Error(error.message);

  await logCrmAction({ actor, actionType: "notification_settings_updated", detail: { enabled: input.enabled, has_founder_email: Boolean(input.founder_notification_email), has_reply_alert_recipient: Boolean(input.reply_alert_recipient), has_weekly_report_recipient: Boolean(input.weekly_report_recipient) } });
  revalidatePath("/settings");
  revalidatePath("/settings/notifications");
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
  const actor = await requireDashboardWriteAccess();
  const supabase = createSupabaseServiceClient();
  const requestedAt = new Date().toISOString();
  const { data: notificationSettings } = await supabase.from("app_settings").select("value").eq("key", "notification_settings").maybeSingle();
  const value = (notificationSettings?.value as Record<string, unknown> | null) ?? {};
  const recipient = typeof value.founder_notification_email === "string" ? value.founder_notification_email : actor.email;
  if (value.enabled === false) throw new Error("Notifications are disabled.");
  if (!recipient) throw new Error("Configure a founder notification email before sending a test notification.");

  const payload = {
    kind: "test_notification",
    message: "Test notification requested from CRM settings",
    requested_by: actor.displayName ?? actor.userId,
    requested_at: requestedAt
  };

  const { error } = await supabase.from("notification_events").insert({
    event_type: "test_notification",
    channel: "email",
    recipient,
    payload,
    status: "queued"
  });
  if (error) {
    await logCrmAction({ actor, actionType: "test_notification_failed", detail: { error: error.message } });
    throw new Error(error.message);
  }

  const { error: workflowError } = await supabase.from("workflow_events").insert({
    workflow_name: "WF-08 Weekly Report",
    event_type: "test_notification_queued",
    status: "started",
    payload
  });
  if (workflowError) throw new Error(workflowError.message);

  await logCrmAction({ actor, actionType: "test_notification_sent", detail: { status: "queued", channel: "email", has_recipient: Boolean(recipient) } });
  revalidatePath("/settings/notifications");
}

export async function createSequenceAction(formData: FormData) {
  const actor = await requireDashboardWriteAccess();
  const input = sequenceInput(formData);
  if (input.active) {
    throw new Error("Create the sequence first, add at least one active step, then activate it.");
  }

  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from("outreach_sequences")
    .insert(input)
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  await logCrmAction({
    actor,
    actionType: "sequence_created",
    detail: { sequence_id: data.id, name: input.name, band: input.band, active: input.active }
  });

  revalidateSequenceSettings();
  return data.id as string;
}

export async function updateSequenceAction(formData: FormData) {
  const actor = await requireDashboardWriteAccess();
  const sequenceId = cleanText(formData.get("sequence_id"));
  if (!sequenceId) throw new Error("sequence_id is required");
  const input = sequenceInput(formData);

  const supabase = createSupabaseServiceClient();
  const campaignIds = await getActiveAssignedCampaignIds(supabase, sequenceId);
  if (input.archived && campaignIds.length > 0 && !readBoolean(formData, "confirmAssignedArchive")) {
    throw new Error("This sequence is assigned to active campaigns. Archiving it may prevent draft generation for those campaigns.");
  }

  if (input.active && !(await sequenceHasActiveSteps(supabase, sequenceId))) {
    throw new Error("Sequence cannot be active with zero active steps.");
  }

  const { error } = await supabase
    .from("outreach_sequences")
    .update(input)
    .eq("id", sequenceId);
  if (error) throw new Error(error.message);

  await logCrmAction({
    actor,
    actionType: "sequence_updated",
    detail: { sequence_id: sequenceId, ...input, active_campaign_dependencies: campaignIds.length }
  });

  revalidateSequenceSettings(campaignIds);
}

export async function archiveSequenceAction(formData: FormData) {
  const actor = await requireDashboardWriteAccess();
  const sequenceId = cleanText(formData.get("sequence_id"));
  const confirmed = readBoolean(formData, "confirmAssignedArchive");
  if (!sequenceId) throw new Error("sequence_id is required");

  const supabase = createSupabaseServiceClient();
  const campaignIds = await getActiveAssignedCampaignIds(supabase, sequenceId);
  if (campaignIds.length > 0 && !confirmed) {
    throw new Error("This sequence is assigned to active campaigns. Archiving it may prevent draft generation for those campaigns.");
  }

  const { error } = await supabase
    .from("outreach_sequences")
    .update({ active: false, archived: true })
    .eq("id", sequenceId);
  if (error) throw new Error(error.message);

  await logCrmAction({
    actor,
    actionType: "sequence_archived",
    detail: { sequence_id: sequenceId, active_campaign_dependencies: campaignIds.length }
  });

  revalidateSequenceSettings(campaignIds);
}

export async function createSequenceStepAction(formData: FormData) {
  const actor = await requireDashboardWriteAccess();
  const input = sequenceStepInput(formData);
  const supabase = createSupabaseServiceClient();

  const { data: existing, error: existingError } = await supabase
    .from("outreach_steps")
    .select("id")
    .eq("sequence_id", input.sequence_id)
    .eq("step_number", input.step_number)
    .maybeSingle();
  if (existingError) throw new Error(existingError.message);
  if (existing) throw new Error("Step number must be unique per sequence.");

  const { data, error } = await supabase
    .from("outreach_steps")
    .insert(input)
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  await logCrmAction({
    actor,
    actionType: "sequence_step_created",
    detail: { step_id: data.id, ...input }
  });

  revalidateSequenceSettings(await getActiveAssignedCampaignIds(supabase, input.sequence_id));
  return data.id as string;
}

export async function updateSequenceStepAction(formData: FormData) {
  const actor = await requireDashboardWriteAccess();
  const stepId = cleanText(formData.get("step_id"));
  if (!stepId) throw new Error("step_id is required");
  const input = sequenceStepInput(formData);
  const supabase = createSupabaseServiceClient();

  const { data: duplicate, error: duplicateError } = await supabase
    .from("outreach_steps")
    .select("id")
    .eq("sequence_id", input.sequence_id)
    .eq("step_number", input.step_number)
    .neq("id", stepId)
    .maybeSingle();
  if (duplicateError) throw new Error(duplicateError.message);
  if (duplicate) throw new Error("Step number must be unique per sequence.");

  if (!input.active) {
    const { data: sequence, error: sequenceError } = await supabase
      .from("outreach_sequences")
      .select("active")
      .eq("id", input.sequence_id)
      .maybeSingle();
    if (sequenceError) throw new Error(sequenceError.message);
    if (sequence?.active) {
      const { count, error: countError } = await supabase
        .from("outreach_steps")
        .select("id", { count: "exact", head: true })
        .eq("sequence_id", input.sequence_id)
        .eq("active", true)
        .eq("archived", false)
        .neq("id", stepId);
      if (countError) throw new Error(countError.message);
      if ((count ?? 0) === 0) throw new Error("Active sequence must keep at least one active step.");
    }
  }

  const { error } = await supabase
    .from("outreach_steps")
    .update(input)
    .eq("id", stepId);
  if (error) throw new Error(error.message);

  await logCrmAction({
    actor,
    actionType: "sequence_step_updated",
    detail: { step_id: stepId, ...input }
  });

  revalidateSequenceSettings(await getActiveAssignedCampaignIds(supabase, input.sequence_id));
}

export async function archiveSequenceStepAction(formData: FormData) {
  const actor = await requireDashboardWriteAccess();
  const stepId = cleanText(formData.get("step_id"));
  const sequenceId = cleanText(formData.get("sequence_id"));
  if (!stepId) throw new Error("step_id is required");
  if (!sequenceId) throw new Error("sequence_id is required");

  const supabase = createSupabaseServiceClient();
  const { data: sequence, error: sequenceError } = await supabase
    .from("outreach_sequences")
    .select("active")
    .eq("id", sequenceId)
    .maybeSingle();
  if (sequenceError) throw new Error(sequenceError.message);

  if (sequence?.active) {
    const { count, error: countError } = await supabase
      .from("outreach_steps")
      .select("id", { count: "exact", head: true })
      .eq("sequence_id", sequenceId)
      .eq("active", true)
      .eq("archived", false)
      .neq("id", stepId);
    if (countError) throw new Error(countError.message);
    if ((count ?? 0) === 0) throw new Error("Active sequence must keep at least one active step.");
  }

  const { error } = await supabase
    .from("outreach_steps")
    .update({ active: false, archived: true })
    .eq("id", stepId);
  if (error) throw new Error(error.message);

  await logCrmAction({
    actor,
    actionType: "sequence_step_archived",
    detail: { step_id: stepId, sequence_id: sequenceId }
  });

  revalidateSequenceSettings(await getActiveAssignedCampaignIds(supabase, sequenceId));
}
