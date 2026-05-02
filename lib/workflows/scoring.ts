import { assertScoringOutput } from "@/lib/contracts";
import { callDeepSeekJson } from "@/lib/deepseek";
import { icpConfig } from "@/lib/config/icp";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import type { ScoringOutput } from "@/lib/types";

const scoringPromptVersion = "icp_scoring_v2";

function deriveBand(totalScore: number): ScoringOutput["band_recommendation"] {
  if (totalScore >= 80) return "A";
  if (totalScore >= 65) return "B";
  if (totalScore >= 45) return "C";
  return "D";
}

function buildScoringSystemPrompt() {
  return `Score the lead for AI automation services. Return only valid JSON matching the exact schema.

Use only supplied evidence from Google Places, the campaign, the lead record, and direct website crawl/enrichment. Do not infer review text, social activity, employee count, revenue, LinkedIn data, paid enrichment facts, or unverifiable growth claims when absent.

Required JSON schema:
{
  "total_score": number,
  "band_recommendation": "A" | "B" | "C" | "D",
  "confidence": "low" | "medium" | "high",
  "metric_scores": {
    "automation_opportunity": { "score": number, "max": 20, "evidence": string, "missing_data": string },
    "lead_customer_volume": { "score": number, "max": 15, "evidence": string, "missing_data": string },
    "digital_workflow_gap": { "score": number, "max": 15, "evidence": string, "missing_data": string },
    "revenue_ability_to_pay": { "score": number, "max": 15, "evidence": string, "missing_data": string },
    "niche_fit": { "score": number, "max": 10, "evidence": string, "missing_data": string },
    "reachability": { "score": number, "max": 10, "evidence": string, "missing_data": string },
    "operational_complexity": { "score": number, "max": 10, "evidence": string, "missing_data": string },
    "growth_activity": { "score": number, "max": 5, "evidence": string, "missing_data": string }
  },
  "automation_hypothesis": {
    "primary_pain_point": string,
    "likely_manual_workflow": string,
    "suggested_solution": string,
    "business_impact": string,
    "outreach_hook": string
  },
  "manual_review_required": boolean,
  "manual_review_reason": string
}

Metric rubric:
- automation_opportunity: reward visible booking, contact forms, WhatsApp/chat, appointment language, repeated customer requests, or obvious manual lead handling.
- lead_customer_volume: reward Google rating count, review count, location/category evidence, and public signs of customer traffic. Penalize missing volume evidence.
- digital_workflow_gap: reward visible forms without automation, weak contact flows, fragmented channels, missing booking, or low self-serve capability.
- revenue_ability_to_pay: reward high-intent service categories, premium services, and commercial location signals. Do not infer revenue numbers.
- niche_fit: reward match to campaign niche, target business types, region, and keywords. Penalize excluded terms or weak region/category match.
- reachability: reward verified website, phone, email, WhatsApp, contact page, and Google Maps URL.
- operational_complexity: reward evidence of appointments, services, multiple contact paths, FAQ/support load, or booking coordination.
- growth_activity: reward recent-looking website activity only if directly visible in crawl evidence. Otherwise keep low and explain missing data.

Band thresholds are deterministic: A >= 80, B = 65-79, C = 45-64, D < 45. Set band_recommendation to match total_score. Confidence must be low when source evidence, website crawl, or contact paths are missing.`;
}

export async function scoreLead(leadId: string) {
  const supabase = createSupabaseServiceClient();
  const [{ data: lead }, { data: enrichment }] = await Promise.all([
    supabase.from("leads").select("*").eq("id", leadId).maybeSingle(),
    supabase
      .from("lead_enrichment")
      .select("*")
      .eq("lead_id", leadId)
      .order("last_enriched_at", { ascending: false })
      .limit(1)
      .maybeSingle()
  ]);

  if (!lead) throw new Error("Lead not found");

  let scoreId: string | null = null;

  try {
    const [{ data: candidate }, { data: campaign }] = await Promise.all([
      lead.candidate_id
        ? supabase
            .from("lead_candidates")
            .select("source_attribution,google_place_id,rating,review_count,website_crawl_status,website_crawl_summary,candidate_status,rejection_reason")
            .eq("id", lead.candidate_id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
      lead.campaign_id
        ? supabase
            .from("campaigns")
            .select("niche,region,keywords,excluded_keywords,target_business_types")
            .eq("id", lead.campaign_id)
            .maybeSingle()
        : Promise.resolve({ data: null })
    ]);

    const sourceEvidenceSummary = {
      provider: lead.source,
      google_place_id: lead.google_place_id ?? candidate?.google_place_id ?? null,
      google_rating: lead.rating ?? candidate?.rating ?? null,
      google_review_count: lead.review_count ?? candidate?.review_count ?? null,
      website_present: Boolean(lead.website),
      website_crawl_status: candidate?.website_crawl_status ?? null,
      contact_paths: {
        email: Boolean(lead.email || enrichment?.email_found),
        phone: Boolean(lead.phone || enrichment?.phone_found),
        whatsapp: Boolean(lead.whatsapp || enrichment?.whatsapp_found),
        contact_form: Boolean(enrichment?.contact_form_found),
        booking_link: Boolean(enrichment?.booking_link_found),
        chat_widget: Boolean(enrichment?.chat_widget_found)
      }
    };

    const output = await callDeepSeekJson<ScoringOutput>([
      {
        role: "system",
        content: buildScoringSystemPrompt()
      },
      {
        role: "user",
        content: JSON.stringify({
          prompt_version: scoringPromptVersion,
          icp_config: icpConfig,
          campaign_context: campaign,
          lead,
          enrichment,
          google_places_source: candidate,
          source_evidence_summary: sourceEvidenceSummary
        })
      }
    ]);

    output.band_recommendation = deriveBand(output.total_score);
    assertScoringOutput(output);

    const { data: score, error: scoreError } = await supabase
      .from("lead_scores")
      .insert({
        lead_id: leadId,
        total_score: output.total_score,
        band: output.band_recommendation,
        confidence: output.confidence,
        automation_opportunity_score: output.metric_scores.automation_opportunity.score,
        lead_volume_score: output.metric_scores.lead_customer_volume.score,
        digital_workflow_gap_score: output.metric_scores.digital_workflow_gap.score,
        ability_to_pay_score: output.metric_scores.revenue_ability_to_pay.score,
        niche_fit_score: output.metric_scores.niche_fit.score,
        reachability_score: output.metric_scores.reachability.score,
        operational_complexity_score: output.metric_scores.operational_complexity.score,
        growth_activity_score: output.metric_scores.growth_activity.score,
        manual_review_required: output.manual_review_required,
        prompt_version: scoringPromptVersion,
        model: process.env.DEEPSEEK_MODEL ?? "deepseek-chat",
        scoring_metadata: {
          deterministic_band: output.band_recommendation,
          source_evidence_summary: sourceEvidenceSummary,
          campaign_context: campaign
        }
      })
      .select("id")
      .single();

    if (scoreError) throw new Error(scoreError.message);
    scoreId = score.id;

    const evidenceRows = Object.entries(output.metric_scores).map(([metricName, metric]) => ({
      lead_id: leadId,
      lead_score_id: score.id,
      metric_name: metricName,
      score: metric.score,
      max_score: metric.max,
      confidence: output.confidence,
      evidence: metric.evidence,
      missing_data: metric.missing_data,
      reasoning_summary: metric.evidence
    }));

    const { error: evidenceError } = await supabase.from("score_evidence").insert(evidenceRows);
    if (evidenceError) throw new Error(evidenceError.message);

    const { error: hypothesisError } = await supabase.from("automation_hypotheses").insert({
      lead_id: leadId,
      primary_pain_point: output.automation_hypothesis.primary_pain_point,
      likely_manual_workflow: output.automation_hypothesis.likely_manual_workflow,
      suggested_solution: output.automation_hypothesis.suggested_solution,
      business_impact: output.automation_hypothesis.business_impact,
      outreach_hook: output.automation_hypothesis.outreach_hook,
      confidence: output.confidence
    });
    if (hypothesisError) throw new Error(hypothesisError.message);

    await supabase.from("leads").update({ status: "scored" }).eq("id", leadId);
    await logScoringEvent(lead, "completed", {
      total_score: output.total_score,
      band: output.band_recommendation,
      confidence: output.confidence,
      prompt_version: scoringPromptVersion
    });

    return output;
  } catch (error) {
    if (scoreId) {
      await supabase.from("lead_scores").delete().eq("id", scoreId);
    }
    const message = error instanceof Error ? error.message : "Unknown scoring error";
    await logScoringEvent(lead, "failed", { prompt_version: scoringPromptVersion }, message);
    throw error;
  }
}

async function logScoringEvent(
  lead: { id: string; campaign_id?: string | null; discovery_run_id?: string | null; candidate_id?: string | null },
  status: "completed" | "failed",
  payload: Record<string, unknown>,
  errorMessage?: string
) {
  const supabase = createSupabaseServiceClient();
  await supabase.from("workflow_events").insert({
    workflow_name: "WF-03 ICP Scoring",
    lead_id: lead.id,
    campaign_id: lead.campaign_id ?? null,
    discovery_run_id: lead.discovery_run_id ?? null,
    candidate_id: lead.candidate_id ?? null,
    event_type: "lead_scoring",
    status,
    error_message: errorMessage ?? null,
    payload
  });
}
