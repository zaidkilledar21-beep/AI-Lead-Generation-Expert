# Frontend Open Design Final Pass Plan

## Objective

Run a conservative frontend-only visual polish pass for the CRM that makes the app feel like one coherent product instead of several adjacent design systems stitched together by human optimism and Tailwind classes.

The pass is based on the Open Design audit findings:
- shared surfaces/cards/buttons are fragmented across `panel`, `glass-panel`, `record-card`, inline Tailwind blocks, and shared UI components;
- campaign and lead-detail screens are dense and visually uneven;
- pipeline is functional but over-customized;
- inbox/review are polished but use too many accent/card variants;
- empty/loading/error states and contrast need a stricter consistent floor.

## Scope

Frontend visual/design work only.

Included:
- shared surface/card/button/input visual language
- dashboard/page chrome consistency
- campaign pages
- pipeline views
- review queue
- lead detail
- inbox/replies
- analytics
- settings
- empty/loading/error states
- spacing, typography, hierarchy, contrast, responsive behavior
- reuse/consolidation of existing UI primitives

## Explicit Out of Scope

Do not modify:
- auth/session flow
- Supabase RLS or authorization behavior
- database schema or migrations
- n8n workflows
- sending logic
- workflow runtime behavior
- DeepSeek prompts/classification logic
- secrets or env handling
- backend actions/queries unless a tiny type-only adjustment is unavoidable for frontend rendering

## Design Principles

1. Preserve the existing dark UI direction.
2. Consolidate before decorating.
3. Prefer improving existing primitives/classes over creating parallel components.
4. Avoid a sweeping redesign that changes product behavior.
5. Keep interaction-heavy screens stable.
6. Use shared patterns for surfaces, headers, actions, forms, states, and diagnostics.
7. Make dense pages more scannable without removing required operational data.
8. Keep changes minimal, scoped, and reviewable.

## Phase 0: Baseline and Guardrails

Before editing:
- check `git status`
- read `AGENTS.md`, `status.md`, this plan, and `docs/obsidian-vault/10_Graphify/Graphify Index.md`
- use Graphify to shortlist frontend files before raw source inspection
- identify exact existing UI primitives and CSS classes in use
- do not inspect the whole repo

Recommended Graphify commands:

```bash
graphify query "frontend CRM shared UI surface card button input empty state layout" --graph graphify-out/graph.json
graphify query "pipeline campaigns lead detail inbox review analytics settings frontend components" --graph graphify-out/graph.json
graphify explain "app/globals.css" --graph graphify-out/graph.json
graphify explain "components/crm/crm-shell.tsx" --graph graphify-out/graph.json
graphify explain "components/crm/page-header.tsx" --graph graphify-out/graph.json
```

## Phase 1: Shared Primitives and Global CSS Cleanup

Goal: reduce visual drift at the source.

Inspect first:

```text
app/globals.css
components/ui/button.tsx
components/ui/badge.tsx
components/ui/crm-select.tsx
components/ui/crm-date-field.tsx
components/ui/empty-state.tsx
components/ui/metric-card.tsx
components/ui/score-bar.tsx
```

Tasks:
- inventory existing surface classes: `panel`, `glass-panel`, `glass-card`, `record-card`, `metric-card`, one-off Tailwind surface blocks
- define a small semantic surface language using existing classes/components where possible
- consolidate button/badge/input focus, hover, disabled, and error states
- normalize radius, border, shadow, background opacity, muted text, and section spacing tokens
- improve contrast floor for helper text, metadata, captions, muted labels, and disabled states
- avoid creating a huge new design system unless it clearly removes duplication

Preferred consolidation targets:

```text
crm-surface
crm-surface-muted
crm-surface-header
crm-surface-body
crm-toolbar
crm-state-card
crm-detail-grid
crm-action-row
```

Acceptance:
- no parallel surface/card language is introduced
- shared primitives remain backward-compatible with existing screens
- existing interactions continue to work

## Phase 2: Page Chrome, Headers, and Layout Consistency

Inspect first:

```text
app/layout.tsx
components/crm/crm-shell.tsx
components/crm/page-header.tsx
```

Tasks:
- normalize CRM shell spacing, content width, and page vertical rhythm
- make `PageHeader` the default pattern for title, subtitle, primary action, secondary actions, and status badges
- align top-level page chrome across pipeline, campaigns, inbox, review, analytics, and settings
- ensure responsive behavior remains usable on narrower screens
- avoid changing navigation/auth behavior

Acceptance:
- page headers feel consistent across core CRM routes
- primary/secondary actions are visually predictable
- no route behavior changes

## Phase 3: High-Impact CRM Screens

### 3A. Pipeline

Inspect:

```text
app/pipeline/page.tsx
components/crm/pipeline-list-view.tsx
components/crm/kanban-board.tsx
```

Tasks:
- normalize filter shell, saved-view chips, board/list toggle, row surfaces, and kanban cards
- retain drag/drop guardrails and existing status behavior
- improve visual consistency without changing pipeline logic

Manual QA:
- list view loads
- board view loads
- saved filters still work
- drag/drop behavior remains protected

### 3B. Campaigns

Inspect:

```text
app/campaigns/page.tsx
app/campaigns/[campaign_id]/page.tsx
app/campaigns/create-campaign-form.tsx
app/campaigns/edit-campaign-form.tsx
```

Tasks:
- reduce density of campaign list actions
- make campaign list/detail surfaces consistent
- normalize form sections and action rows
- preserve manual run, duplicate/archive, readiness, and campaign lifecycle behavior

Manual QA:
- campaign list renders
- create/edit forms remain usable
- campaign detail actions still work
- no n8n/webhook behavior changes

### 3C. Lead Detail, Inbox, Review

Inspect:

```text
app/pipeline/[lead_id]/page.tsx
components/crm/inbox-view.tsx
components/crm/review-board.tsx
components/crm/draft-review-editor.tsx
components/crm/sticky-bottom-bar.tsx
```

Tasks:
- consolidate interaction card styles
- normalize draft/reply/review action treatments
- improve visual hierarchy in dense panes
- preserve optimistic actions, sticky bottom bar, reply handling, and review actions

Manual QA:
- lead detail loads
- sticky action bar remains usable
- review item approve/reject/edit flow still works
- inbox thread selection and handled/won/lost actions still work

## Phase 4: Analytics, Settings, Diagnostics, and States

Inspect:

```text
app/analytics/page.tsx
components/crm/analytics-charts.tsx
components/crm/analytics-filters.tsx
components/crm/analytics-diagnostics-panel.tsx
app/settings/page.tsx
app/settings/inboxes/page.tsx
app/settings/notifications/page.tsx
app/settings/account/page.tsx
app/settings/sequences/page.tsx
components/crm/system-diagnostics-panel.tsx
components/crm/settings-diagnostics-card.tsx
```

Tasks:
- normalize diagnostics cards and empty states
- make analytics filters/charts visually consistent with the surface system
- improve settings route consistency
- add or improve loading/error states only where low-risk and high-value
- do not add broad new route-level files unless they are clearly safe

Reference expectations:
- empty states should be defined for pipeline, inbox, review queue, analytics, and campaign leads
- loading states should be clear for data-heavy pages

## Files to Inspect First

```text
app/globals.css
components/crm/crm-shell.tsx
components/crm/page-header.tsx
components/ui/button.tsx
components/ui/badge.tsx
components/ui/crm-select.tsx
components/ui/crm-date-field.tsx
components/ui/empty-state.tsx
components/ui/metric-card.tsx
components/ui/score-bar.tsx
app/pipeline/page.tsx
components/crm/pipeline-list-view.tsx
components/crm/kanban-board.tsx
app/campaigns/page.tsx
app/campaigns/[campaign_id]/page.tsx
app/pipeline/[lead_id]/page.tsx
components/crm/inbox-view.tsx
components/crm/review-board.tsx
app/analytics/page.tsx
app/settings/page.tsx
```

## Files Likely to Edit

Prioritize these. Do not edit everything unless necessary.

```text
app/globals.css
components/crm/crm-shell.tsx
components/crm/page-header.tsx
components/ui/button.tsx
components/ui/badge.tsx
components/ui/crm-select.tsx
components/ui/crm-date-field.tsx
components/ui/empty-state.tsx
components/ui/metric-card.tsx
components/ui/score-bar.tsx
app/pipeline/page.tsx
components/crm/pipeline-list-view.tsx
components/crm/kanban-board.tsx
app/campaigns/page.tsx
app/campaigns/[campaign_id]/page.tsx
app/campaigns/create-campaign-form.tsx
app/campaigns/edit-campaign-form.tsx
app/pipeline/[lead_id]/page.tsx
components/crm/inbox-view.tsx
components/crm/review-board.tsx
components/crm/draft-review-editor.tsx
components/crm/sticky-bottom-bar.tsx
app/analytics/page.tsx
components/crm/analytics-charts.tsx
components/crm/analytics-filters.tsx
components/crm/analytics-diagnostics-panel.tsx
app/settings/page.tsx
components/crm/system-diagnostics-panel.tsx
components/crm/settings-diagnostics-card.tsx
```

## Reusable Components / Classes to Consolidate

Target consolidation:
- surface/card classes
- page header action layout
- action rows/toolbars
- status/band badges
- select/date/input visual states
- empty/loading/error state cards
- diagnostics cards
- detail grid layouts

Do not:
- create duplicate wrappers for the same visual role
- create a new UI library
- copy-paste styling across every route
- move complex business logic during this pass

## Risks

- Shared CSS changes can ripple across nearly every route.
- Pipeline, inbox, review, and lead detail contain interaction-heavy UI. Preserve behavior.
- Some existing classes may be undefined or partially overlapping. Clean cautiously.
- A broad visual pass can become a giant PR. Prefer staged, reviewable changes.
- No obvious visual regression harness exists, so manual QA matters.

## Anti-Regression Checks

Before final response, verify:
- auth/login still works
- protected pages still load
- pipeline list and board render
- campaign list/detail render
- campaign create/edit forms render
- lead detail renders
- inbox renders and thread selection works
- review queue renders and draft actions are visible
- analytics renders with empty/low-data states
- settings routes render
- global pause UI remains visible and unchanged behaviorally
- no client-side secrets introduced
- no unbounded client-side scans introduced
- no unsafe regex introduced
- no polling loops introduced
- no duplicated helper/component families introduced

## Validation Commands

Run available commands:

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

If a command does not exist, state that clearly.

## Manual QA Checklist

- [ ] `/pipeline` list view
- [ ] `/pipeline` board view
- [ ] `/pipeline/[lead_id]`
- [ ] `/campaigns`
- [ ] `/campaigns/[campaign_id]`
- [ ] campaign create/edit forms
- [ ] `/inbox`
- [ ] `/review`
- [ ] `/analytics`
- [ ] `/settings`
- [ ] `/settings/inboxes`
- [ ] `/settings/notifications`
- [ ] `/settings/account`
- [ ] `/settings/sequences`
- [ ] mobile/narrow viewport sanity check
- [ ] focus states visible
- [ ] empty states readable
- [ ] loading/error states readable where present

## Completion Criteria

The pass is complete when:
- shared surface/card/button/input styling is visibly more consistent
- core CRM pages feel like one product
- no business behavior has changed
- validation passes or failures are clearly reported
- `status.md` is updated
- changes remain scoped and reviewable
