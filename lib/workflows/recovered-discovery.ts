import { randomUUID } from "node:crypto";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { enrichLead } from "@/lib/workflows/enrichment";
import { scoreLead } from "@/lib/workflows/scoring";

const defaultLimit = 5;
const maxLimit = 10;
const defaultProcessableStatuses = ["new", "enriched"];

type ProcessRecoveredDiscoveryInput = {
  discovery_run_id?: string;
  limit?: number;
  dry_run?: boolean;
  include_review_pending?: boolean;
};

type BatchCounts = {
  processed: number;
  enriched: number;
  enrichment_failed: number;
  scored: number;
  failed: number;
};

type RecoveredLead = {
  id: string;
  business_name: string;
  status: string;
  campaign_id?: string | null;
};

type PerLeadResult = {
  lead_id: string;
  business_name: string;
  previous_status: string;
  enrichment_status: string | null;
  scored: boolean;
  result: string;
  error_message?: string;
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

async function acquireRecoveryLease(discoveryRunId: string, leaseToken: string) {
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase.rpc("acquire_discovery_recovery_lease", {
    p_discovery_run_id: discoveryRunId,
    p_lease_token: leaseToken,
    p_lease_seconds: 300
  });

  if (error) throw new Error(error.message);
  if (data !== true) throw new Error("Recovered discovery processing is already running for this discovery_run_id");
}

async function releaseRecoveryLease(discoveryRunId: string, leaseToken: string) {
  const supabase = createSupabaseServiceClient();
  await supabase.rpc("release_discovery_recovery_lease", {
    p_discovery_run_id: discoveryRunId,
    p_lease_token: leaseToken
  });
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

async function getLatestEnrichmentStatusSafely(leadId: string) {
  try {
    return await getLatestEnrichmentStatus(leadId);
  } catch {
    return null;
  }
}

async function logLeadProcessingFailure(lead: RecoveredLead, discoveryRunId: string, errorMessage: string) {
  const supabase = createSupabaseServiceClient();
  const { error } = await supabase.from("workflow_events").insert({
    workflow_name: "WF-02/WF-03 Recovered Discovery Processing",
    lead_id: lead.id,
    campaign_id: lead.campaign_id ?? null,
    discovery_run_id: discoveryRunId,
    event_type: "recovered_lead_processing_failed",
    status: "failed",
    error_message: errorMessage,
    payload: {
      lead_id: lead.id,
      campaign_id: lead.campaign_id ?? null,
      discovery_run_id: discoveryRunId,
      error_message: errorMessage
    }
  });

  if (error) throw new Error(error.message);
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unknown recovered lead processing error";
}

async function processLead(lead: RecoveredLead, counts: BatchCounts): Promise<PerLeadResult> {
  let enrichmentStatus = await getLatestEnrichmentStatus(lead.id);

  if (!enrichmentStatus) {
    try {
      const enrichment = await enrichLead(lead.id);
      enrichmentStatus = enrichment.status;
      if (enrichment.status === "completed") counts.enriched += 1;
    } catch (error) {
      throw new Error(`WF-02 enrichment failed fatally: ${errorMessage(error)}`);
    }
  }

  if (enrichmentStatus === "failed") counts.enrichment_failed += 1;

  if (await hasLeadScore(lead.id)) {
    return {
      lead_id: lead.id,
      business_name: lead.business_name,
      previous_status: lead.status,
      enrichment_status: enrichmentStatus,
      scored: false,
      result: "score_already_exists"
    };
  }

  try {
    await scoreLead(lead.id);
  } catch (error) {
    throw new Error(`WF-03 scoring failed: ${errorMessage(error)}`);
  }
  counts.scored += 1;

  return {
    lead_id: lead.id,
    business_name: lead.business_name,
    previous_status: lead.status,
    enrichment_status: enrichmentStatus,
    scored: true,
    result: enrichmentStatus === "failed" ? "scored_after_enrichment_failed" : "scored"
  };
}

export async function processRecoveredDiscoveryLeads(input: ProcessRecoveredDiscoveryInput) {
  const discoveryRunId = input.discovery_run_id?.trim();
  if (!discoveryRunId) throw new Error("discovery_run_id is required");

  const limit = normalizeLimit(input.limit);
  const dryRun = input.dry_run === true;
  const includeReviewPending = input.include_review_pending === true;
  const processableStatuses = includeReviewPending
    ? [...defaultProcessableStatuses, "review_pending"]
    : defaultProcessableStatuses;
  const supabase = createSupabaseServiceClient();
  const { data: run, error: runError } = await supabase
    .from("discovery_runs")
    .select("id,campaign_id")
    .eq("id", discoveryRunId)
    .maybeSingle();

  if (runError) throw new Error(runError.message);
  if (!run) throw new Error("Discovery run not found");
  const leaseToken = randomUUID();
  await acquireRecoveryLease(discoveryRunId, leaseToken);

  try {
  const { data: leads, error: leadsError } = await supabase
    .from("leads")
    .select("id,business_name,status,campaign_id,lead_scores()")
    .eq("discovery_run_id", discoveryRunId)
    .in("status", processableStatuses)
    .is("lead_scores", null)
    .order("updated_at", { ascending: true })
    .order("created_at", { ascending: true })
    .order("id", { ascending: true })
    .limit(limit);

  if (leadsError) throw new Error(leadsError.message);

  const counts: BatchCounts = {
    processed: 0,
    enriched: 0,
    enrichment_failed: 0,
    scored: 0,
    failed: 0
  };
  const perLeadResults: PerLeadResult[] = [];

  await logBatchEvent(discoveryRunId, run.campaign_id ?? null, "recovered_processing_started", counts, dryRun);

  for (const lead of leads ?? []) {
    counts.processed += 1;
    if (dryRun) {
      perLeadResults.push({
        lead_id: lead.id,
        business_name: lead.business_name,
        previous_status: lead.status,
        enrichment_status: await getLatestEnrichmentStatusSafely(lead.id),
        scored: false,
        result: "dry_run"
      });
      continue;
    }

    try {
      perLeadResults.push(await processLead(lead, counts));
    } catch (error) {
      const message = errorMessage(error);
      counts.failed += 1;
      await logLeadProcessingFailure(lead, discoveryRunId, message);
      perLeadResults.push({
        lead_id: lead.id,
        business_name: lead.business_name,
        previous_status: lead.status,
        enrichment_status: await getLatestEnrichmentStatusSafely(lead.id),
        scored: false,
        result: "failed",
        error_message: message
      });
    }
  }

  await logBatchEvent(discoveryRunId, run.campaign_id ?? null, "recovered_processing_completed", counts, dryRun);

  return {
    discovery_run_id: discoveryRunId,
    dry_run: dryRun,
    include_review_pending: includeReviewPending,
    limit,
    ...counts,
    perLeadResults
  };
  } finally {
    await releaseRecoveryLease(discoveryRunId, leaseToken);
  }
}
