# Global Shell UI Overhaul

## Objective
Materially upgrade the CRM's first impression by redesigning the global shell and page framing so the app feels more premium, operational, and cohesive without changing behavior.

## Design References Used
- Linear: workflow clarity, active nav states, status-heavy control surfaces, compact internal SaaS hierarchy.
- Stripe: enterprise trust, premium surface polish, forms, empty states, restrained but confident layout rhythm.
- Vercel: minimal dark shell, clean framing, page chrome, loading/error consistency.
- 21st.dev: not present in this workspace as a copied design-system reference, so it will only be used if surfaced later in Open Design; do not depend on it for this plan.

## Current UI Baseline Summary
- The CRM already has a dark operational direction and a working shell, but the first impression still reads as a collection of screens rather than one control center.
- Global layout and CRM shell framing are functional, yet the sidebar, top bar, status area, and page framing still leave room for a more deliberate premium treatment.
- Loading and error shells are present, but the global experience can be made more cohesive and trustworthy at first glance.

## Highest-Value Upgrade Opportunities
- Strengthen the global shell hierarchy so navigation, context, and action areas read as one premium control center.
- Improve the sidebar/top-bar relationship with clearer active states and better scanning of high-priority routes.
- Upgrade global status/pause/search framing so operational state is more obvious and trustworthy.
- Unify loading and error states with the rest of the shell for a more polished first impression.
- Tighten page framing and spacing so dense CRM content feels intentionally composed instead of merely wrapped.

## Upgrade Ideas by Route/Workflow
- `app/layout.tsx`: refine the outer app frame, page spacing, and shell composition.
- `components/crm/crm-shell.tsx`: make the sidebar, top bar, and action/status regions feel more premium and more obviously operational.
- `app/globals.css`: tighten shared shell tokens, borders, spacing, and active-state treatment.
- `app/loading.tsx`: align loading state treatment with the operational shell rather than generic framework fallback behavior.
- `app/error.tsx`: make error fallback match the premium shell language and improve trust on failure states.

## Recommended Design Reference per Idea
- Layout hierarchy and active nav clarity: Linear.
- Premium shell polish, form-like control framing, and trust polish: Stripe.
- Overall restraint, dark canvas, and clean page framing: Vercel.
- First-use clarity and information grouping: Linear + Stripe, with Notion-like readability as a constraint on dense text.

## Impact vs Effort Scoring
- `app/layout.tsx` shell framing: impact 5/5, effort 3/5.
- `components/crm/crm-shell.tsx` sidebar/top bar/status refinement: impact 5/5, effort 3/5.
- `app/globals.css` shared shell tokens: impact 5/5, effort 2/5.
- `app/loading.tsx` and `app/error.tsx`: impact 3/5, effort 1/5.

## Suggested Implementation Phases
1. Normalize shared shell tokens in `app/globals.css`.
2. Rework `app/layout.tsx` and `components/crm/crm-shell.tsx` for stronger hierarchy and page framing.
3. Polish global loading and error shells to match the new control-center feel.
4. Run a final responsive and contrast check on shell/navigation states.

## Files/Routes Likely Involved
- `app/layout.tsx`
- `components/crm/crm-shell.tsx`
- `app/globals.css`
- `app/loading.tsx`
- `app/error.tsx`

## Risks and Anti-Regression Checks
- Do not change auth/session behavior, route handling, or CRM data-fetching flow.
- Do not introduce duplicate shell primitives or a second styling system.
- Preserve current navigation targets, active route logic, global pause behavior, and search/status controls.
- Check contrast and spacing on both wide and narrow layouts.
- Keep the shell upgrade visually noticeable but operationally conservative.

## Validation Plan
- `npm run lint`
- `npm run typecheck`
- `npm run build`
- Manual browser check of the global shell, loading state, and error state across the main CRM routes.

## Recommended First Upgrade PR
- Global shell overhaul PR focused on `app/layout.tsx`, `components/crm/crm-shell.tsx`, `app/globals.css`, `app/loading.tsx`, and `app/error.tsx`.
- Keep route-specific modules untouched in this PR.
- Prioritize visible frame, navigation hierarchy, and global state consistency over local screen redesign.
