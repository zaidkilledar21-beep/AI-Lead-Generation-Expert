# Issue #52 Hotfix Follow-up (post PR #53)

## Objective

Patch only the remaining hardening gaps found while reviewing PR #53. Do not redo the
Issue #52 implementation. Keep changes minimal, scoped, non-destructive, and WF-06 disabled.

## Gaps addressed

1. `wf04_scored_leads` could still surface scored leads that already have a pending manual
   review, an existing outreach_queue row, or an existing draft — re-processing them into
   duplicate routing work.
2. `wf05_due_queue_items.wf05_action` priority was wrong: `block_missing_email` could win
   before existing draft / manual-review checks.
3. `queue_manual_review_item` overwrote an existing pending review reason/priority instead of
   preserving it.
4. `email_drafts (lead_id, sequence_id, step_number)` uniqueness (the `persist_draft_or_block`
   ON CONFLICT target) needed a committed/idempotent backstop.
5. `scoreLead` existing-score path could regress already routed/drafted/replied/closed leads
   back to `scored`.
6. Tests/validation should cover these exact cases.

## Implementation

### Migration `015_issue_52_hotfix_followup.sql` (additive `create or replace` only)

- Rebuild `wf04_scored_leads` to exclude leads with a pending `manual_review_queue` row, an
  existing `outreach_queue` row, or any existing `email_drafts` row.
- Rebuild `wf05_due_queue_items` with the required `wf05_action` priority:
  `block_missing_lead` → `skip_existing_draft` → `skip_existing_manual_review` →
  `block_missing_email` → `block_invalid_lead_status` → `generate_draft`.
- Rebuild `queue_manual_review_item` to preserve an existing pending review by default. Add a
  4-arg overload with an explicit `p_force boolean default false` to allow intentional
  replacement. The 3-arg signature is kept (delegates with `force => false`) so existing
  callers and the contract signature are unchanged. Duplicate protection (partial unique index
  `manual_review_one_pending_per_lead_idx`) is preserved and relied upon.
- Add `create unique index if not exists email_drafts_lead_sequence_step_uidx` as an
  idempotent backstop for the `persist_draft_or_block` ON CONFLICT target, with a manual
  duplicate-inspection comment (no destructive cleanup).
- Document that `outreach_queue` already has `unique (lead_id, sequence_id)` (001), the
  equivalent active-queue uniqueness; no new constraint is added.
- Re-grant the new overload to `service_role` only.

### `lib/workflows/scoring.ts`

- Only set `status = 'scored'` on the existing-score and concurrent-score early-return paths
  when the current lead status is pre-routing (`new`, `enriched`, `review_pending`, `scored`).
  Never regress `queued`, `drafted`, `pending_approval`, `in_sequence`, `replied_*`,
  `closed_*`, `archived`, `unsubscribed`, `bounced`, `blocked`, etc.

### Validation / tests

- `scripts/validate-workflow-contracts.mjs`: assert the new `wf05_action` ordering, the
  `wf04_scored_leads` exclusions, the `queue_manual_review_item` force/preserve contract, and
  the `email_drafts` uniqueness backstop, reading migration `015` text so ordering checks are
  unambiguous.
- `tests/unit/scoring.test.ts`: verify `scoreLead` does not regress routed/drafted/replied/
  closed statuses to `scored`, and does promote a pre-routing lead.
- `supabase/validation/pass_6_contract_checks.sql`: register the new 4-arg overload signature.

## Non-goals

- No WF-06 changes, no sending behavior changes, no destructive migrations, no broad refactors.

## Final status

- Implemented locally. All five gaps patched with minimal, additive, non-destructive changes.
- Changed files: `supabase/migrations/015_issue_52_hotfix_followup.sql` (new),
  `lib/workflows/scoring.ts`, `scripts/validate-workflow-contracts.mjs`,
  `supabase/validation/pass_6_contract_checks.sql`, `tests/unit/scoring.test.ts` (new),
  `plans/issue-52-hotfix-followup.md` (new), `status.md`.
- n8n importable JSON unchanged (no view/RPC column or action-name contract change).
- Validation passed locally: `npm run lint`, `npm run typecheck`, `npm test` (35 tests),
  `npm run validate:workflows`, `npm run build`, `git diff --check` (LF→CRLF warnings only).

## How to apply migration 015 to production

**Option A: Via `supabase db push` (preferred)**

```bash
# 1. Link the local repo to the remote Supabase project
supabase link --project-ref xizzrlisczijlgtfmpat

# 2. Authenticate when prompted in the browser

# 3. Push migrations 014 (if not yet applied) and 015
supabase db push

# 4. Verify contract signatures
supabase db execute --file supabase/validation/pass_6_contract_checks.sql
```

**Option B: Via direct SQL copy-paste (if CLI unavailable)**

1. Copy the entire content of `supabase/migrations/015_issue_52_hotfix_followup.sql`.
2. Open the Supabase dashboard SQL editor.
3. Paste and execute the migration.
4. Copy the entire content of `supabase/validation/pass_6_contract_checks.sql`.
5. Paste and execute the validation query; confirm no errors in the result set.

**⚠️ Important:** Migration `014_issue_52_pipeline_hardening.sql` was applied manually in production before this hotfix was written. The `db push` above will attempt to apply both `014` and `015` together — verify that `014` is already applied before pushing, or plan to apply both if it isn't.

## Remaining operational validation after migration

- Run one fresh small campaign through WF-04/WF-05 (WF-06 disabled).
- Confirm that scored leads with a pending manual review, existing queue, or existing draft are
  skipped by WF-04 (not re-routed).
- Confirm that WF-05 correctly prioritizes `skip_existing_draft` and `skip_existing_manual_review`
  before `block_missing_email`.
- Confirm that repeated runs do not duplicate leads, scores, evidence, queue rows, drafts, or
  manual reviews.

## Notes

- `outreach_queue` already enforces `unique (lead_id, sequence_id)` (001); no new active-queue
  constraint added to avoid a destructive change against possible historical duplicate rows.
- `email_drafts (lead_id, sequence_id, step_number)` has a table-level unique constraint (001) and
  an idempotent index backstop added by migration `015`.

---

# Holistic follow-up: RPC ambiguity + resumable backend worker (migration 016)

## Root causes

1. **Ambiguous `queue_manual_review_item` RPC.** Migration 015 added a 4-arg overload
   `queue_manual_review_item(uuid, text, text, boolean default false)` alongside the 3-arg
   `(uuid, text, text)`. For a 3-positional/`unknown`-literal call (route_scored_lead and the n8n
   WF-04 node both call it with string literals), Postgres could not choose between the two
   candidates and raised `function public.queue_manual_review_item(uuid, unknown, unknown) is not
   unique`, breaking WF-04 routing. A legacy 5-arg `(uuid, text, text, text, jsonb)` overload also
   shared the name (no live callers).
2. **Synchronous backend timeout.** WF-01/WF-02/WF-03 ran enrichment/scoring for all leads inside
   one request. On timeout the parent `discovery_runs` row stayed `running` with `completed_at =
   null` and leads stuck at `new`, requiring manual `/process-recovered` calls every morning.
3. **No automatic run finalization.** Manual recovery scored leads but never reconciled/finalized
   the parent run (status, candidates_promoted, completed_at, duration_seconds).

## Fixes (migration 016 + code)

- **A) One canonical RPC.** Drop both the 4-arg boolean and the legacy 5-arg overloads. Keep a
  single `queue_manual_review_item(uuid, text, text)` (preserve-by-default). Force behavior lives
  in a *differently named* `queue_manual_review_item_force(uuid, text, text)`. Both delegate to a
  private `queue_manual_review_item_sync(uuid, text, text, boolean)` impl (no name overloading).
  All four are `service_role`-only (also fixes a prior anon/authenticated grant drift on the 3-arg).
- **B) WF-04 stays idempotent.** `route_scored_lead` is unchanged (its 3-arg call now resolves to
  the single canonical RPC). `wf04_scored_leads` still excludes pending review / active queue /
  existing draft (migration 015). The n8n WF-04 node calls the same RPC name + params, so **no
  re-import is required**.
- **C) Bounded resumable worker.** New `POST /api/workflows/discovery/continue` →
  `continueDiscoveryProcessing()`. Finds `running` runs (indexed, limited), processes a small
  bounded batch per run, skips already-enriched/scored leads, uses per-run recovery leases, stops
  before the serverless timeout via a runtime guard, and returns `runs_seen, runs_processed,
  leads_processed, enriched, scored, failed, finalized`. Reuses the existing per-lead logic
  (`processLead`, lease helpers) — no duplicated business logic. Safe to call repeatedly by Vercel
  Cron or a lightweight n8n scheduler; n8n does NOT own WF-02/WF-03 logic.
- **D) Automatic finalization.** When no processable leads remain for a run, the worker calls
  `sync_run_review_pending(run_id)` (scored leads with a pending review → `review_pending`, never
  overriding terminal/replied/archived) then reuses the canonical `safeFinalizeDiscoveryRun` to
  reconcile counts and write `status='completed'` (DB constraint allows only running/completed/
  failed/quota_exhausted/paused — `completed_with_warnings` is NOT used), `candidates_promoted`,
  `completed_at`, `duration_seconds`. Emits `recovery_batch_started`, `recovery_batch_completed`,
  `run_finalized` (via the finalizer), and `awaiting_wf04`. Backend never triggers WF-04.
- **E) Run-detail status accuracy.** `userRunStatus`/`isStaleRunningRun` now consider the latest
  workflow-event time and any active recovery lease. A run is only "Stuck" with no progress past
  the stale threshold AND no active lease/recent event. New states: "Processing discovery",
  "Processing enrichment & scoring", "Backend complete: awaiting WF-04 routing", "Completed",
  "Failed". `statusTone` maps the new labels.

## Validation (run against production via MCP)

```sql
-- A) exactly one canonical RPC (expected: 1)
select proname, count(*) from pg_proc
where pronamespace='public'::regnamespace and proname='queue_manual_review_item' group by proname;

-- B) the previously failing unknown-literal resolution now plans cleanly (where false = no execution)
select public.queue_manual_review_item(null::uuid, 'ambiguity_probe', 'normal') where false;

-- grants: every manual-review RPC + worker helper is service_role only
select p.oid::regprocedure,
       has_function_privilege('service_role',p.oid,'execute') svc,
       has_function_privilege('authenticated',p.oid,'execute') auth,
       has_function_privilege('anon',p.oid,'execute') anon
from pg_proc p where p.pronamespace='public'::regnamespace
  and p.proname in ('queue_manual_review_item','queue_manual_review_item_sync',
                    'queue_manual_review_item_force','sync_run_review_pending');

-- run the full contract validation
\i supabase/validation/pass_6_contract_checks.sql
```

Migration `016` was applied to production via Supabase MCP and all of the above returned the
expected results (count=1, clean resolution, all four functions service_role-only, no missing
required functions).

## Remaining operational steps

- Schedule `POST /api/workflows/discovery/continue` (Vercel Cron or a lightweight n8n scheduler,
  e.g. every 2–5 min) with the `x-n8n-api-key`/Bearer workflow auth header. Body is optional:
  `{ "limit": 5, "max_runs": 5, "max_runtime_ms": 240000 }`.
- Re-run one fresh small campaign and confirm: parent run auto-finalizes (no manual recovery),
  WF-04 routes without the ambiguity error, and the run detail shows "Awaiting WF-04 routing"
  rather than "Stuck".
