# Outreach Production Readiness Gap Plan

## Objective

Make the current outreach implementation work end-to-end without changing the intended product flow:

Campaign → Run Now / n8n WF-10 → Google Places discovery → candidate persistence → website crawl/contact extraction → lead import → enrichment → scoring → routing → review/queue/draft → controlled sending.

Do not replace the current architecture with a new product flow. Fix the existing flow so it is state-aware, resumable/reconcilable, observable, and safe enough to generate real leads in production.

## Current diagnosis

The current production behavior shows that discovery can create candidate records and mark some as `promoted`, but the `discovery_runs` row remains `running` with zeroed counters and no terminal `completed_at`. The frontend therefore has no trustworthy run status or counts to display.

The app currently runs the discovery workflow synchronously from `POST /api/workflows/discovery/run`, with `maxDuration = 300`. This means a long crawl, import, enrichment, scoring, DeepSeek call, or DB update can leave a half-mutated run if the function exits, times out, or throws before finalization.

Key code areas:

- `app/api/workflows/discovery/run/route.ts`
- `lib/workflows/lead-discovery.ts`
- `lib/workflows/discovery.ts`
- `lib/workflows/enrichment.ts`
- `lib/workflows/scoring.ts`
- `lib/workflows/routing.ts`
- `lib/workflows/website-crawler.ts`
- `lib/deepseek.ts`
- `lib/crm/queries.ts`
- `app/campaigns/run-now-button.tsx`
- `app/campaigns/actions.ts`
- `app/campaigns/page.tsx`
- `app/campaigns/[campaign_id]/campaign-detail-controls.tsx`
- `supabase/migrations/*`

## Non-negotiables

1. Do not lose discovered candidates.
2. Do not delete or reset existing production data.
3. Do not increase paid API risk.
4. Keep Google Places Text Search IDs-only.
5. Keep Places Details field mask restricted to approved Essentials fields.
6. Keep discovery caps enforced.
7. Keep global outreach pause respected for actual sending.
8. Do not silently swallow terminal workflow errors.
9. Do not leave runs permanently stuck in `running`.
10. Update `status.md` before final response.

## Phase order

1. Discovery lifecycle state safety and reconciliation.
2. Contact extraction, email validation, and enrichment correctness.
3. Scoring, routing, queueing, and draft handoff reliability.
4. Frontend run visibility and production QA support.

## Success definition

A fresh production campaign run should produce:

- A terminal `discovery_runs.status`.
- Non-zero counts matching actual persisted candidates/leads.
- `workflow_events` checkpoint trail through finalization or clear failure.
- Candidates preserved even if later enrichment/scoring fails.
- Leads created for valid promotable candidates.
- Emails extracted only when valid.
- Scored leads routed into manual review or outreach queue.
- Frontend showing run status, counts, and failure reason without needing SQL spelunking.
