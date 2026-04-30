import { createSupabaseServiceClient } from "@/lib/supabase/server";
import type { EnrichLeadOutput } from "@/lib/contracts";
import { crawlBusinessWebsite, extractWebsiteSignals } from "@/lib/workflows/website-crawler";

type CandidateSourceAttribution = {
  website_crawl_signals?: {
    booking_link_found?: boolean;
    contact_form_found?: boolean;
    whatsapp_found?: boolean;
    chat_widget_found?: boolean;
    raw_scrape_summary?: string;
  };
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
  if (!lead.website) {
    await logEnrichmentFailure(leadId, "Lead has no website");
    return {
      lead_id: leadId,
      enrichment_confidence: "low",
      workflow_signals: []
    };
  }

  const { data: candidate } = lead.candidate_id
    ? await supabase
        .from("lead_candidates")
        .select("website_crawl_status,website_crawl_summary,source_attribution")
        .eq("id", lead.candidate_id)
        .maybeSingle()
    : { data: null };

  if (candidate?.website_crawl_status === "success" && candidate.website_crawl_summary) {
    const sourceAttribution = candidate.source_attribution as CandidateSourceAttribution | null;
    const crawlSignals = sourceAttribution?.website_crawl_signals;
    const record = {
      lead_id: leadId,
      services_offered: [],
      social_links: [],
      detected_tools: [],
      booking_link_found: crawlSignals?.booking_link_found ?? false,
      contact_form_found: crawlSignals?.contact_form_found ?? false,
      whatsapp_found: crawlSignals?.whatsapp_found ? "visible" : null,
      chat_widget_found: crawlSignals?.chat_widget_found ?? false,
      raw_scrape_summary: candidate.website_crawl_summary,
      enrichment_confidence: "medium",
      status: "completed"
    };

    const { error: insertError } = await supabase.from("lead_enrichment").insert(record);
    if (insertError) throw new Error(insertError.message);

    await supabase.from("leads").update({ status: "enriched" }).eq("id", leadId);

    return {
      lead_id: leadId,
      enrichment_confidence: "medium",
      workflow_signals: [crawlSignals?.raw_scrape_summary ?? candidate.website_crawl_summary]
    };
  }

  const crawl = await crawlBusinessWebsite(lead.website);
  if (crawl.status !== "success") {
    await logEnrichmentFailure(leadId, crawl.error ?? crawl.summary);
    return {
      lead_id: leadId,
      enrichment_confidence: "low",
      workflow_signals: []
    };
  }

  const pages = crawl.pages;
  const combined = pages.map((page) => page.html).join("\n");
  const signals = extractWebsiteSignals(pages);
  const emails = signals.emails;
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
    email_found: emails[0] ?? null,
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
    enrichment_confidence: pages.length > 1 || emails.length || phones.length ? "medium" : "low",
    status: "completed"
  };

  const { error: insertError } = await supabase.from("lead_enrichment").insert(record);
  if (insertError) throw new Error(insertError.message);

  await supabase
    .from("leads")
    .update({
      status: "enriched",
      email: lead.email ?? emails[0] ?? null,
      phone: lead.phone ?? phones[0] ?? null,
      whatsapp: lead.whatsapp ?? record.whatsapp_found
    })
    .eq("id", leadId);

  return {
    lead_id: leadId,
    enrichment_confidence: record.enrichment_confidence as "low" | "medium" | "high",
    email_found: emails[0],
    workflow_signals: workflowSignals
  };
}

async function logEnrichmentFailure(leadId: string, errorMessage: string) {
  const supabase = createSupabaseServiceClient();

  await supabase.from("lead_enrichment").insert({
    lead_id: leadId,
    enrichment_confidence: "low",
    status: "failed",
    error_message: errorMessage,
    raw_scrape_summary: errorMessage
  });

  await supabase.from("leads").update({ status: "new" }).eq("id", leadId);
}
