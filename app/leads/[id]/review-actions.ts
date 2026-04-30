"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseDashboardClient } from "@/lib/supabase/dashboard";

export async function approveLeadForOutreach(leadId: string) {
  const supabase = createRequiredDashboardClient();
  const { error } = await supabase.rpc("dashboard_approve_lead_for_outreach", { target_lead_id: leadId });
  if (error) throw new Error(error.message);
  revalidatePath("/");
  revalidatePath(`/leads/${leadId}`);
}

export async function pauseLead(leadId: string) {
  await updateLeadStatusViaRpc(leadId, "paused");
  revalidatePath("/");
  revalidatePath(`/leads/${leadId}`);
}

export async function unsubscribeLead(leadId: string) {
  await updateLeadStatusViaRpc(leadId, "unsubscribed");
  revalidatePath("/");
  revalidatePath(`/leads/${leadId}`);
}

export async function archiveLead(leadId: string) {
  await updateLeadStatusViaRpc(leadId, "archived");
  revalidatePath("/");
  revalidatePath(`/leads/${leadId}`);
}

async function updateLeadStatusViaRpc(leadId: string, status: "paused" | "unsubscribed" | "archived") {
  const supabase = createRequiredDashboardClient();
  const { error } = await supabase.rpc("dashboard_update_lead_status", {
    target_lead_id: leadId,
    next_status: status
  });

  if (error) throw new Error(error.message);
}

function createRequiredDashboardClient() {
  const supabase = createSupabaseDashboardClient();
  if (!supabase) throw new Error("Dashboard Supabase client is not configured");
  return supabase;
}
