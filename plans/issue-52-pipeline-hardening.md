# Issue #52 Pipeline Hardening

## Objective

Permanently harden the first live outreach campaign path through backend WF-01/WF-02/WF-03, n8n WF-04 routing, and n8n WF-05 draft generation without enabling WF-06 sending.

## Architecture Contract

- WF-01 discovery promotion, WF-02 enrichment, and WF-03 scoring remain backend-owned.
- n8n starts at WF-04 routing.
- WF-05 generates and validates drafts only.
- WF-06 sending remains inactive and out of scope.

## Required Context

- `AGENTS.md`
- `status.md`
- GitHub Issue #52 and its comments
- `lib/workflows/lead-discovery.ts`
- `lib/workflows/enrichment.ts`
- `lib/workflows/scoring.ts`
- `lib/workflows/recovered-discovery.ts`
- `n8n/workflows/WF-04-routing.md`
- `n8n/workflows/WF-05-draft-generation.md`
- `n8n/importable-json/WF-04 Routing.json`
- `n8n/importable-json/WF-05 Draft Generation.json`
- relevant Supabase migrations

## Stages

### Stage 1: Backend discovery promotion and finalization

- Reload persisted promotable candidates from `lead_candidates`.
- Promote DB-backed candidates before normal finalization.
- Promote and process DB-backed candidates during stale-run recovery.
- Preserve DB reconciliation and terminal run writes.
- Do not route from backend discovery after scoring.

### Stage 2: Backend idempotency and recovery safety

- Skip completed enrichment unless explicitly reprocessed later.
- Skip existing scoring output unless explicitly reprocessed later.
- Add DB uniqueness constraints where missing.
- Add a same-run recovery lease for the temporary recovery endpoint.

### Stage 3: WF-04 routing source safety

- Add a safe scored-lead source view.
- Keep routing/manual-review RPC writes idempotent.
- Update the importable WF-04 source to the safe view.

### Stage 4: WF-05 draft source safety

- Add `wf05_due_queue_items`.
- Classify each due row with `wf05_action`.
- Add an idempotent action-sync RPC for non-generation branches.
- Update WF-05 to switch before context loading.
- Make Validate Draft process every input item.

### Stage 5: Operator safeguards and validation

- Verify run detail terminal/warning behavior against persisted state.
- Run lint, typecheck, build, workflow validation, focused tests where available, and `git diff --check`.
- Refresh Graphify through the clean temp mirror workflow.

## Non-Goals

- Do not enable or run WF-06.
- Do not move WF-02/WF-03 into n8n.
- Do not introduce client-side secrets, polling loops, or broad UI refactors.

## Final Status

- Implemented locally.
- Backend promotion reloads persisted `details_fetched` candidates and stale-run recovery resumes DB-backed promotion plus unscored lead processing.
- Backend discovery stops after WF-03 scoring; n8n owns WF-04 routing.
- Enrichment and scoring skip persisted completed work; scoring handles a concurrent unique-winner safely.
- Migration `014_issue_52_pipeline_hardening.sql` adds recovery leases, idempotent pending-review reuse, WF-04/WF-05 safe views, WF-05 action sync, and score/evidence uniqueness protection.
- WF-04 and WF-05 importable exports use the safe views and remain inactive by default.
- WF-05 switches before context loading and validates all DeepSeek output items.
- Run detail recognizes persisted terminal completion and surfaces missing-email queue blocks separately.

## Validation Completed

- `npm run lint`
- `npm run typecheck`
- `npm test`
- `npm run validate:workflows`
- `npm run build`
- `git diff --check`
- Graphify clean-mirror refresh/export (`1,122` nodes, `2,707` edges)

## Remaining Manual Production Checks

- Apply migration `014_issue_52_pipeline_hardening.sql`.
- Run the SQL contract validation after migration application; local Supabase CLI lint could not run because the CLI is not installed in this workspace.
- Import the inactive WF-04 and WF-05 JSON exports into n8n and verify credentials remain configured outside source control.
- Run one fresh small campaign through WF-05 with WF-06 disabled.
- Verify repeat runs do not duplicate leads, scores, evidence, queue rows, drafts, or pending manual reviews.
