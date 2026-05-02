import { createSupabaseDashboardClient } from "@/lib/supabase/dashboard";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { requireAppActor } from "@/lib/app/auth";
import { logCrmAction, type CrmActionType } from "@/lib/app/audit";

type LeadStatus = "paused" | "unsubscribed" | "archived";

function createRequiredDashboardClient() {
  const supabase = createSupabaseDashboardClient();
  if (!supabase) throw new Error("Dashboard Supabase client is not configured");
  return supabase;
}

export async function approveCrmLeadForOutreach(leadId: string) {
  const actor = await requireAppActor();
  const supabase = createRequiredDashboardClient();
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

export async function updateCrmLeadStatus(leadId: string, status: LeadStatus) {
  const actor = await requireAppActor();
  const supabase = createRequiredDashboardClient();
  const { error } = await supabase.rpc("dashboard_update_lead_status", {
    target_lead_id: leadId,
    next_status: status
  });

  if (error) throw new Error(error.message);

  const actionTypeByStatus: Record<LeadStatus, CrmActionType> = {
    paused: "paused_sequence",
    unsubscribed: "marked_unsubscribed",
    archived: "archived"
  };

  await logCrmAction({
    actor,
    actionType: actionTypeByStatus[status],
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
