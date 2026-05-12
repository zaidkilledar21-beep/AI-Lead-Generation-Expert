# Campaigns UI Overhaul Plan

## 1. Objective
- Turn Campaigns into a premium operational control center for lead discovery, not a flat settings table.
- Make the list, create flow, and detail view feel clearer, more status-aware, and faster to scan while preserving every existing action and backend contract.

## 2. Design References Used
- Linear: for workflow clarity, status-first hierarchy, compact operational surfaces, and premium dark control states.
- Stripe: for readiness framing, form grouping, trust-oriented summary cards, and polished status/readiness indicators.
- Vercel: for restrained shell integration, crisp page framing, and minimal loading/error states.
- Notion: for information grouping, helper text, and dense-but-readable campaign detail/content organization.

## 3. Current UI Baseline Summary
- Campaigns already has the right primitives and backend behavior, but the surface reads more like a functional admin table than a discovery command center.
- The list view is dense, the create form is presentationally utilitarian, and the detail page can bury readiness and run context behind too many rows and controls.
- Empty/loading/error states are serviceable but not yet consistent enough to feel intentionally designed.
- The main opportunity is not more features; it is clearer hierarchy, stronger readiness cues, and faster visual scanning.

## 4. Highest-Value Upgrade Opportunities
- Reframe Campaigns list as an operational dashboard with status-first cards, readable readiness, and stronger action visibility.
- Restructure the create/edit flow into clearer sections with better helper text, validation framing, and readiness cues.
- Elevate campaign detail with a premium summary header, run history clarity, and better next-action hierarchy.
- Normalize status chips, quotas, and readiness indicators so every campaign surface speaks the same visual language.
- Upgrade loading/error/empty states so the workflow feels trustworthy even when data is missing or in flight.

## 5. Upgrade Ideas by Route / Workflow
- `app/campaigns/page.tsx`
  - Add a stronger header and summary strip that frames Campaigns as a discovery command center.
  - Rework list/filter chrome so active filters, readiness, and actions are easier to parse.
  - Replace dense row emphasis with clearer primary/secondary metadata, lighter card/tile weight, and stronger status badges.
  - Improve empty and filtered states with clearer next steps and an intentional CTA.

- `app/campaigns/new/page.tsx`
  - Make the page feel like a guided setup flow instead of a long form.
  - Group fields into clearly labeled sections with helper text that explains readiness, run behavior, and discovery impact.
  - Add stronger validation/readiness messaging so users understand what will happen when they submit.

- `app/campaigns/[campaign_id]/page.tsx`
  - Rebuild the detail header as a high-confidence summary with status, readiness, quota, next run, and last run.
  - Make campaign config, lead list, and run history easier to scan by separating summary, configuration, and operational history.
  - Give manual run and lifecycle actions a clearer hierarchy so the primary command is obvious.
  - Improve loading and error states so detail views feel premium during data fetches.

- `app/campaigns/[campaign_id]/campaign-detail-controls.tsx`
  - Tighten control grouping and status/action prioritization.
  - Reduce visual noise around destructive and secondary actions while preserving behavior.

- `app/campaigns/create-campaign-form.tsx` and `app/campaigns/edit-campaign-form.tsx`
  - Refine field grouping, section headers, and helper text for setup clarity.
  - Make readiness and validation cues more visible without adding new logic.

## 6. Recommended Design Reference Per Idea
- Campaign list hierarchy: Linear, with Stripe-like trust polish for status and quota indicators.
- Create/edit flow: Stripe, with Notion-like helper text and section grouping.
- Campaign detail summary and actions: Linear + Stripe, with Vercel restraint on shell chrome.
- Run history and operational context: Notion for readable grouping, Linear for status cadence.
- Loading/error/empty states: Vercel for minimal shell polish, Stripe for calm trust signals.

## 7. Impact vs Effort Scoring
- Campaign list dashboard treatment: impact 5 / effort 3
- Create/edit flow re-organization: impact 4 / effort 3
- Detail header + readiness framing: impact 5 / effort 3
- Run history and config grouping: impact 4 / effort 4
- Loading/error/empty state polish: impact 3 / effort 2

## 8. Suggested Implementation Phases
1. List view and shared campaign status/readiness language.
2. Create/edit form structure and helper/readiness cues.
3. Campaign detail header, summary, and action hierarchy.
4. Run history, config summary, and loading/error states.
5. Final responsive and contrast pass across the campaigns routes.

## 9. Files / Routes Likely Involved
- `app/campaigns/page.tsx`
- `app/campaigns/new/page.tsx`
- `app/campaigns/[campaign_id]/page.tsx`
- `app/campaigns/[campaign_id]/campaign-detail-controls.tsx`
- `app/campaigns/create-campaign-form.tsx`
- `app/campaigns/edit-campaign-form.tsx`
- `app/campaigns/select-options.ts`
- `app/campaigns/[campaign_id]/import/import-form.tsx` if the import surface shares campaign setup chrome
- `app/globals.css` only if a tiny shared surface adjustment is clearly necessary

## 10. Risks and Anti-Regression Checks
- Preserve all campaign actions, lifecycle controls, and manual run behavior.
- Do not change backend contracts, n8n trigger behavior, or data-fetching logic.
- Keep the work visually focused so pipeline, inbox, review, analytics, and settings are not pulled into the campaign pass.
- Avoid introducing a parallel component system; prefer tightening existing campaign primitives and shared UI classes.
- Watch for layout regressions in dense tables, responsive filter rows, and sticky action areas.

## 11. Validation Plan
- Run `npm run lint`.
- Run `npm run typecheck`.
- Run `npm run build` if the environment allows it.
- If build hits the known Windows `spawn EPERM` issue, report it clearly and treat lint/typecheck as the authoritative checks for this pass.

## 12. Recommended First Upgrade PR
- Start with `app/campaigns/page.tsx` and the shared campaign list/detail controls that feed it.
- The first PR should make Campaigns feel like a dashboard: stronger header, clearer readiness/status, better filter ergonomics, and a more intentional empty state.
