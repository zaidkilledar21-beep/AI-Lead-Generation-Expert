# Frontend UI Upgrade Opportunities

## 1. Objective

Identify the next small, high-value CRM frontend upgrades that make the product feel more coherent, premium, and easier to operate without changing behavior.

This pass is discovery-only:
- preserve the existing dark UI direction
- reduce route-level drift from the shared surface system
- improve first impression, clarity, and operational confidence
- favor small PRs over any broad redesign

## 2. Design References Used

Selected references from `docs/design-systems/`:

- [Linear](../docs/design-systems/linear/design.md)
  - best for workflow clarity, pipeline/task states, compact productivity UI, review queues, and status-heavy interfaces
  - strongest fit for pipeline, review queue, lead lifecycle, and inbox status handling
- [Stripe](../docs/design-systems/stripe/design.md)
  - best for trustworthy SaaS hierarchy, forms, settings, analytics, empty states, and enterprise polish
  - strongest fit for campaigns, settings, analytics, empty states, and diagnostics
- [Vercel](../docs/design-systems/vercel/design.md)
  - best for minimal dark UI, clean shell, developer-tool polish, and restrained visual hierarchy
  - strongest fit for the global shell, navigation, page headers, and loading/error states
- [Notion](../docs/design-systems/notion/design.md)
  - best for warm minimalism and dense, content-first information architecture
  - strongest fit for lead detail and other information-dense screens

Secondary inspiration used in the plan:
- shadcn/ui patterns for clear, reusable UI primitives
- Magic UI only for small state/microinteraction polish where it supports clarity

## 3. Current UI Baseline Summary

The CRM is already past the "multiple unrelated pages" stage, but the experience still reads as a set of adjacent operational screens rather than one unified product.

Current strengths:
- the shared dark direction is established
- the shell, button, badge, select, metric, and score primitives already exist
- pipeline, inbox, review, analytics, and settings all have working routes

Current drift:
- dense route pages still rely on bespoke card, toolbar, and helper-text treatments
- empty/loading/error states are not uniformly treated as first-class surfaces
- campaigns and lead detail still feel denser and less organized than the shared shell suggests
- analytics/settings diagnostics are functional but visually inconsistent with the cleaner shared surface language
- onboarding/first-use and global shell/navigation still need a stronger first impression

## 4. Highest-Value Upgrade Opportunities

1. Pipeline clarity and saved-view/filter polish.
2. Lead detail density, sticky action bar, and timeline/reply surface cleanup.
3. Campaign hierarchy and form spacing.
4. Inbox/review card and status unification.
5. Analytics/settings low-data and diagnostics readability.
6. Global shell/navigation and first-use/readiness polish.

## 5. Upgrade Ideas by Route / Workflow

### Pipeline

Upgrade idea:
- Make the filter shell, saved views, board/list toggle, and empty states feel like one coherent control group.
- Reduce the visual weight of board and list cards so the page scans faster.
- Clarify the "what should I do next?" moment when a pipeline is empty or filtered down.

Why it matters:
- pipeline is the everyday operational home for the CRM
- it is the best place to improve perceived product quality with a small, visible PR

### Lead Detail

Upgrade idea:
- Reduce density in the summary, timeline, draft, reply, and action surfaces.
- Rebalance the sticky action bar so the primary action is easier to see without overpowering the content.
- Use clearer section separation so the lead story reads top-to-bottom with less scanning friction.

Why it matters:
- lead detail is the most information-dense route in the CRM
- this screen strongly affects trust in the product's operational correctness

### Campaigns

Upgrade idea:
- Tighten the campaign list hierarchy and reduce action clutter.
- Give campaign detail more stable section rhythm for readiness, status, and action areas.
- Normalize create/edit form spacing so long forms feel intentional rather than stacked.

Why it matters:
- campaigns carry lifecycle, readiness, and manual-run confidence
- the current layout works, but it does not yet feel premium or deeply organized

### Inbox / Review

Upgrade idea:
- Unify inbox/review cards, action rows, and statuses around a single dense-card language.
- Improve empty, handled, and pending states so the surfaces feel calmer and easier to parse.
- Reduce the number of accent treatments used in one view.

Why it matters:
- these routes are workflow-critical and visually busy
- small hierarchy improvements pay off quickly for daily users

### Analytics / Settings

Upgrade idea:
- Make filters, diagnostics cards, and low-data states read like part of the same product family.
- Improve helper text hierarchy and empty chart states.
- Reduce the perception that diagnostics/settings are separate subsystems.

Why it matters:
- analytics and settings shape confidence in the system
- a calmer presentation makes the CRM feel more mature even without new features

### Global Shell / Onboarding

Upgrade idea:
- Tighten the perceived first impression in the app shell, home screen, login, and loading/error states.
- Make onboarding/first-use states more legible and less framework-like.
- Keep navigation and auth behavior unchanged while improving the visual handoff into the product.

Why it matters:
- first impressions influence perceived quality disproportionately
- improving shell and fallback states is low-risk and visible across the app

## 6. Recommended Design Reference Per Idea

| Idea | Recommended reference | Notes |
| --- | --- | --- |
| Pipeline filter/saved-view polish | Linear | Best for hierarchy, scannability, and daily-ops information architecture. |
| Lead detail density reduction | Notion | Best for content ordering and dense top-to-bottom reading. |
| Campaign detail/form cleanup | Stripe | Best for stable form rhythm, trust, and polished SaaS structure. |
| Inbox/review unification | Linear | Best for status-heavy workflow clarity and compact operational surfaces. |
| Analytics/settings diagnostics | Stripe | Best for premium form/analytics hierarchy and low-data readability. |
| Global shell and onboarding | Vercel | Best for restrained dark shell framing and loading/error polish. |

## 7. Impact vs Effort Scoring

Scale: impact 1-5, effort 1-5. Higher impact / lower effort is better.

| Upgrade | Impact | Effort | Score | PR Fit |
| --- | --- | --- | --- | --- |
| Pipeline filter shell + saved views + empty states | 5 | 2 | 10/10 | Best first PR |
| Lead detail density + sticky action bar cleanup | 5 | 3 | 9/10 | High-value PR |
| Campaign detail hierarchy + form spacing | 4 | 3 | 8/10 | Good second PR |
| Inbox/review card + status unification | 4 | 3 | 8/10 | Good workflow PR |
| Global shell/onboarding/fallback polish | 4 | 2 | 8/10 | Good supporting PR |
| Analytics/settings diagnostics + low-data states | 3 | 2 | 6/10 | Small cleanup PR |

## 8. Suggested Implementation Phases

### Phase 1: Highest visibility, lowest risk
- Pipeline filter shell
- saved views
- empty states
- shared card/action-row polish

### Phase 2: Daily workflow surfaces
- Lead detail section hierarchy
- Campaign list/detail
- create/edit form spacing

### Phase 3: Dense operational views
- Inbox/review cards and statuses
- sticky action bar refinement
- reply/draft surface cleanup

### Phase 4: Confidence and finish
- Analytics diagnostics and low-data states
- Settings cleanup
- global shell/navigation and onboarding polish

## 9. Files / Routes Likely Involved

### Shared primitives / shell
- `app/globals.css`
- `app/layout.tsx`
- `app/loading.tsx`
- `app/error.tsx`
- `components/crm/crm-shell.tsx`
- `components/crm/page-header.tsx`
- `components/ui/button.tsx`
- `components/ui/badge.tsx`
- `components/ui/crm-select.tsx`
- `components/ui/crm-date-field.tsx`
- `components/ui/empty-state.tsx`
- `components/ui/metric-card.tsx`
- `components/ui/score-bar.tsx`

### Pipeline
- `app/pipeline/page.tsx`
- `components/crm/pipeline-list-view.tsx`
- `components/crm/kanban-board.tsx`

### Campaigns
- `app/campaigns/page.tsx`
- `app/campaigns/[campaign_id]/page.tsx`
- `app/campaigns/create-campaign-form.tsx`
- `app/campaigns/edit-campaign-form.tsx`

### Lead detail / inbox / review
- `app/pipeline/[lead_id]/page.tsx`
- `components/crm/inbox-view.tsx`
- `components/crm/review-board.tsx`
- `components/crm/draft-review-editor.tsx`
- `components/crm/sticky-bottom-bar.tsx`

### Analytics / settings
- `app/analytics/page.tsx`
- `components/crm/analytics-charts.tsx`
- `components/crm/analytics-filters.tsx`
- `components/crm/analytics-diagnostics-panel.tsx`
- `app/settings/page.tsx`
- `app/settings/inboxes/page.tsx`
- `app/settings/notifications/page.tsx`
- `app/settings/account/page.tsx`
- `app/settings/sequences/page.tsx`
- `components/crm/system-diagnostics-panel.tsx`
- `components/crm/settings-diagnostics-card.tsx`

### First-use / support routes
- `app/page.tsx`
- `app/login/page.tsx`
- `app/inbox/page.tsx`
- `app/review/page.tsx`
- `app/metrics/page.tsx`

## 10. Risks and Anti-Regression Checks

Risks:
- shared surface changes can ripple across many routes
- dense operational views can regress hierarchy if card spacing is softened too much
- route-level polish can accidentally disturb sticky UI, optimistic actions, drag/drop, or form behavior

Anti-regression checks:
- preserve optimistic actions in inbox, review, lead detail, and campaign actions
- preserve drag/drop guardrails in pipeline
- preserve sticky bottom bar behavior
- preserve empty/loading/error readability without changing data flow
- keep contrast above the current helper-text floor
- avoid creating a second card/button system

## 11. Validation Plan

For the next implementation PR, run:
- `npm run lint`
- `npm run typecheck`
- `npm run build`

Run `npm test` only if it is stable in this workspace.
If `npm test` or `npm run build` hits the known Windows `spawn EPERM` issue again, report it clearly rather than treating it as a product regression.

Manual browser checks for the first polish PR:
- pipeline list and board
- campaigns list/detail
- lead detail
- inbox
- review
- analytics
- settings
- login/home/loading/error states

## 12. Recommended First Upgrade PR

Implement the pipeline polish PR first:
- unify the filter shell
- refine saved-view chips
- clean up empty states
- standardize board/list card surfaces

Reason:
- it is the highest-impact, lowest-effort visible improvement
- it immediately benefits the most-used operational workflow
- it provides a reusable surface pattern that can be applied to campaigns, analytics, and settings next
