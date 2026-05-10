# Project Status

## Project
AI Automation CRM / Lead Generation Dashboard

## Current branch
`codex/pass-6-production-readiness`

## Current task
- Frontend-only visual polish pass for pipeline, inbox, and review queue surfaces.

## Current module / PR
- Frontend Visual Polish Plan.
- Supabase SSR auth/session hardening remains on the branch.

## Last completed work
- Improved metric card contrast and added clickable metric-card affordances.
- Made the pipeline action-required summary link to pending-action leads.
- Polished saved-view layout, reply cards, and review/lead cards.
- Converted review queue item cards to keyboard-accessible buttons.
- Preserved backend, schema, auth, n8n, and sending behavior.

## Files changed recently
- `components/ui/metric-card.tsx`
- `app/pipeline/page.tsx`
- `app/globals.css`
- `components/crm/inbox-view.tsx`
- `components/crm/review-board.tsx`
- `status.md`

## Current blocker
- Manual authenticated UI smoke could not fully inspect protected pages without a dashboard session; unauthenticated probes correctly redirected to `/login`.

## Validation status
- lint: passed
- typecheck: passed
- tests: passed
- build: passed
- static analysis / Sonar: no repo-local Sonar script is configured; targeted scans found no new unsafe regex, polling loops, `dangerouslySetInnerHTML`, or client-side secrets from this polish pass

## Known risks
- Avoid duplicated handlers/helpers.
- Avoid unsafe regex from user input.
- Avoid unbounded client-side filtering or scans.
- Avoid exposing secrets client-side.
- Avoid direct reply sending unless explicitly implemented and approved.
- Preserve Supabase RLS and dashboard_users authorization.

## Next step
- Perform authenticated browser smoke review after a dashboard session is available, then merge or report any visual regressions.
