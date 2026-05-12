# Inbox + Review Layout Polish Plan

## 1. Objective
Refine the `/inbox` and `/review` experiences so the existing premium triage UI feels more balanced, aligned, and intentional without changing behavior, data flow, or visual concept.

## 2. Current Baseline
- The overhauled inbox/review surfaces already have stronger hierarchy and premium operational framing.
- The remaining issues are layout and spacing related: header balance, chip wrapping, panel proportions, card geometry, and timeline density.
- The goal is precision polish, not a redesign.

## 3. Highest-Value Layout Opportunities
1. Rebalance the inbox header so the summary, KPI cards, and controls read as one grid.
2. Stabilize filter-chip wrapping and spacing so classification and utility controls separate cleanly.
3. Normalize the inbox two-panel proportions and internal padding.
4. Recompose the review queue detail blocks so action content has clearer weight than passive metadata.
5. Tighten timeline anchoring and spacing to reduce floating negative space.
6. Standardize card geometry, badge spacing, and title/metadata rhythm across both routes.

## 4. Route/Workflow Fixes
### Inbox
- Rebuild the header into a cleaner responsive grid.
- Align KPI cards to consistent heights and spacing.
- Anchor search, sort, and filter controls beneath the summary area.
- Clean up filter-chip wrapping and spacing.
- Balance the left queue and right conversation panel proportions.
- Standardize padding and section spacing inside the active conversation panel.

### Review
- Recompose the suggested next action and ownership blocks so they feel balanced.
- Improve top badge spacing and the relationship between badges and the hero summary.
- Reduce dead space in the selected-item workspace.
- Make actionable content feel visually stronger than passive metadata.
- Tighten timeline density and event anchoring.

## 5. Recommended Design Reference Per Area
- Inbox header and filters: Linear for workflow clarity, Vercel for restrained shell structure.
- Inbox cards and panels: Notion for dense readability, Linear for alignment discipline.
- Review queue: Linear for triage clarity, Stripe for confident premium hierarchy.
- Timeline and detail composition: Notion for content rhythm, Stripe for trustworthy spacing and labels.

## 6. Impact vs Effort
- Inbox header rebalance: high impact, low effort.
- Filter chip stabilization: medium-high impact, low effort.
- Two-panel proportion cleanup: high impact, medium effort.
- Review action/ownership recomposition: high impact, medium effort.
- Timeline density cleanup: medium impact, low effort.
- Card geometry normalization: medium impact, low effort.

## 7. Suggested Implementation Phases
1. Polish shared spacing tokens and any tiny layout primitives that both routes already use.
2. Rework the inbox header grid and filter wrapping.
3. Normalize inbox panel proportions and card geometry.
4. Recompose the review detail area and timeline spacing.
5. Run validation and inspect both routes at desktop and tablet widths.

## 8. Files/Routes Likely Involved
- `app/inbox/page.tsx`
- `app/review/page.tsx`
- `components/crm/inbox-view.tsx`
- `components/crm/review-board.tsx`
- `components/crm/draft-review-editor.tsx`
- `components/crm/triage/*` only if a tiny shared layout helper is clearly justified
- `app/globals.css` only if a very small shared spacing tweak is necessary

## 9. Risks and Anti-Regression Checks
- Keep the scope to spacing, alignment, and geometry only.
- Do not change filtering, thread handling, reply actions, review actions, or routing.
- Avoid over-extracting shared abstractions for small layout fixes.
- Check for horizontal overflow, clipped dropdowns, and wrapped chips at narrower widths.
- Watch for Sonar duplication if any shared helper is introduced.

## 10. Validation Plan
- `npm run lint`
- `npm run typecheck`
- `npm run build` if the environment allows it
- Manual visual QA on `/inbox` and `/review` at desktop and tablet widths

## 11. Recommended First Change
Start with the inbox header and filter control alignment. It is the most visible layout imbalance and it sets the rhythm for the rest of the route polish.
