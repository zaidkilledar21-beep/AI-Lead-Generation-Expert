import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { enrichLead } from "@/lib/workflows/enrichment";
import { scoreLead } from "@/lib/workflows/scoring";

const defaultLimit = 5;
const maxLimit = 10;
const processableStatuses = ["new", "enriched", "review_pending"];

type ProcessRecoveredDiscoveryInput = {
  discovery_run_id?: string;
  limit?: number;
  dry_run?: boolean;
};

type BatchCounts = {
  processed: number;
  enriched: number;
  scored: number;
  failed: number;
};

function normalizeLimit(limit?: number) {
  if (!Number.isFinite(limit)) return defaultLimit;
  return Math.min(Math.max(Math.trunc(limit ?? defaultLimit), 1), maxLimit);
}

async function logBatchEvent(
  discoveryRunId: string,
  campaignId: string | null,
  eventType: "recovered_processing_started" | "recovered_processing_completed",
  counts: BatchCounts,
  dryRun: boolean
) {
  const supabase = createSupabaseServiceClient();
  const { error } = await supabase.from("workflow_events").insert({
    workflow_name: "WF-02/WF-03 Recovered Discovery Processing",
    campaign_id: campaignId,
    discovery_run_id: discoveryRunId,
    event_type: eventType,
    status: eventType === "recovered_processing_started" ? "started" : "completed",
    payload: {
      discovery_run_id: discoveryRunId,
      dry_run: dryRun,
      ...counts
    }
  });

  if (error) throw new Error(error.message);
}

async function hasLeadScore(leadId: string) {
  const supabase = createSupabaseServiceClient();
  const { count, error } = await supabase
    .from("lead_scores")
    .select("id", { count: "exact", head: true })
    .eq("lead_id", leadId);

  if (error) throw new Error(error.message);
  return (count ?? 0) > 0;
}

async function getLatestEnrichmentStatus(leadId: string) {
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from("lead_enrichment")
    .select("status")
    .eq("lead_id", leadId)
    .order("last_enriched_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data?.status ?? null;
}

async function processLead(leadId: string, counts: BatchCounts) {
  let enrichmentStatus = await getLatestEnrichmentStatus(leadId);

  if (!enrichmentStatus) {
    const enrichment = await enrichLead(leadId);
    enrichmentStatus = enrichment.status;
    if (enrichment.status === "completed") counts.enriched += 1;
  }

  if (enrichmentStatus !== "completed") {
    counts.failed += 1;
    return;
  }

  if (await hasLeadScore(leadId)) return;

  await scoreLead(leadId);
  counts.scored += 1;
}

export async function processRecoveredDiscoveryLeads(input: ProcessRecoveredDiscoveryInput) {
  const discoveryRunId = input.discovery_run_id?.trim();
  if (!discoveryRunId) throw new Error("discovery_run_id is required");

  const limit = normalizeLimit(input.limit);
  const dryRun = input.dry_run === true;
  const supabase = createSupabaseServiceClient();
  const { data: run, error: runError } = await supabase
    .from("discovery_runs")
    .select("id,campaign_id")
    .eq("id", discoveryRunId)
    .maybeSingle();

  if (runError) throw new Error(runError.message);
  if (!run) throw new Error("Discovery run not found");

  const { data: leads, error: leadsError } = await supabase
    .from("leads")
    .select("id,lead_scores()")
    .eq("discovery_run_id", discoveryRunId)
    .in("status", processableStatuses)
    .is("lead_scores", null)
    .limit(limit);

  if (leadsError) throw new Error(leadsError.message);

  const counts: BatchCounts = {
    processed: 0,
    enriched: 0,
    scored: 0,
    failed: 0
  };

  await logBatchEvent(discoveryRunId, run.campaign_id ?? null, "recovered_processing_started", counts, dryRun);

  for (const lead of leads ?? []) {
    counts.processed += 1;
    if (dryRun) continue;

    try {
      await processLead(lead.id, counts);
    } catch {
      counts.failed += 1;
    }
  }

  await logBatchEvent(discoveryRunId, run.campaign_id ?? null, "recovered_processing_completed", counts, dryRun);

  return {
    discovery_run_id: discoveryRunId,
    dry_run: dryRun,
    limit,
    ...counts
  };
}
