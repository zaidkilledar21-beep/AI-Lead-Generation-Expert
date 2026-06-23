import { createSupabaseServiceClient } from "@/lib/supabase/server";
import type { EnrichLeadOutput } from "@/lib/contracts";
import { isValidBusinessEmail, normalizePhone, selectBestBusinessEmail } from "@/lib/workflows/contact-extraction";
import { rejectLeadWithoutUsableEmail } from "@/lib/workflows/email-gate";
import { crawlBusinessWebsite, extractWebsiteSignals } from "@/lib/workflows/website-crawler";

type CandidateSourceAttribution = {
  website_crawl_signals?: {
    booking_link_found?: boolean;
    contact_form_found?: boolean;
    whatsapp_found?: boolean;
    chat_widget_found?: boolean;
    email_confidence?: "high" | "medium" | "low" | "none";
    email_reason?: string;
    raw_scrape_summary?: string;
  };
};

type CandidatePayload = {
  email?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
};

function hasAny(text: string, terms: string[]) {
  const lower = text.toLowerCase();
  return terms.some((term) => lower.includes(term));
}

export async function enrichLead(leadId: string): Promise<EnrichLeadOutput> {
  const supabase = createSupabaseServiceClient();
  const { data: lead, error } = await supabase.from("leads").select("*").eq("id", leadId).maybeSingle();

  if (error) throw new Error(error.message);
  if (!lead) throw new Error("Lead not found");
  const { data: completedEnrichment, error: completedEnrichmentError } = await supabase
    .from("lead_enrichment")
    .select("enrichment_confidence,email_found")
    .eq("lead_id", leadId)
    .eq("status", "completed")
    .order("last_enriched_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (completedEnrichmentError) throw new Error(completedEnrichmentError.message);
  if (completedEnrichment) {
    return {
      lead_id: leadId,
      status: "completed",
      enrichment_confidence: completedEnrichment.enrichment_confidence ?? "low",
      email_found: completedEnrichment.email_found ?? undefined,
      workflow_signals: []
    };
  }

  const existingLeadEmail = isValidBusinessEmail(lead.email) ? lead.email : null;
  if (!lead.website) {
    await logEnrichmentFailure(leadId, "Lead has no website");
    return {
      lead_id: leadId,
      status: "failed",
      enrichment_confidence: "low",
      workflow_signals: []
    };
  }

  const { data: candidate } = lead.candidate_id
    ? await supabase
        .from("lead_candidates")
        .select("website_crawl_status,website_crawl_summary,source_attribution,normalized_payload")
        .eq("id", lead.candidate_id)
        .maybeSingle()
    : { data: null };

  if (candidate?.website_crawl_status === "success" && candidate.website_crawl_summary) {
    const sourceAttribution = candidate.source_attribution as CandidateSourceAttribution | null;
    const crawlSignals = sourceAttribution?.website_crawl_signals;
    const normalizedPayload = candidate.normalized_payload as CandidatePayload | null;
    const candidateEmail = isValidBusinessEmail(normalizedPayload?.email) ? normalizedPayload?.email ?? null : null;
    const candidatePhone = normalizePhone(normalizedPayload?.phone);
    const record = {
      lead_id: leadId,
      services_offered: [],
      social_links: [],
      detected_tools: [],
      booking_link_found: crawlSignals?.booking_link_found ?? false,
      contact_form_found: crawlSignals?.contact_form_found ?? false,
      email_found: candidateEmail,
      phone_found: candidatePhone,
      whatsapp_found: crawlSignals?.whatsapp_found ? "visible" : null,
      chat_widget_found: crawlSignals?.chat_widget_found ?? false,
      raw_scrape_summary: candidate.website_crawl_summary,
      enrichment_confidence: "medium",
      status: "completed"
    };

    const { error: insertError } = await supabase.from("lead_enrichment").insert(record);
    if (insertError) throw new Error(insertError.message);

    await supabase
      .from("leads")
      .update({
        status: "enriched",
        email: existingLeadEmail ?? candidateEmail,
        phone: lead.phone ?? candidatePhone,
        whatsapp: lead.whatsapp ?? normalizedPayload?.whatsapp ?? record.whatsapp_found
      })
      .eq("id", leadId);

    await logEnrichmentEvent(lead, "completed", {
      reused_candidate_crawl: true,
      confidence: "medium",
      signals: crawlSignals ?? {},
      ignored_candidate_email: normalizedPayload?.email && !candidateEmail ? "invalid_email" : null
    });

    return {
      lead_id: leadId,
      status: "completed",
      enrichment_confidence: "medium",
      workflow_signals: [crawlSignals?.raw_scrape_summary ?? candidate.website_crawl_summary]
    };
  }

  const crawl = await crawlBusinessWebsite(lead.website);
  if (crawl.status !== "success") {
    await logEnrichmentFailure(leadId, crawl.error ?? crawl.summary);
    return {
      lead_id: leadId,
      status: "failed",
      enrichment_confidence: "low",
      workflow_signals: []
    };
  }

  const pages = crawl.pages;
  const combined = pages.map((page) => page.html).join("\n");
  const signals = extractWebsiteSignals(pages);
  const selectedEmail = selectBestBusinessEmail(signals.emails, lead.website);
  const phones = signals.phones;
  const workflowSignals = [
    signals.whatsapp_found ? "whatsapp visible" : null,
    signals.booking_link_found ? "booking signal visible" : null,
    signals.contact_form_found ? "contact form visible" : null,
    hasAny(combined, ["faq", "frequently asked"]) ? "faq/support workload visible" : null
  ].filter(Boolean) as string[];

  const record = {
    lead_id: leadId,
    website_title: pages[0]?.html.match(/<title[^>]*>(.*?)<\/title>/is)?.[1]?.trim() ?? null,
    website_description: pages[0]?.html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)/i)?.[1] ?? null,
    services_offered: [],
    contact_page_url: pages.find((page) => page.url !== lead.website)?.url ?? null,
    booking_link_found: signals.booking_link_found,
    contact_form_found: signals.contact_form_found,
    email_found: selectedEmail.email,
    phone_found: phones[0] ?? null,
    whatsapp_found: signals.whatsapp_found ? "visible" : null,
    social_links: [],
    team_page_found: hasAny(combined, ["team", "our people", "staff"]),
    pricing_page_found: hasAny(combined, ["pricing", "prices", "plans"]),
    faq_page_found: hasAny(combined, ["faq", "frequently asked"]),
    chat_widget_found: signals.chat_widget_found,
    calendar_tool_found: hasAny(combined, ["calendly", "acuity", "calendar"]),
    detected_tools: [],
    raw_scrape_summary: workflowSignals.join("; "),
    enrichment_confidence: pages.length > 1 || selectedEmail.email || phones.length ? "medium" : "low",
    status: "completed"
  };

  const { error: insertError } = await supabase.from("lead_enrichment").insert(record);
  if (insertError) throw new Error(insertError.message);

  await supabase
    .from("leads")
    .update({
      status: "enriched",
      email: existingLeadEmail ?? selectedEmail.email,
      phone: lead.phone ?? normalizePhone(phones[0]),
      whatsapp: lead.whatsapp ?? record.whatsapp_found
    })
    .eq("id", leadId);

  await logEnrichmentEvent(lead, "completed", {
    reused_candidate_crawl: false,
    confidence: record.enrichment_confidence,
    pages_crawled: pages.length,
    email_confidence: selectedEmail.confidence,
    email_reason: selectedEmail.reason,
    workflow_signals: workflowSignals
  });

  return {
    lead_id: leadId,
    status: "completed",
    enrichment_confidence: record.enrichment_confidence as "low" | "medium" | "high",
    email_found: selectedEmail.email ?? undefined,
    workflow_signals: workflowSignals
  };
}

async function logEnrichmentFailure(leadId: string, errorMessage: string) {
  const supabase = createSupabaseServiceClient();
  const { data: lead } = await supabase.from("leads").select("*").eq("id", leadId).maybeSingle();

  await supabase.from("lead_enrichment").insert({
    lead_id: leadId,
    enrichment_confidence: "low",
    status: "failed",
    error_message: errorMessage,
    raw_scrape_summary: errorMessage
  });

  if (!isValidBusinessEmail(lead?.email)) {
    await rejectLeadWithoutUsableEmail(leadId);
  } else {
    await supabase.from("leads").update({ status: "review_pending" }).eq("id", leadId);
    await upsertManualReview(leadId, "enrichment_failed", "normal");
  }

  if (lead) {
    await logEnrichmentEvent(lead, "failed", { error_message: errorMessage }, errorMessage);
  }
}

async function upsertManualReview(leadId: string, reason: string, priority: "low" | "normal" | "high") {
  const supabase = createSupabaseServiceClient();
  const { data: existingReview, error: existingError } = await supabase
    .from("manual_review_queue")
    .select("id")
    .eq("lead_id", leadId)
    .eq("review_status", "pending")
    .maybeSingle();

  if (existingError) throw new Error(existingError.message);

  const payload = { lead_id: leadId, reason, priority, review_status: "pending" };
  const { error } = existingReview
    ? await supabase.from("manual_review_queue").update(payload).eq("id", existingReview.id)
    : await supabase.from("manual_review_queue").insert(payload);

  if (error) throw new Error(error.message);
}

async function logEnrichmentEvent(
  lead: { id: string; campaign_id?: string | null; discovery_run_id?: string | null; candidate_id?: string | null },
  status: "completed" | "failed",
  payload: Record<string, unknown>,
  errorMessage?: string
) {
  const supabase = createSupabaseServiceClient();
  await supabase.from("workflow_events").insert({
    workflow_name: "WF-02 Enrichment",
    lead_id: lead.id,
    campaign_id: lead.campaign_id ?? null,
    discovery_run_id: lead.discovery_run_id ?? null,
    candidate_id: lead.candidate_id ?? null,
    event_type: "lead_enrichment",
    status,
    error_message: errorMessage ?? null,
    payload
  });
}
