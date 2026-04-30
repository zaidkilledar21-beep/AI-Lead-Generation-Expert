import { assertScoringOutput } from "@/lib/contracts";
import { callDeepSeekJson } from "@/lib/deepseek";
import { icpConfig } from "@/lib/config/icp";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import type { ScoringOutput } from "@/lib/types";

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

  const { data: candidate } = lead.candidate_id
    ? await supabase
        .from("lead_candidates")
        .select("source_attribution,google_place_id,rating,review_count,website_crawl_status,website_crawl_summary,candidate_status,rejection_reason")
        .eq("id", lead.candidate_id)
        .maybeSingle()
    : { data: null };

  const output = await callDeepSeekJson<ScoringOutput>([
    {
      role: "system",
      content:
        "Score the lead for automation services. Return only valid JSON matching the requested schema. Use only Google Places source evidence and direct website crawl/enrichment evidence. Do not infer review text, social activity, employee count, revenue, LinkedIn data, or paid-enrichment facts when absent. Penalize confidence when source evidence, website crawl, or contact paths are missing."
    },
    {
      role: "user",
      content: JSON.stringify({
        schema: "PRD Section 15.1 ICP scoring output schema",
        icp_config: icpConfig,
        lead,
        enrichment,
        google_places_source: candidate
      })
    }
  ]);

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
      manual_review_required: output.manual_review_required
    })
    .select("id")
    .single();

  if (scoreError) throw new Error(scoreError.message);

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

  return output;
}
