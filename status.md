# Project Status

## Current branch
- `codex/pass-6-production-readiness`

## Current task
- Process manually recovered discovery leads through backend WF-02 enrichment and WF-03 scoring only.

## Last completed work
- Manual SQL recovery promoted 35 leads for discovery run `393b508a-7c50-4f0b-a2d5-4887e5190bca`.
- Added a temporary authenticated backend recovery endpoint to enrich and score recovered leads idempotently in bounded batches.
- WF-04 remains n8n-owned; the recovery endpoint does not route leads or create n8n triggers for enrichment/scoring.

## Files changed recently
- `app/api/workflows/discovery/process-recovered/route.ts`
- `lib/workflows/recovered-discovery.ts`
- `status.md`

## Current blocker
- Production invocation and database result verification remain manual.

## Validation status
- lint: passed (`npm run lint`)
- typecheck: blocked by pre-existing untracked marketing component errors in `components/marketing/header.tsx` and `components/marketing/hero.tsx`; no error was reported for the recovery endpoint files
- Graphify: refreshed through the required clean temp mirror and exported to Obsidian (`1,107` nodes, `2,674` edges)

## Known risks
- Recovery processing calls live crawl and DeepSeek dependencies when `dry_run` is false.
- Repeated invocations are idempotent against persisted enrichment and scoring rows, but concurrent invocations should be avoided.

## Next step
- Invoke the recovery endpoint for run `393b508a-7c50-4f0b-a2d5-4887e5190bca` in batches and verify scored leads remain `status = 'scored'` for n8n WF-04 pickup.
