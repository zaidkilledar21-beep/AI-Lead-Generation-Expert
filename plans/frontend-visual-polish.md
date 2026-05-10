# Frontend Visual Polish Plan

## Goal

Run a final frontend-only visual/design pass across the CRM app, focused on improving clarity, contrast, spacing, typography, card polish, and clickable navigation affordances.

This is not a backend, database, auth, workflow, or schema task.

The current functionality is mostly acceptable. The goal is to make the UI feel more polished, modern, readable, and intentional without changing the core background theme.

## Source notes from review document

The review document highlights the following issues:

- Pipeline summary/action area:
  - The “3 Actions Required” control should take the user directly to the relevant actionable items.
  - Main metric cards should be clickable where they represent filtered views.
- Saved view area:
  - Current layout looks visually off.
- Replies card:
  - Current card styling looks weird and cramped.
  - Badges and spacing need refinement.
- Lead/review detail card:
  - Current card feels glitched.
  - Add more useful visible details where available.
- Overall:
  - Functionality looks good.
  - Improve formatting, text hierarchy, contrast, font size, and font weight.
  - Keep the existing dark/background aesthetic.
  - Use white/light text colors where needed for contrast.

## Required frontend design skills

Use these skills explicitly:

- `ui-ux-pro-max`
- `21st.dev`
- `frontend-design`
- `magic-ui-generator`

Skill usage rules:

- Use the skills for design review, component polish, visual hierarchy, spacing, interaction affordances, and modern UI refinements.
- Do not load unrelated skills.
- Do not perform broad skill discovery unless required by `AGENTS.md`.
- If additional skills seem relevant, list them as intentionally not used unless they are absolutely necessary.

## Scope

Frontend/UI only.

Likely areas to inspect first:

- `app/pipeline/page.tsx`
- `components/crm/pipeline-list-view.tsx`
- `components/crm/kanban-board.tsx`
- `app/inbox/page.tsx`
- `components/crm/inbox-view.tsx`
- `app/review/page.tsx`
- `components/crm/review-board.tsx`
- `app/analytics/page.tsx`
- shared card/button/badge components under `components/`
- shared CRM shell/layout components

Only expand beyond these files if the repo structure requires it.

## Hard boundaries

Do not:

- change backend logic
- change database schema
- change Supabase queries unless required only to expose already-existing display fields
- change n8n workflow behavior
- add direct sending behavior
- expose secrets
- alter auth/session logic
- redesign the whole app
- change the existing dark background theme
- introduce large design system rewrites
- add heavy dependencies unless already approved
- create duplicated card/button/badge variants everywhere

## Design goals

### 1. Improve visual hierarchy

- Increase font size and weight where current text is too faint or small.
- Use white/light text for primary labels and values.
- Use muted text only for supporting details.
- Make page headings, card titles, counts, statuses, and action labels visually distinct.
- Avoid low-contrast gray-on-dark text.

### 2. Keep the background aesthetic

- Keep the existing dark/background style.
- Improve contrast and readability within the existing theme.
- Do not convert the app to a light theme.
- Do not replace the app’s visual identity with a generic template.

### 3. Make actionable cards clickable

For dashboard/summary cards that represent actionable filtered views:

- Make cards clickable where there is a clear destination.
- Add hover/focus states.
- Add accessible labels.
- Preserve keyboard navigation.
- Make the click target obvious but not obnoxious.

Examples:

- Pipeline count card should navigate/filter to pipeline items.
- Priority leads card should navigate/filter to priority leads.
- Unhandled replies card should navigate/filter to replies needing handling.
- Open reviews card should navigate/filter to pending review queue.
- “Actions Required” should navigate/filter to actionable items instead of looking decorative.

### 4. Polish saved view UI

- Improve spacing, alignment, input/button sizing, and visual balance.
- Make the save view section look intentionally integrated with the page.
- Ensure the save action has clear feedback and disabled/loading states if already supported.
- Do not add fake behavior if saved views are not fully wired.

### 5. Polish replies and review cards

For reply cards:

- Improve spacing and alignment.
- Make sender/business name, email, SLA status, review status, and intent/status badges easier to scan.
- Reduce cramped badge layout.
- Ensure badges have readable contrast.
- Show missing states honestly, for example when no reply excerpt exists.
- Keep content bounded/truncated so long text does not break the layout.

For review/lead cards:

- Fix any glitched-looking spacing, borders, or nested dark blocks.
- Add useful visible details where already available, such as:
  - campaign name
  - location
  - score/band
  - status
  - review reason
  - last activity or created date
- Do not fetch new heavy data just to fill cards.
- Do not show fake placeholders as if they are real data.

### 6. Improve interaction states

Add or refine:

- hover states
- focus-visible states
- disabled states
- loading states where existing actions are async
- empty states where current UI looks broken or unfinished

### 7. Responsive polish

- Check common desktop widths.
- Ensure cards do not collapse awkwardly.
- Improve wrapping and spacing for badges.
- Avoid horizontal overflow.
- Maintain mobile/tablet sanity if the app already supports it.

## Implementation rules

- Reuse existing components and styling patterns first.
- If repeated visual patterns exist, create or improve a shared component.
- Avoid duplicated JSX blocks for similar metric cards/badges.
- Keep changes small and reviewable.
- Prefer className/style refinements over architectural rewrites.
- Preserve existing functionality.
- Do not add animations that make the UI feel gimmicky or slower.
- If using `magic-ui-generator`, use it to inspire/refine components, not to dump unrelated decorative components into the app.

## Accessibility rules

- Maintain readable color contrast.
- Interactive cards must be keyboard accessible.
- Use proper `button`, `a`, or accessible click handling.
- Add `aria-label` where icon-only/action cards need it.
- Preserve visible focus indicators.
- Do not rely on color alone for status.

## Required checks before editing

1. Read applicable `AGENTS.md` chain.
2. Read `status.md`.
3. Confirm this plan is the active plan.
4. Inspect the listed frontend files first.
5. Use the required frontend design skills:
   - `ui-ux-pro-max`
   - `21st.dev`
   - `frontend-design`
   - `magic-ui-generator`
6. Shortlist components to edit before changing files.

## Validation

Run available checks:

- `npm run lint`
- `npm run typecheck`
- `npm test`
- `npm run build`

If a command does not exist, state that clearly and run the closest available equivalent.

Also perform a manual UI smoke review:

1. Open pipeline page.
2. Confirm metric/action cards are readable and clickable where intended.
3. Confirm “Actions Required” takes the user to the relevant actionable view/filter.
4. Confirm saved view section looks aligned and polished.
5. Open inbox/replies view.
6. Confirm reply cards are readable, well-spaced, and not visually glitched.
7. Open review queue.
8. Confirm lead/review cards show useful details and no broken-looking sections.
9. Check hover/focus states.
10. Check empty/missing states.
11. Check common desktop responsive widths.

## Acceptance criteria

- Existing dark background/theme is preserved.
- Text contrast, font size, and font weight are improved.
- Main actionable metric cards are clickable where appropriate.
- “Actions Required” navigates or filters to the relevant actionable items.
- Saved view UI no longer looks visually off.
- Reply cards look polished, readable, and less cramped.
- Lead/review cards no longer feel glitched and show useful available details.
- Badges/status labels are readable and consistently styled.
- Empty/missing states are honest.
- No backend/schema/workflow changes are introduced.
- No new secrets, unsafe regex, polling loops, or unbounded client-side scans are introduced.
- No avoidable duplicated visual code is introduced.
- Validation results are reported.
- `status.md` is updated before final response.

## Final response required from Codex

Return:

- Summary
- Skills used
- Files changed
- Design improvements made
- Validation results
- Manual UI smoke results
- Risks / unresolved gaps
- `status.md` update confirmation
