# Phase 1: Discovery Lifecycle State Safety and Reconciliation

## Goal

Fix the current production blocker: discovery runs can create candidates but remain permanently `running` with zero counts.

## Scope

Backend and DB only, plus minimal frontend surface if required.

## Files to inspect first

- `lib/workflows/lead-discovery.ts`
- `lib/workflows/discovery.ts`
- `app/api/workflows/discovery/run/route.ts`
- `lib/crm/queries.ts`
- `app/campaigns/actions.ts`
- `app/campaigns/run-now-button.tsx`
- `app/campaigns/page.tsx`
- `supabase/migrations/002_near_zero_discovery.sql`
- `supabase/migrations/007_crm_prd_compatibility.sql`
- `status.md`

## Problems to fix

### 1. Run finalization is too fragile

Current issue:
- The workflow persists candidates and updates candidate statuses.
- If anything after candidate persistence fails or hangs, `discovery_runs` can remain `running`.
- Counts are only written at finalization, so the frontend sees zeros until the very end.

Required fix:
- Make run finalization impossible to skip.
- Add a `safeFinalizeDiscoveryRun` wrapper that:
  - recomputes counts from DB by `discovery_run_id`,
  - updates `discovery_runs`,
  - logs `finalize_completed` or `finalize_failed`,
  - never throws without leaving a terminal run status.

### 2. Counts must be reconciled from the database

Add a helper in `lib/workflows/lead-discovery.ts` or a focused utility module:

`reconcileDiscoveryRunStats(runId: string)`

It must calculate:

- `candidates_checked`: count lead_candidates for run, plus duplicate/rejected where applicable.
- `places_text_search_calls`: from in-memory stats if available, otherwise preserved current value.
- `places_details_calls`: count candidates where details were fetched/persisted, or use in-memory if higher.
- `total_places_calls`: text + details.
- `duplicates_skipped`: from in-memory stats and duplicate events if persisted.
- `candidates_rejected`: count `candidate_status = 'rejected'`.
- `manual_review_candidates`: count `candidate_status = 'manual_review'`.
- `candidates_promoted`: count lead_candidates with `candidate_status = 'promoted'` or `final_lead_id is not null`, but prefer actual leads count where possible.
- `crawl_failures`: count `website_crawl_status = 'failed'`.

Important:
- Do not trust only in-memory stats.
- DB is the source of truth after partial work has already happened.

### 3. Add stale-running recovery

Add a function:

`recoverStaleDiscoveryRuns(campaignId?: string)`

It should:
- find runs with `status = 'running'` and `started_at < now() - interval '10 minutes'` or a configurable threshold,
- reconcile their counts,
- set status to:
  - `completed` if candidates/leads exist and no fatal error is logged,
  - `failed` if fatal workflow_events exist,
  - `quota_exhausted` if quota was the terminal blocker,
  - do not invent unsupported statuses unless a migration adds them.

This can be called before starting a new run and/or from the manual run action.

### 4. Persist incremental progress

During discovery:
- After each query loop or batch of candidates, update the current `discovery_runs` row with current counters.
- Do not wait until finalization for all counters.
- Keep this update cheap and throttled.

Add checkpoints:
- `counts_reconciled`
- `run_progress_persisted`
- `stale_run_recovered`
- `terminal_status_written`

### 5. Prevent double starts

Before reserving `run_count`, check for an existing active run for the same campaign.

Behavior:
- If a non-stale `running` run exists, return a clear response:
  - `status: "running"`
  - `run_id`
  - `message: "A discovery run is already in progress"`
- If the running run is stale, recover it first and then allow a new run if daily quota allows.

### 6. Ensure exceptions after import do not discard imported leads

In `promoteAndProcessLeads`:
- Import/promotion must be treated as a committed stage.
- Enrichment/scoring failures must not make the whole discovery run `failed` if leads were created.
- Store errors in `error_details` or workflow_events, but final status should be determined by persisted outcomes.

Suggested status logic:
- `completed`: at least one lead created, finalization succeeded, downstream enrichment/scoring errors are non-fatal.
- `failed`: no leads/candidates created and a fatal error occurred.
- `quota_exhausted`: quotas ended the run safely.
- `paused`: campaign/workflow intentionally paused.

### 7. Fix candidate promotion consistency

Current risk:
- Candidate can be set to `promoted` without `final_lead_id`.

Required behavior:
- Only mark candidate `promoted` after a lead is inserted and `final_lead_id` is written.
- If import duplicates the lead, mark candidate as `duplicate` or leave as `details_fetched` with a clear reason.
- Do not mass-update all promotable candidates to `promoted` after import unless each has a matching lead.

### 8. Add database migration only if needed

Create a new migration if current schema blocks required fields.

Possible additions:
- `discovery_runs.last_checkpoint text`
- `discovery_runs.last_checkpoint_at timestamptz`
- `discovery_runs.error_details jsonb default '[]'::jsonb`
- `discovery_runs.reconciled_at timestamptz`
- `discovery_runs.progress_payload jsonb default '{}'::jsonb`

Do not change existing status enum/check unless absolutely required. If adding statuses, update every frontend/query/status check accordingly.

## Acceptance criteria

- No run remains `running` after workflow returns or fails.
- Counts are visible in `discovery_runs` before and after finalization.
- Stale runs can be recovered without deleting candidates/leads.
- Candidate `promoted` means an actual final lead exists.
- Running the same campaign twice does not create overlapping runs.
- `npm run lint`, `npm run typecheck`, `npm run build`, and `git diff --check` pass.
