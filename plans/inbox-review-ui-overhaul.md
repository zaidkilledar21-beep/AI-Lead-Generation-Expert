# Inbox + Review UI Overhaul

## 1. Objective
Overhaul the CRM Inbox and Review Queue so they feel like a premium shared operator console for replying, triaging, and approving work. The current goal is a visible UX transformation: faster scanning, clearer urgency, stronger action hierarchy, and better thread/queue readability without changing behavior or backend contracts.

## 2. Design References Used
- Linear: workflow clarity, dark operational surfaces, compact status badges, task/triage hierarchy, and fast decision-making UI.
- Stripe: premium information hierarchy, trustworthy surfaces, polished forms, and readable empty states.
- Vercel: restrained dark shell integration, minimal chrome, clear active states, and crisp first impression.
- Notion: dense but readable content layout, strong sectioning, and calm thread/detail readability.

## 3. Current UI Baseline Summary
- Inbox and Review already have the right data and actions, but the visual language is still fragmented across thread cards, filters, status pills, and action rows.
- Inbox needs a clearer split between unhandled, handled, urgent, and AI-suggested work so the operator can triage quickly.
- Review Queue needs stronger grouping and decision hierarchy so it reads like a daily cockpit rather than a long list.
- Empty, loading, and error states are functional but not yet premium or coherent with the shared shell.

## 4. Highest-Value Upgrade Opportunities
1. Reframe Inbox as a shared operations console with a stronger conversation layout and clearer triage signal.
2. Reframe Review Queue as a prioritised decision dashboard with urgency bands and quick actions surfaced earlier.
3. Unify filters, badges, status labels, and helper text so the operator always knows what state they are in.
4. Improve thread and draft/reply readability so business context is easier to parse at a glance.
5. Upgrade empty/loading/error states so the workflows feel dependable even when data is sparse or unavailable.

## 5. Upgrade Ideas by Route/Workflow
- Inbox
  - Stronger header hierarchy with clear inbox mode, triage counters, and action visibility.
  - Better conversation layout with business identity context, reply intent, SLA/urgency, and AI next-action summary.
  - Clearer handled vs unhandled state presentation.
  - More premium filter/search shell with saved or quick filters if the existing data supports it.
  - Empty state that explains what the inbox is for and what to do next.
- Review Queue
  - Priority-grouped queue sections: urgent, needs attention, low priority, blocked/ambiguous.
  - More pronounced approval confidence cues and age/status indicators.
  - Stronger review card hierarchy so the draft, issue, and decision affordances are immediately visible.
  - Quick decision actions with a clearer primary/secondary action split.
  - Better queue-empty and low-volume states that explain readiness and next steps.
- Shared reply/draft surfaces
  - Cleaner thread detail grouping for customer context, draft content, and system notes.
  - More readable draft review surfaces with calmer spacing and stronger section labels.
  - Sticky action bar hierarchy that clearly distinguishes the primary action from secondary controls.

## 6. Recommended Design Reference Per Idea
- Inbox conversation layout: Linear
- Inbox thread readability and context grouping: Notion
- Inbox urgency/status/badges: Linear + Vercel
- Review Queue prioritisation and quick decision UX: Linear
- Review confidence/readiness framing: Stripe
- Draft/reply surface trust and readability: Notion + Stripe
- Empty/loading/error states: Vercel + Stripe

## 7. Impact vs Effort Scoring
| Upgrade | Impact | Effort | Notes |
|---|---:|---:|---|
| Inbox triage hierarchy and conversation layout | 5 | 3 | Largest day-to-day readability gain |
| Review Queue priority grouping and quick actions | 5 | 3 | Strong operational payoff |
| Shared filters/status/badge unification | 4 | 2 | Small change, big cohesion gain |
| Draft/reply surface readability | 4 | 3 | Improves trust and scan speed |
| Empty/loading/error state overhaul | 3 | 2 | Important for polish and confidence |

## 8. Suggested Implementation Phases
1. Phase 1: Upgrade the shared Inbox and Review shells, filters, and state treatment.
2. Phase 2: Rework Inbox thread layout, urgency cues, and AI suggestion presentation.
3. Phase 3: Rework Review Queue grouping, decision hierarchy, and draft confidence cues.
4. Phase 4: Polish draft/reply surfaces and sticky action hierarchy.
5. Phase 5: Final responsive pass and fallback state consistency.

## 9. Files/Routes Likely Involved
- `app/inbox/page.tsx`
- `app/review/page.tsx`
- `components/crm/inbox-view.tsx`
- `components/crm/review-board.tsx`
- `components/crm/draft-review-editor.tsx`
- `components/crm/sticky-bottom-bar.tsx`
- `components/ui/empty-state.tsx`
- `components/ui/badge.tsx`
- `components/ui/button.tsx`
- `components/ui/crm-select.tsx`
- `app/globals.css` if a small shared surface tweak is needed

## 10. Risks and Anti-Regression Checks
- Preserve all reply classification, handled/unhandled logic, draft approval behavior, and review queue mutations.
- Preserve thread selection, reply handling, and sticky action behavior.
- Avoid introducing a new UI system or duplicate primitives.
- Keep the work scoped so pipeline/campaigns/analytics/settings are untouched.
- Check that filters still narrow the same data and that empty states only change presentation.
- Verify the UI still works in both dense and sparse data states.

## 11. Validation Plan
- Run `npm run lint`.
- Run `npm run typecheck`.
- Run `npm run build`.
- If build fails with the known Windows `spawn EPERM` issue, report it clearly and do not treat it as a UI regression.

## 12. Recommended First Upgrade PR
Start with an Inbox + Review shell and hierarchy PR:
- unify the page chrome and filter blocks,
- add clearer priority/urgency labeling,
- improve empty/loading/error states,
- and tighten the shared action rows before reworking the deepest thread/card layouts.
