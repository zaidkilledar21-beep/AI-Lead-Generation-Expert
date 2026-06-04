# Project Status

## Current branch
- `codex/pass-6-production-readiness`

## Current task
- Fix review/campaigns/inbox/analytics filters for Next 16 search params, prevent filter dropdown clipping, harden review action errors, and enforce CRM status naming contract.

## Review reject/archive digest fix
- Root cause: review workspace actions were throwing server-action errors back to a client form. In production, Next.js replaces thrown server-action details with a generic Server Components digest, so the UI displayed the digest instead of the real validation/database message.
- Fix: `completeReviewQueueItemAction` now catches review-workspace failures and returns a structured `{ ok: false, error }` result; `ActionFeedbackForm` displays structured action errors without relying on thrown server-action details.
- Live cleanup: `Synqro WF05 Test Lead` (`2a4a9b2f-3d15-4035-9ac5-1855dd208fe9`) was archived and its manual review row (`29851981-272e-4745-8b63-9db1c6d779b6`) was marked `rejected` with note `Archived as old WF05 test lead cleanup.`
- Validation: lint, typecheck, unit tests, and production build pass.

## Review/filter + CRM contract follow-up
- Fixed filter pages still using synchronous `searchParams` under Next 16: `/review`, `/inbox`, `/campaigns`, and `/analytics` now await typed search params before applying filters.
- Added explicit `method="get"` to review/inbox filter forms and changed review/inbox/campaign filter containers to allow visible select dropdown overflow instead of clipping.
- CRM status contract audit found legacy DB-supported `replied` missing from the canonical TypeScript lead status list; added it to `LEAD_STATUSES`, `LEAD_STATUS_LABELS`, and made `lib/types.ts` reuse `LeadLifecycleStatus` instead of duplicating the union.
- Added status contract tests that compare canonical lead statuses against the dashboard status RPC migration and verify labels/status sets.
- Validation: lint, typecheck, full unit tests, production build, workflow contract validation, `git diff --check`, search-param grep, status duplication grep, and Graphify clean-mirror refresh/export all pass. Browser click-through was not run because no authenticated test user credentials are present in local env.

## WF-04 RPC ambiguity root cause fixed permanently (migration 017)
- Root cause: `queue_manual_review_item_sync` in migration 016 contained
  `on conflict (lead_id) where review_status = 'pending'`. Postgres could not
  disambiguate the bare `lead_id` in the conflict target from the function's own
  return-table column also named `lead_id`, raising "column reference 'lead_id' is
  ambiguous". WF-04 failed at the `Route Scored Lead` node.
- Live DB was manually hotfixed. Migration `017_fix_manual_review_rpc_lead_id_ambiguity.sql`
  makes that fix permanent.
- Fix: replaced `on conflict (lead_id)` with explicit SELECT → INSERT (no conflict clause)
  → `unique_violation` exception handler → re-SELECT pattern. All references inside the
  function body use qualified aliases (`mrq.*`, `l.*`). External RPC contract unchanged.
- `supabase/validation/pass_6_contract_checks.sql` extended with a regression guard that
  fails if the `_sync` function body still contains `on conflict (lead_id)`.
- After manual hotfix, WF-04 ran successfully (7 items output).
- Lead status distribution post-fix: review_pending: 11, drafted: 6, pending_approval: 6,
  in_sequence: 4, queued: 3.
- outreach_queue distribution: drafted/null: 6, queued/null: 4, blocked/missing_email: 3.
- **Environments that did NOT receive the manual DB hotfix must apply migration 017 before
  running WF-04.**
- Validation: lint, typecheck, npm test (38 tests / 12 files), validate:workflows (12 files),
  build all pass; `git diff --check` clean (LF→CRLF warnings only).

## Issue #52 holistic follow-up: RPC ambiguity + resumable worker (migration 016)
- Root causes:
  - WF-04 failed at `Route Scored Lead` with `queue_manual_review_item(uuid, unknown, unknown) is
    not unique`. Migration 015 added a 4-arg `(uuid,text,text,boolean default false)` overload that
    collided with the 3-arg form for `unknown`-literal calls; a legacy 5-arg overload also shared
    the name.
  - Backend WF-01/WF-02/WF-03 processed all leads in one request and timed out, leaving
    `discovery_runs` stuck `running` with `completed_at = null` and leads at `new`; recovery never
    finalized the parent run.
- Implemented hotfix (migration `016_issue_52_rpc_ambiguity_and_worker.sql`, additive):
  - Dropped the 4-arg boolean and legacy 5-arg overloads. Single canonical
    `queue_manual_review_item(uuid,text,text)` (preserve-by-default) + differently named
    `queue_manual_review_item_force(uuid,text,text)`; both delegate to a private
    `queue_manual_review_item_sync(uuid,text,text,boolean)` impl. All four are service_role-only
    (also fixed a prior anon/authenticated grant drift on the 3-arg).
  - Added `sync_run_review_pending(uuid)` (scored→review_pending sync, never overriding terminal),
    and worker indexes `leads (discovery_run_id, status)` + `discovery_runs (status, started_at)`.
  - New bounded resumable worker `POST /api/workflows/discovery/continue` →
    `continueDiscoveryProcessing()`: finds running runs, processes small bounded batches, skips
    enriched/scored leads, uses leases, runtime-guarded, finalizes via the reused
    `safeFinalizeDiscoveryRun`, emits `recovery_batch_started/completed`, `run_finalized`,
    `awaiting_wf04`. Backend never triggers WF-04.
  - Run detail (`lib/crm/queries.ts` + run page): "Stuck" now requires no recent event AND no
    active lease; added "Processing discovery", "Processing enrichment & scoring",
    "Backend complete: awaiting WF-04 routing".
- Migration 016 applied to production via Supabase MCP and validated: exactly one
  `queue_manual_review_item` (count=1), the previously failing unknown-literal call now plans
  cleanly, all manual-review RPCs + worker helper are service_role-only, no missing required
  functions, worker indexes present.
- n8n WF-04/WF-05 JSON unchanged (same RPC name + params) — **no re-import required**.
- Validation: lint, typecheck, `npm test` (38 tests / 12 files), `validate:workflows`, build all
  pass; `git diff --check` clean (LF→CRLF warnings only).
- Remaining: schedule `/api/workflows/discovery/continue` (Vercel Cron or n8n scheduler, ~2-5 min)
  and run one fresh campaign to confirm auto-finalization + WF-04 routing end-to-end.

## Issue #52 hotfix follow-up (post PR #53)
- Root cause: PR #53 left four dedup/ordering gaps and one status-regression risk.
  - `wf04_scored_leads` only filtered on `status = 'scored'`, so leads already holding a pending
    manual review, an outreach_queue row, or a draft could be re-routed into duplicate work.
  - `wf05_due_queue_items.wf05_action` evaluated `block_missing_email` before the existing
    draft/manual-review checks, so a queued item missing an email could block instead of skipping.
  - `queue_manual_review_item` overwrote an existing pending review's reason/priority on every call.
  - `email_drafts (lead_id, sequence_id, step_number)` uniqueness (the `persist_draft_or_block`
    ON CONFLICT target) had no idempotent committed backstop outside the 001 table constraint.
  - `scoreLead`'s existing/concurrent-score paths set `status = 'scored'` unconditionally, which
    could regress already-routed/drafted/replied/closed leads.
- Implemented hotfix (migration `015_issue_52_hotfix_followup.sql`, additive `create or replace`):
  - Rebuilt `wf04_scored_leads` to exclude leads with a pending manual review, an existing
    outreach_queue row, or any existing draft.
  - Rebuilt `wf05_due_queue_items` with priority `block_missing_lead` → `skip_existing_draft` →
    `skip_existing_manual_review` → `block_missing_email` → `block_invalid_lead_status` →
    `generate_draft`.
  - Rebuilt `queue_manual_review_item` to preserve an existing pending review by default; added a
    4-arg overload with explicit `p_force boolean default false` and kept the 3-arg signature as a
    `force => false` delegate. Duplicate protection (`manual_review_one_pending_per_lead_idx`) is
    preserved. Granted the new overload to `service_role` only.
  - Added idempotent `create unique index if not exists email_drafts_lead_sequence_step_uidx`
    plus a manual duplicate-inspection comment (no destructive cleanup).
  - `lib/workflows/scoring.ts`: existing/concurrent-score paths now only set `scored` when the
    lead is pre-routing (`new`, `enriched`, `review_pending`, `scored`).
  - Extended `scripts/validate-workflow-contracts.mjs`, `pass_6_contract_checks.sql`, and added
    `tests/unit/scoring.test.ts` to cover these exact cases.
- n8n JSON unchanged: `wf05_action` values and view columns are identical, so the WF-04/WF-05
  importable contracts did not change.
- Validation: lint, typecheck, `npm test` (35 tests / 12 files), `validate:workflows`, and build
  all passed; `git diff --check` clean (LF→CRLF warnings only).
- Remaining gap: migration `015` and `pass_6_contract_checks.sql` are not yet applied/run against
  production (Supabase CLI unavailable here). `outreach_queue` keeps its existing
  `unique (lead_id, sequence_id)` from 001 as the active-queue uniqueness; no new active-queue
  constraint was added to avoid a destructive change against possible historical duplicates.

## Last completed work
- Implemented Issue #52 DB-backed discovery promotion reload so persisted `details_fetched` candidates cannot remain stranded after the search loop.
- Extended stale-run recovery to promote persisted candidates and resume backend enrichment/scoring for already-promoted leads without scores.
- Removed backend discovery's WF-04 routing call; backend ownership now stops after WF-03 scoring and n8n starts at WF-04.
- Added enrichment/scoring rerun skips, concurrent-score uniqueness recovery, recovery endpoint same-run leases, and DB uniqueness protection for score/evidence rows.
- Added migration `014_issue_52_pipeline_hardening.sql` with idempotent pending-review reuse, `wf04_scored_leads`, `wf05_due_queue_items`, and `sync_wf05_queue_action`.
- Updated inactive WF-04/WF-05 importable n8n JSON: WF-04 reads flattened safe scored leads; WF-05 switches on `wf05_action` before DeepSeek and validates all batch items.
- Updated run detail terminal-state derivation and missing-email warning visibility.
- Added workflow-contract assertions for the Issue #52 architecture and WF-05 batch-safety guarantees.
- Aligned recovered discovery processing with the real backend WF-02/WF-03 flow: failed enrichment is counted and reported but no longer prevents scoring.
- Added deterministic recovered-lead ordering, opt-in `include_review_pending`, per-lead endpoint outcomes, and fatal per-lead workflow events.
- Fixed the Vercel production typecheck failure in the landing-page marketing components by preserving literal hash-link types and narrowing the shared Framer easing tuple.
- Manual SQL recovery promoted 35 leads for discovery run `393b508a-7c50-4f0b-a2d5-4887e5190bca`.
- Added a temporary authenticated backend recovery endpoint to enrich and score recovered leads idempotently in bounded batches.
- WF-04 remains n8n-owned; the recovery endpoint does not route leads or create n8n triggers for enrichment/scoring.

## Files changed recently
- `plans/issue-52-pipeline-hardening.md`
- `supabase/migrations/014_issue_52_pipeline_hardening.sql`
- `supabase/validation/pass_6_contract_checks.sql`
- `lib/workflows/lead-discovery.ts`
- `lib/workflows/enrichment.ts`
- `lib/workflows/scoring.ts`
- `lib/workflows/recovered-discovery.ts`
- `lib/crm/queries.ts`
- `app/campaigns/[campaign_id]/runs/[run_id]/page.tsx`
- `n8n/importable-json/WF-04 Routing.json`
- `n8n/importable-json/WF-05 Draft Generation.json`
- `n8n/workflows/WF-04-routing.md`
- `n8n/workflows/WF-05-draft-generation.md`
- `n8n/README.md`
- `n8n/IMPORT_CHECKLIST.md`
- `scripts/validate-workflow-contracts.mjs`
- `components/marketing/header.tsx`
- `components/marketing/hero.tsx`
- `app/api/workflows/discovery/process-recovered/route.ts`
- `lib/workflows/recovered-discovery.ts`
- `status.md`

## Current blocker
- Production migration application, n8n import, and authenticated fresh-campaign verification remain manual. WF-06 must remain disabled.

## Validation status
- lint: passed (`npm run lint`) after recovered discovery behavior alignment
- typecheck: passed (`npm run typecheck`)
- git diff check: passed (`git diff --check`) with Windows LF-to-CRLF warnings only
- build: passed (`npm run build`); Next.js still warns that the `middleware` file convention is deprecated in favor of `proxy`
- tests: passed (`npm test`, 10 files / 33 tests)
- workflow contracts: passed (`npm run validate:workflows`, 12 importable JSON files)
- Graphify: refreshed through the required clean temp mirror and exported to Obsidian (`1,122` nodes, `2,707` edges)
- Supabase SQL execution lint: not run; Supabase CLI is not installed on this workspace PATH

## Known risks
- Recovery processing calls live crawl and DeepSeek dependencies when `dry_run` is false.
- Repeated recovery invocations are idempotent against persisted enrichment and scoring rows; migration `014` adds a same-run lease to reject concurrent recovery batches.
- `review_pending` recovery is opt-in through `include_review_pending: true`; default batches select only `new` and `enriched` leads.
- Migration `014_issue_52_pipeline_hardening.sql` has not been applied to production from this local session.
- Updated WF-04/WF-05 JSON exports are inactive by default and must be imported deliberately after the migration is applied.

## Next step
- Apply migration `014_issue_52_pipeline_hardening.sql`, import inactive WF-04/WF-05 exports, keep WF-06 disabled, and run one fresh small campaign through WF-05 plus idempotent reruns.
