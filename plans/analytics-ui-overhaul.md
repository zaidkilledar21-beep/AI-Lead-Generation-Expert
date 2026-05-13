# Analytics UI Overhaul

## Objective

Materially improve `/analytics` as a premium founder intelligence dashboard while preserving existing analytics data contracts and behavior.

## Context Read

- `AGENTS.md`
- `status.md`
- `docs/obsidian-vault/10_Graphify/Graphify Index.md` summary only
- Graphify queries / explain output for `app/analytics/page.tsx`
- `app/analytics/page.tsx`
- `components/crm/analytics-charts.tsx`
- `components/crm/analytics-filters.tsx`
- `components/crm/analytics-diagnostics-panel.tsx`
- `lib/crm/types.ts`
- `lib/crm/queries.ts`
- design references: Linear, Stripe, Vercel, Notion

## Skill Usage

- `ui-ux-pro-max`: used for dashboard layout, accessibility, chart/table guidance, and responsive checks.
- `magic-ui-generator`: used only as a restrained polish reference; no generated Magic components were introduced because the task is scoped to existing analytics UI.

## Implementation Scope

Touch only:
- `app/analytics/page.tsx`
- `components/crm/analytics-charts.tsx`
- `components/crm/analytics-filters.tsx`
- `components/crm/analytics-diagnostics-panel.tsx`

## Design Direction

- Dark premium operator dashboard.
- Stripe-style metric hierarchy with clear number emphasis.
- Linear-style operational clarity and compact table scanning.
- Vercel-style restraint: minimal decoration, precise borders, disciplined spacing.
- Subtle polish only: restrained gradients, sharper empty states, clearer active controls.

## Planned Changes

- Replace flat metric grid with an executive KPI command strip that includes metric context and period deltas.
- Move range metadata and export actions into a tighter analytics command surface.
- Improve chart/card headers with concise captions and stable chart body dimensions.
- Improve campaign table scanability with grouped metrics and stronger visual hierarchy.
- Add small decision-support cards using existing data only: top campaign, reply signal, and coverage / funnel context.
- Improve sparse and empty states without inventing data.

## Constraints

- No backend, schema, Supabase, n8n, auth, or workflow changes.
- No fake data or invented metrics.
- No generated Graphify / Obsidian changes.
- No polling loops, unsafe regex, broad refactor, or duplicated handlers.

## Validation Plan

- `npm run lint`
- `npm run typecheck`
- `npm run build` if the environment allows it
- Manual layout sanity for desktop and tablet-ish widths, KPI readability, chart alignment, no horizontal overflow, campaign table scanability, and empty/sparse states by code inspection.
