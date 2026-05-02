"use server";

import { revalidatePath } from "next/cache";
import { approveCrmLeadForOutreach, updateCrmLeadStatus } from "@/lib/app/leads";

export async function approveLeadForOutreach(leadId: string) {
  await approveCrmLeadForOutreach(leadId);
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
  await updateCrmLeadStatus(leadId, status);
}
