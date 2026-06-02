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
