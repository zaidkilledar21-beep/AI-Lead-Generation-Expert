# Phase 4: Frontend Run Visibility and Production QA Support

## Goal

Make the frontend reflect actual production state without forcing the operator to query Supabase constantly.

## Files to inspect first

- `app/campaigns/page.tsx`
- `app/campaigns/actions.ts`
- `app/campaigns/run-now-button.tsx`
- `app/campaigns/[campaign_id]/campaign-detail-controls.tsx`
- `lib/crm/queries.ts`
- `lib/app/campaigns.ts`
- `supabase/migrations/007_crm_prd_compatibility.sql`
- `status.md`

## Problems to fix

### 1. Campaign run log is too thin

Current `campaign_run_log` view uses `discovery_runs` only and exposes limited counts.

Improve it to include:
- status,
- started/completed,
- last checkpoint,
- candidate count,
- lead count,
- manual review count,
- rejected count,
- crawl failure count,
- first error,
- duration,
- stale running flag.

If schema is not enough, use `workflow_events` rollups.

### 2. Frontend should show stale/running truthfully

Run Now UI should display:
- requested,
- running,
- completed,
- failed,
- quota blocked,
- stale-running/recovering.

Do not show eternal spinner without counts.

### 3. Add run detail timeline

On campaign detail page, show latest run checkpoints from `workflow_events`:
- event type,
- status,
- error message,
- timestamp,
- compact payload summary.

This can be read-only.

### 4. Add refresh strategy

After Run Now:
- optimistic state: `requested`.
- poll or refresh server action for latest run summary for a limited duration.
- stop polling after terminal state or sane timeout.
- show "still running" with last checkpoint if not terminal.

No infinite client-side scans.

### 5. Production QA checklist

Add/update a smoke test checklist in `plans/` or `docs/`:
- create fresh campaign,
- run now,
- confirm discovery_runs terminal,
- confirm lead_candidates count,
- confirm leads count,
- confirm lead_enrichment count,
- confirm lead_scores count,
- confirm manual_review/outreach_queue rows,
- confirm frontend counts match SQL.

## Acceptance criteria

- Frontend run status matches DB.
- Counts appear while/after run.
- Failed runs show the real failure stage.
- Operator can inspect latest run without Supabase SQL.
- No infinite polling loop.
