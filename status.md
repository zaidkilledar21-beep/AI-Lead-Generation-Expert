# Project Status

## Project
AI Automation CRM / Lead Generation Dashboard

## Current branch
`codex/pass-6-production-readiness`

## Current task
- Discovery run lifecycle hardening and Run Now feedback fix.

## Current module / PR
- Campaign manual discovery run path.

## Last completed work
- Completed the follow-up discovery diagnostics audit on the current diff without reworking the discovery architecture.
- Added the missing `execute_search_completed`, `import_started`, `import_completed`, `enrichment_scoring_started`, `enrichment_scoring_completed`, `promotion_completed`, and `finalize_failed` workflow event checkpoints.
- Promotion/import/enrichment/finalization is now diagnosable from compact aggregate workflow event payloads: run id, campaign id, candidate/promotable/created/duplicate/enriched/scored/error counts, query counts, and stats summaries only.
- Added an explicit zero-lead promotion failure path: if fetched promotable candidates exist but no leads are created, the run finalizes as `failed` with `No leads promoted from X fetched candidates`.
- Confirmed finalization update errors are checked; a failed update now logs `finalize_failed` and does not log `finalize_completed`.
- Added safe discovery lifecycle checkpoint workflow events to identify where a run stops after `discovery_runs` insertion.
- Checkpoints now cover campaign load, run quota reservation, run insertion, query building, query loop start, query quota reservation, search-query upsert, Google Text Search start/completion, place processing start, promotion start, finalization start, and finalization completion.
- Checkpoint payloads are compact and safe: run id, query counts/indexes, max-120-character query previews, places count, and stats summaries only.
- Hardened `runLeadDiscovery` so a discovery run inserted as `running` is finalized as `failed` with counters and `completed_at` if any post-insert processing error occurs.
- Added checked discovery run finalization, explicit failed-run workflow events, zero-query failure handling, Google Places request timeouts, and compact Google Places response-body error messages without logging secrets.
- Updated Run Now server action feedback to distinguish requested/running/success, quota blocked, config missing, and failed states while preserving existing quota behavior.
- Added campaign card Run Now inline pending/result feedback and surfaced latest run status/date/error from a bounded latest-runs query.
- Updated campaign detail manual-run controls to show returned manual-run feedback.
- Verified the Create Campaign wizard payload against `app/campaigns/actions.ts`, `lib/app/campaigns.ts`, and `lib/contracts.ts`; all required, list, boolean, numeric, optional, and defaulted fields align with the server action parser.
- Confirmed the final `Save Campaign` submit path calls the existing `createCampaign` server action via the complete state-built `FormData` payload.
- Ran a minimal Playwright browser probe against `/campaigns/new`; unauthenticated access redirects to `/login?next=%2Fcampaigns%2Fnew`, so real campaign creation remains a manual authenticated QA step.
- Found no confirmed blocking issue in campaign creation/persistence during static contract review and unauthenticated browser probing.
- Fixed the Create New Campaign wizard so field values are stored in local controlled state across step navigation.
- Replaced mounted-DOM `FormData` step validation with state-based step validation and final review validation.
- Final campaign save now builds a complete `FormData` payload from wizard state, including CSV/list text fields, numeric strings, and explicit boolean `on`/`off` values expected by `createCampaign`.
- Preserved existing wizard styling/layout and kept the final button label as `Save Campaign`.
- Reduced remaining Sonar duplication risk in `components/crm/analytics-charts.tsx` by extracting shared vertical performance chart rendering for niche and country bars without changing chart data, colors, labels, layout, or behavior.
- Ran a localized duplication proxy against `components/crm/analytics-charts.tsx`; it reported 0.00% duplicated six-line blocks, below the requested sub-3% threshold.
- Created `plans/analytics-ui-overhaul.md` for the scoped analytics UI pass.
- Reworked `/analytics` into a premium founder intelligence dashboard with an executive KPI strip, clearer range/export controls, decision-support cards, improved chart composition, denser campaign performance scanning, and stronger sparse-data messaging.
- Polished analytics chart components with consistent chart heights, cleaner grid/cursor styling, improved empty states, and a more efficient daily rollup aggregation.
- Tightened analytics filters and diagnostics into compact operator-style control/telemetry surfaces.
- Refreshed `graphify-out/graph.json` and `graphify-out/GRAPH_REPORT.md` with the current codebase state via `graphify update .`.
- Re-exported `docs/obsidian-vault/10_Graphify/` from the refreshed graph with `scripts/export_graphify_to_obsidian.py`.
- Confirmed the updated graph and Obsidian layer capture the shared shell, campaigns, inbox, and review route/component relationships.
- Tightened the Inbox and Review Queue layout geometry: header controls now live inside the shared triage summary shell, inbox/review panels stretch more evenly, review queue metadata cards are balanced, and the inbox timeline is denser with clearer anchoring.
- Extracted a shared `TriageSummaryHeader` component for the Inbox and Review route hero/stat blocks to remove Sonar-flagged duplication without changing UX or behavior.
- Materially overhauled the Inbox and Review Queue experience with a premium control-center header, clearer filter/tabs hierarchy, more expressive triage cards, stronger reply/workspace context, and premium empty states.
- Materially overhauled the Campaigns experience with a premium discovery-control hero, saved-view quick filters, card-based roster scanning, a higher-clarity detail workspace, stronger readiness framing, and Campaigns-only loading/error shells.
- Materially overhauled the CRM Lead Detail UI/UX, introducing a high-impact "Lead Hero" summary, re-grouping dense information into clearer "Identity & Profile" and "Scoring & Hypothesis" sections, and refining the timeline into a premium activity feed.
- Refined the Sticky Action Bar and Draft Review Editor for better hierarchy, clarity, and enterprise-grade polish (inspired by Notion, Linear, and Stripe).
- Resolved Sonar quality gate issues by refactoring the Lead Detail page into modular sub-components, reducing cognitive complexity and eliminating nested ternaries.
- Fixed a redundant conditional CSS class in the Draft Review Editor.
- Normalized typography and spacing across the Lead Detail route to improve scanning speed and operational confidence.
- Applied a visible pipeline redesign that introduced a Linear-inspired hero/control surface, segmented list/board switcher, stronger filter hierarchy, premium saved-view UX, and cleaner board/list scanning surfaces.
- Normalized the shared CRM visual layer in `app/globals.css` so panels, cards, buttons, badges, inputs, tables, empty states, score bars, and detail grids share one dark surface language.
- Removed the redundant root font override from `app/layout.tsx` so the CSS-defined typography baseline is consistent.
- Tightened the CRM shell, score visualizer, tooltip, and progress bar primitives to reduce visual drift.
- Added global `app/loading.tsx` and `app/error.tsx` fallback shells for cleaner loading/error states.
- Applied a focused route-level polish pass to pipeline, campaigns, lead detail, inbox, review, analytics, and settings diagnostics so the remaining bespoke surfaces now lean on shared CRM cards and empty-state styling.
- Completed a read-only discovery pass for the next CRM UI upgrades and refreshed `plans/frontend-ui-upgrade-opportunities.md` with design-reference-backed implementation opportunities.
- Created `plans/global-shell-ui-overhaul.md` to scope a visible premium upgrade for the app layout, CRM shell, loading state, and error state.
- Implemented a visibly stronger global shell pass with a premium sidebar, clearer top bar hierarchy, more deliberate operational status framing, and upgraded loading/error shells.

## Files changed recently
- `lib/workflows/lead-discovery.ts`
- `app/campaigns/actions.ts`
- `app/campaigns/page.tsx`
- `app/campaigns/run-now-button.tsx`
- `app/campaigns/[campaign_id]/campaign-detail-controls.tsx`
- `lib/crm/queries.ts`
- `status.md`
- `app/campaigns/create-campaign-form.tsx`
- `status.md`
- `components/crm/analytics-charts.tsx`
- `status.md`
- `plans/analytics-ui-overhaul.md`
- `app/analytics/page.tsx`
- `components/crm/analytics-charts.tsx`
- `components/crm/analytics-filters.tsx`
- `components/crm/analytics-diagnostics-panel.tsx`
- `status.md`
- `graphify-out/graph.json`
- `graphify-out/GRAPH_REPORT.md`
- `docs/obsidian-vault/10_Graphify/Graphify Index.md`
- `plans/inbox-review-layout-polish.md`
- `components/crm/triage/triage-summary-header.tsx`
- `plans/inbox-review-duplication-fix.md`
- `plans/inbox-review-ui-overhaul.md`
- `app/inbox/page.tsx`
- `app/review/page.tsx`
- `components/crm/inbox-view.tsx`
- `components/crm/review-board.tsx`
- `components/crm/draft-review-editor.tsx`
- `status.md`

## Current blocker
- Browser QA for the authenticated `/analytics` view is blocked by the login gate without a test session.

## Validation status
- lint: passed (`npm run lint`)
- typecheck: passed (`npm run typecheck`)
- build: passed (`npm run build`)
- git diff check: passed (`git diff --check`) with Windows LF-to-CRLF warnings only
- discovery follow-up diagnostics audit: passed; missing search/promotion/finalization checkpoints added
- discovery lifecycle diagnostics: added checkpoint workflow_events for the zombie run investigation
- discovery hardening validation: passed lint/typecheck/build/diff-check after changes
- browser/e2e QA: automated unauthenticated Playwright probe reached `/login?next=%2Fcampaigns%2Fnew`; authenticated campaign creation must be manual
- manual campaign wizard QA: pending authenticated session
- localized duplication check: passed, 0.00% duplicated six-line blocks in `components/crm/analytics-charts.tsx`
- tests: not run in this pass
- Playwright browser check: reached `/login?next=%2Fanalytics` at desktop and tablet widths because `/analytics` requires authentication; login redirect had no horizontal overflow
- Playwright setup: installed the missing Chromium browser binary with `npx playwright install chromium`
- Graphify update/export: not run after this analytics UI change
- Graphify CLI now runs from `.venv-graphify\\Scripts\\graphify.exe`; `graphify watch` skipped HTML viz because the graph is over the default node limit

## Known risks
- Production issue under investigation: run `87d51a76-bd77-45be-8c16-8fbcbe576260` stayed `running` with zero counters and no completion event after `/api/workflows/discovery/run` returned 200; next run should reveal the stopping checkpoint.
- Manual production retest is still required with a fresh campaign or after the daily quota resets to confirm Vercel/n8n/Google Places behavior against live services.
- The next production test must confirm whether the run reaches `promotion_completed`, then `finalize_started`, then `finalize_completed`; if it stops earlier, the last checkpoint should identify the failing stage.
- Existing stuck `discovery_runs` rows are not backfilled by this code-only patch.
- No remaining confirmed campaign creation blocker from Phase 02, but campaign creation should still be manually checked in an authenticated browser session to confirm database creation and review payload values end to end.
- The authenticated analytics layout still needs a browser pass with a valid dashboard session to visually confirm real data density and chart/table alignment.
- The CRM still has several dense operational surfaces that should be improved incrementally rather than with a broad redesign.
- Graphify HTML visualization remains skipped because the graph exceeds the default visualization node limit.

## Next step
- Retest Run Now with a brand-new campaign or after quota reset: confirm the UI shows requested/running or a quota/config/error message, then inspect `workflow_events` in chronological order for `execute_search_completed`, `promotion_started`, `import_started`, `import_completed`, `enrichment_scoring_started`, `enrichment_scoring_completed`, `promotion_completed`, `finalize_started`, and `finalize_completed` or `finalize_failed`.
- After the retest, confirm the latest `discovery_runs` row has non-running `status`, populated `completed_at`, expected counters, and a clear `error_message` if no leads were promoted.
