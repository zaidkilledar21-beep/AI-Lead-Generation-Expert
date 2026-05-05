import { createSupabaseServiceClient } from "@/lib/supabase/server";
import type { AppActor } from "@/lib/app/auth";

export type CrmActionType =
  | "approved_for_outreach"
  | "rejected"
  | "archived"
  | "paused_sequence"
  | "resumed_sequence"
  | "marked_closed_won"
  | "marked_closed_lost"
  | "marked_unsubscribed"
  | "reply_handled"
  | "band_overridden"
  | "note_added"
  | "email_draft_approved"
  | "email_draft_edited"
  | "email_draft_regeneration_requested"
  | "email_draft_rejected"
  | "manual_review_completed"
  | "campaign_created"
  | "campaign_updated"
  | "campaign_launched"
  | "campaign_paused"
  | "campaign_resumed"
  | "campaign_archived"
  | "inbox_updated"
  | "global_pause_toggled"
  | "global_pause_enabled"
  | "global_pause_disabled"
  | "bulk_approved"
  | "bulk_status_change"
  | "assigned_to_founder";

type LogCrmActionInput = {
  actor: AppActor;
  actionType: CrmActionType;
  leadId?: string | null;
  campaignId?: string | null;
  replyEventId?: string | null;
  manualReviewId?: string | null;
  detail?: Record<string, unknown>;
};

export async function logCrmAction(input: LogCrmActionInput) {
  const supabase = createSupabaseServiceClient();
  const { error } = await supabase.from("crm_action_log").insert({
    lead_id: input.leadId ?? null,
    campaign_id: input.campaignId ?? null,
    reply_event_id: input.replyEventId ?? null,
    manual_review_id: input.manualReviewId ?? null,
    action_type: input.actionType,
    action_detail: input.detail ?? {},
    performed_by: input.actor.displayName,
    performed_by_user_id: input.actor.userId
  });

  if (error) throw new Error(`CRM action log failed: ${error.message}`);
}
