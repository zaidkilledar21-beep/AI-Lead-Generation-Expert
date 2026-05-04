import { createSupabaseDashboardClient } from "@/lib/supabase/dashboard";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { requireAppActor } from "@/lib/app/auth";
import { logCrmAction, type CrmActionType } from "@/lib/app/audit";

export type DashboardLeadStatus =
  | "queued"
  | "paused"
  | "unsubscribed"
  | "archived"
  | "review_pending"
  | "pending_approval"
  | "blocked"
  | "replied_interested"
  | "replied_not_interested"
  | "replied_needs_review"
  | "closed_won"
  | "closed_lost"
  | "not_interested";

async function createRequiredDashboardClient() {
  const supabase = await createSupabaseDashboardClient();
  if (!supabase) throw new Error("Dashboard Supabase client is not configured");
  return supabase;
}

export async function approveCrmLeadForOutreach(leadId: string) {
  const actor = await requireAppActor();
  const supabase = await createRequiredDashboardClient();
  const { error } = await supabase.rpc("dashboard_approve_lead_for_outreach", { target_lead_id: leadId });

  if (error) throw new Error(error.message);

  const serviceClient = createSupabaseServiceClient();
  await serviceClient
    .from("leads")
    .update({
      approved_for_outreach: true,
      approved_by: actor.displayName,
      approved_at: new Date().toISOString()
    })
    .eq("id", leadId);

  await logCrmAction({
    actor,
    actionType: "approved_for_outreach",
    leadId
  });
}

export async function updateCrmLeadStatus(leadId: string, status: DashboardLeadStatus) {
  const actor = await requireAppActor();
  const supabase = await createRequiredDashboardClient();
  const { error } = await supabase.rpc("dashboard_update_lead_status", {
    target_lead_id: leadId,
    next_status: status
  });

  if (error) throw new Error(error.message);

  const actionTypeByStatus: Partial<Record<DashboardLeadStatus, CrmActionType>> = {
    paused: "paused_sequence",
    unsubscribed: "marked_unsubscribed",
    archived: "archived",
    closed_won: "marked_closed_won",
    closed_lost: "marked_closed_lost"
  };

  await logCrmAction({
    actor,
    actionType: actionTypeByStatus[status] ?? "inbox_updated",
    leadId,
    detail: { status }
  });
}

export async function saveCrmLeadNote(leadId: string, notes: string) {
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

  await logCrmAction({
    actor,
    actionType: "note_added",
    leadId
  });
}

export async function assignCrmLead(leadId: string, assignedTo: string | null) {
  const actor = await requireAppActor();
  const supabase = createSupabaseServiceClient();
  const { error } = await supabase.from("leads").update({ assigned_to: assignedTo }).eq("id", leadId);

  if (error) throw new Error(error.message);

  await logCrmAction({
    actor,
    actionType: "assigned_to_founder",
    leadId,
    detail: { assigned_to: assignedTo }
  });
}

export async function overrideCrmLeadBand(leadId: string, band: "A" | "B" | "C" | "D", reason: string) {
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

  await logCrmAction({
    actor,
    actionType: "band_overridden",
    leadId,
    detail: { band, reason }
  });
}
