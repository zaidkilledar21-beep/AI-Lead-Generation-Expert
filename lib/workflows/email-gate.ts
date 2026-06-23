import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { isValidBusinessEmail } from "@/lib/workflows/contact-extraction";

const PRESERVED_LEAD_STATUSES = new Set([
  "replied",
  "replied_interested",
  "replied_not_interested",
  "replied_needs_review",
  "closed_won",
  "closed_lost",
  "unsubscribed",
  "bounced",
  "not_interested"
]);

export async function rejectLeadWithoutUsableEmail(leadId: string) {
  const supabase = createSupabaseServiceClient();
  const { data: lead, error: leadError } = await supabase
    .from("leads")
    .select("id,email,campaign_id,discovery_run_id,candidate_id,status")
    .eq("id", leadId)
    .maybeSingle();

  if (leadError) throw new Error(leadError.message);
  if (!lead) throw new Error("Lead not found");
  if (isValidBusinessEmail(lead.email)) return false;
  if (PRESERVED_LEAD_STATUSES.has(lead.status ?? "")) return false;

  const now = new Date().toISOString();
  await Promise.all([
    supabase
      .from("leads")
      .update({
        email: null,
        status: "archived",
        closed_at: now,
        closed_by: "system:missing_email_gate",
        last_activity_at: now
      })
      .eq("id", leadId),
    supabase
      .from("outreach_queue")
      .update({ status: "blocked", pause_reason: "missing_email", updated_at: now })
      .eq("lead_id", leadId),
    supabase
      .from("manual_review_queue")
      .update({
        review_status: "rejected",
        review_notes: "Automatically rejected because no usable business email was found.",
        completed_at: now,
        completed_by: "system:missing_email_gate"
      })
      .eq("lead_id", leadId)
      .eq("review_status", "pending")
  ]);

  await supabase.from("workflow_events").insert({
    workflow_name: "Email Qualification Gate",
    lead_id: leadId,
    campaign_id: lead.campaign_id ?? null,
    discovery_run_id: lead.discovery_run_id ?? null,
    candidate_id: lead.candidate_id ?? null,
    event_type: "lead_rejected_missing_email",
    status: "completed",
    payload: { previous_status: lead.status, reason: "missing_valid_email" }
  });

  return true;
}
