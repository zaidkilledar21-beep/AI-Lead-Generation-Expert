import { randomUUID } from "node:crypto";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { enrichLead } from "@/lib/workflows/enrichment";
import {
  countPromotableCandidatesFromDb,
  getCampaignById,
  promoteStrandedDiscoveryCandidates,
  safeFinalizeDiscoveryRun
} from "@/lib/workflows/lead-discovery";
import { scoreLead } from "@/lib/workflows/scoring";
import { rejectLeadWithoutUsableEmail } from "@/lib/workflows/email-gate";

const defaultLimit = 5;
const maxLimit = 10;
const defaultProcessableStatuses = ["new", "enriched"];

// Bounded-worker defaults. The worker stops launching new per-run work once the runtime guard is
// reached so it returns before the serverless timeout (route maxDuration = 300s).
const defaultMaxRuns = 5;
const maxRunsCap = 20;
const defaultMaxRuntimeMs = 240_000;
const maxRuntimeCap = 280_000;
const minRuntimeMs = 10_000;
const staleSearchActivityMs = 120_000;
const searchActivityEvents = [
  "query_loop_started",
  "query_quota_reserved",
  "search_query_upserted",
  "text_search_started",
  "text_search_completed",
  "place_processing_started",
  "run_progress_persisted"
];
const searchCompletionEvents = [
  "execute_search_completed",
  "promotion_started",
  "import_started",
  "import_completed",
  "promotion_completed",
  "stranded_promotion_started",
  "stranded_promotion_completed"
];

type ProcessRecoveredDiscoveryInput = {
  discovery_run_id?: string;
  limit?: number;
  dry_run?: boolean;
  include_review_pending?: boolean;
};

type ContinueDiscoveryInput = {
  limit?: number;
  max_runs?: number;
  max_runtime_ms?: number;
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

function clampInt(value: number | undefined, fallback: number, min: number, max: number) {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(Math.max(Math.trunc(value ?? fallback), min), max);
}

function normalizeLimit(limit?: number) {
  return clampInt(limit, defaultLimit, 1, maxLimit);
}

function emptyCounts(): BatchCounts {
  return { processed: 0, enriched: 0, enrichment_failed: 0, scored: 0, failed: 0 };
}

function resolveProcessableStatuses(includeReviewPending: boolean) {
  return includeReviewPending ? [...defaultProcessableStatuses, "review_pending"] : defaultProcessableStatuses;
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unknown recovered lead processing error";
}

async function logRunEvent(
  discoveryRunId: string,
  campaignId: string | null,
  eventType: string,
  status: "started" | "completed" | "failed",
  payload: Record<string, unknown>
) {
  const supabase = createSupabaseServiceClient();
  const { error } = await supabase.from("workflow_events").insert({
    workflow_name: "WF-02/WF-03 Recovered Discovery Processing",
    campaign_id: campaignId,
    discovery_run_id: discoveryRunId,
    event_type: eventType,
    status,
    payload: { discovery_run_id: discoveryRunId, ...payload }
  });

  if (error) throw new Error(error.message);
}

async function logBatchEvent(
  discoveryRunId: string,
  campaignId: string | null,
  eventType: "recovered_processing_started" | "recovered_processing_completed",
  counts: BatchCounts,
  dryRun: boolean
) {
  await logRunEvent(
    discoveryRunId,
    campaignId,
    eventType,
    eventType === "recovered_processing_started" ? "started" : "completed",
    { dry_run: dryRun, ...counts }
  );
}

async function acquireRecoveryLease(discoveryRunId: string, leaseToken: string) {
  const acquired = await tryAcquireRecoveryLease(discoveryRunId, leaseToken);
  if (!acquired) throw new Error("Recovered discovery processing is already running for this discovery_run_id");
}

async function tryAcquireRecoveryLease(discoveryRunId: string, leaseToken: string) {
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase.rpc("acquire_discovery_recovery_lease", {
    p_discovery_run_id: discoveryRunId,
    p_lease_token: leaseToken,
    p_lease_seconds: 300
  });

  if (error) throw new Error(error.message);
  return data === true;
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
    .eq("lead_id", leadId)
    .limit(1);

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

// Bounded, indexed-filter selection of leads still needing WF-02/WF-03 work for one run.
async function selectProcessableLeads(discoveryRunId: string, processableStatuses: string[], limit: number) {
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from("leads")
    .select("id,business_name,status,campaign_id,lead_scores()")
    .eq("discovery_run_id", discoveryRunId)
    .in("status", processableStatuses)
    .is("lead_scores", null)
    .order("updated_at", { ascending: true })
    .order("created_at", { ascending: true })
    .order("id", { ascending: true })
    .limit(limit);

  if (error) throw new Error(error.message);
  return (data ?? []) as RecoveredLead[];
}

async function logLeadProcessingFailure(lead: RecoveredLead, discoveryRunId: string, message: string) {
  const supabase = createSupabaseServiceClient();
  const { error } = await supabase.from("workflow_events").insert({
    workflow_name: "WF-02/WF-03 Recovered Discovery Processing",
    lead_id: lead.id,
    campaign_id: lead.campaign_id ?? null,
    discovery_run_id: discoveryRunId,
    event_type: "recovered_lead_processing_failed",
    status: "failed",
    error_message: message,
    payload: {
      lead_id: lead.id,
      campaign_id: lead.campaign_id ?? null,
      discovery_run_id: discoveryRunId,
      error_message: message
    }
  });

  if (error) throw new Error(error.message);
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

  if (await rejectLeadWithoutUsableEmail(lead.id)) {
    return {
      lead_id: lead.id,
      business_name: lead.business_name,
      previous_status: lead.status,
      enrichment_status: enrichmentStatus,
      scored: false,
      result: "rejected_missing_email"
    };
  }

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

// Shared per-lead loop used by both the single-run endpoint and the bounded continue worker.
async function processLeadBatch(
  leads: RecoveredLead[],
  discoveryRunId: string,
  counts: BatchCounts,
  perLeadResults: PerLeadResult[],
  dryRun: boolean
) {
  for (const lead of leads) {
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
}

async function countRouteableScored(discoveryRunId: string) {
  const supabase = createSupabaseServiceClient();
  const { count, error } = await supabase
    .from("wf04_scored_leads")
    .select("id", { count: "exact", head: true })
    .eq("discovery_run_id", discoveryRunId)
    .limit(1);

  if (error) return 0;
  return count ?? 0;
}

async function syncRunReviewPending(discoveryRunId: string) {
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase.rpc("sync_run_review_pending", { p_discovery_run_id: discoveryRunId });
  if (error) throw new Error(error.message);
  return typeof data === "number" ? data : 0;
}

async function getDiscoverySearchState(discoveryRunId: string) {
  const supabase = createSupabaseServiceClient();
  const [{ count: completionCount, error: completionError }, { data: latestActivity, error: activityError }] = await Promise.all([
    supabase
      .from("workflow_events")
      .select("id", { count: "exact", head: true })
      .eq("discovery_run_id", discoveryRunId)
      .in("event_type", searchCompletionEvents)
      .limit(1),
    supabase
      .from("workflow_events")
      .select("created_at,event_type")
      .eq("discovery_run_id", discoveryRunId)
      .in("event_type", searchActivityEvents)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()
  ]);

  if (completionError) throw new Error(completionError.message);
  if (activityError) throw new Error(activityError.message);

  const completed = (completionCount ?? 0) > 0;
  const latestActivityAt = latestActivity?.created_at ? Date.parse(latestActivity.created_at) : null;
  const stale = latestActivityAt === null || Date.now() - latestActivityAt > staleSearchActivityMs;

  return {
    completed,
    stale,
    readyForRecoveryPromotion: completed || stale,
    latestActivityEvent: latestActivity?.event_type ?? null,
    latestActivityAt: latestActivity?.created_at ?? null
  };
}

async function promoteStrandedCandidatesIfReady(
  discoveryRunId: string,
  campaignId: string | null,
  dryRun: boolean,
  searchState: Awaited<ReturnType<typeof getDiscoverySearchState>>
) {
  const remainingBefore = await countPromotableCandidatesFromDb(discoveryRunId);
  if (remainingBefore === 0) return { promoted: 0, remaining: 0, deferred: false };
  if (!campaignId || !searchState.readyForRecoveryPromotion) {
    return { promoted: 0, remaining: remainingBefore, deferred: true };
  }

  const campaign = await getCampaignById(campaignId);
  if (!campaign) return { promoted: 0, remaining: remainingBefore, deferred: true };

  const result = await promoteStrandedDiscoveryCandidates(campaign, discoveryRunId, dryRun);
  const remaining = dryRun ? remainingBefore : await countPromotableCandidatesFromDb(discoveryRunId);
  return { promoted: result.created, remaining, deferred: false };
}

// Reconcile + finalize the parent run when no WF-02/WF-03 work remains. Reuses the canonical
// finalizer from lead-discovery so counts, completed_at, duration, and run_finalized events match
// the synchronous discovery path exactly.
async function finalizeRunAfterProcessing(discoveryRunId: string, campaignId: string | null) {
  if (!campaignId) return { finalized: false, routeableScored: 0, reviewSynced: 0 };

  const reviewSynced = await syncRunReviewPending(discoveryRunId);
  const result = await safeFinalizeDiscoveryRun({ id: campaignId }, discoveryRunId, {}, [], "completed");
  const routeableScored = await countRouteableScored(discoveryRunId);

  if (result.finalized && routeableScored > 0) {
    await logRunEvent(discoveryRunId, campaignId, "awaiting_wf04", "completed", {
      routeable_scored: routeableScored,
      review_synced: reviewSynced
    });
  }

  return { finalized: result.finalized, routeableScored, reviewSynced };
}

export async function processRecoveredDiscoveryLeads(input: ProcessRecoveredDiscoveryInput) {
  const discoveryRunId = input.discovery_run_id?.trim();
  if (!discoveryRunId) throw new Error("discovery_run_id is required");

  const limit = normalizeLimit(input.limit);
  const dryRun = input.dry_run === true;
  const includeReviewPending = input.include_review_pending === true;
  const processableStatuses = resolveProcessableStatuses(includeReviewPending);
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
    const leads = await selectProcessableLeads(discoveryRunId, processableStatuses, limit);
    const counts = emptyCounts();
    const perLeadResults: PerLeadResult[] = [];

    await logBatchEvent(discoveryRunId, run.campaign_id ?? null, "recovered_processing_started", counts, dryRun);
    await processLeadBatch(leads, discoveryRunId, counts, perLeadResults, dryRun);
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

type ContinueRunResult = {
  run_id: string;
  result: string;
  processed?: number;
  enriched?: number;
  scored?: number;
  failed?: number;
  finalized?: boolean;
  awaiting_wf04?: boolean;
  error_message?: string;
};

type WorkerAggregate = {
  runs_processed: number;
  leads_processed: number;
  enriched: number;
  scored: number;
  failed: number;
  finalized: number;
};

async function processOneRun(
  run: { id: string; campaign_id: string | null },
  perRunLimit: number,
  processableStatuses: string[],
  dryRun: boolean,
  aggregate: WorkerAggregate
): Promise<ContinueRunResult> {
  const counts = emptyCounts();
  const perLeadResults: PerLeadResult[] = [];
  const searchState = await getDiscoverySearchState(run.id);
  const strandedPromotion = await promoteStrandedCandidatesIfReady(run.id, run.campaign_id ?? null, dryRun, searchState);
  await logRunEvent(run.id, run.campaign_id ?? null, "recovery_batch_started", "started", {
    dry_run: dryRun,
    limit: perRunLimit,
    search_state: searchState,
    stranded_promotion: strandedPromotion
  });

  const leads = await selectProcessableLeads(run.id, processableStatuses, perRunLimit);
  await processLeadBatch(leads, run.id, counts, perLeadResults, dryRun);

  aggregate.runs_processed += 1;
  aggregate.leads_processed += counts.processed;
  aggregate.enriched += counts.enriched;
  aggregate.scored += counts.scored;
  aggregate.failed += counts.failed;

  await logRunEvent(run.id, run.campaign_id ?? null, "recovery_batch_completed", "completed", {
    dry_run: dryRun,
    ...counts
  });

  let finalized = false;
  let awaitingWf04 = false;
  if (!dryRun) {
    const remaining = await selectProcessableLeads(run.id, processableStatuses, 1);
    const remainingPromotableCandidates = await countPromotableCandidatesFromDb(run.id);
    if (remaining.length === 0 && remainingPromotableCandidates === 0 && searchState.readyForRecoveryPromotion) {
      const outcome = await finalizeRunAfterProcessing(run.id, run.campaign_id ?? null);
      finalized = outcome.finalized;
      awaitingWf04 = outcome.routeableScored > 0;
      if (finalized) aggregate.finalized += 1;
    } else if (remainingPromotableCandidates > 0 || !searchState.readyForRecoveryPromotion) {
      await logRunEvent(run.id, run.campaign_id ?? null, "recovery_finalization_deferred", "completed", {
        dry_run: dryRun,
        remaining_processable_leads: remaining.length,
        remaining_promotable_candidates: remainingPromotableCandidates,
        search_state: searchState
      });
    }
  }

  return { run_id: run.id, result: "processed", processed: counts.processed, enriched: counts.enriched, scored: counts.scored, failed: counts.failed, finalized, awaiting_wf04: awaitingWf04 };
}

// Bounded, resumable worker. Finds `running` discovery runs and processes a small batch per run
// under a runtime guard, finalizing any run whose WF-02/WF-03 work is complete. Safe to call
// repeatedly (Vercel Cron or a lightweight n8n scheduler). n8n must NOT own WF-02/WF-03 logic;
// it may only schedule this backend worker.
export async function continueDiscoveryProcessing(input: ContinueDiscoveryInput = {}) {
  const startTime = Date.now();
  const perRunLimit = normalizeLimit(input.limit);
  const maxRuns = clampInt(input.max_runs, defaultMaxRuns, 1, maxRunsCap);
  const maxRuntimeMs = clampInt(input.max_runtime_ms, defaultMaxRuntimeMs, minRuntimeMs, maxRuntimeCap);
  const dryRun = input.dry_run === true;
  const processableStatuses = resolveProcessableStatuses(input.include_review_pending === true);

  const supabase = createSupabaseServiceClient();
  const { data: runs, error } = await supabase
    .from("discovery_runs")
    .select("id,campaign_id")
    .eq("status", "running")
    .order("started_at", { ascending: true })
    .limit(maxRuns);

  if (error) throw new Error(error.message);

  const aggregate: WorkerAggregate = { runs_processed: 0, leads_processed: 0, enriched: 0, scored: 0, failed: 0, finalized: 0 };
  const perRun: ContinueRunResult[] = [];

  for (const run of runs ?? []) {
    if (Date.now() - startTime > maxRuntimeMs) {
      perRun.push({ run_id: run.id, result: "time_budget_reached" });
      break;
    }

    const leaseToken = randomUUID();
    let leased = false;
    try {
      leased = await tryAcquireRecoveryLease(run.id, leaseToken);
      if (!leased) { perRun.push({ run_id: run.id, result: "lease_unavailable" }); continue; }
      perRun.push(await processOneRun(run, perRunLimit, processableStatuses, dryRun, aggregate));
    } catch (workerError) {
      perRun.push({ run_id: run.id, result: "failed", error_message: errorMessage(workerError) });
    } finally {
      if (leased) await releaseRecoveryLease(run.id, leaseToken);
    }
  }

  return {
    dry_run: dryRun,
    limit: perRunLimit,
    max_runs: maxRuns,
    max_runtime_ms: maxRuntimeMs,
    runtime_ms: Date.now() - startTime,
    runs_seen: runs?.length ?? 0,
    ...aggregate,
    per_run: perRun
  };
}
