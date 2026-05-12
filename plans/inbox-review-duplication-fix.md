# Inbox + Review Duplication Fix Plan

## 1. Objective
- Remove the Sonar-reported duplicate code between `app/inbox/page.tsx` and `app/review/page.tsx` without changing UI, behavior, or data flow.
- Keep the fix small and obvious so it is maintainable and does not turn into a new abstraction layer.

## 2. Duplication Observed
- Both route files repeat the same premium hero shell pattern:
  - section frame
  - eyebrow/title/description stack
  - four-up stat card grid
  - identical stat-card markup and tone dot treatment
- The duplication is visual-only and lives in the route files, not in business logic.

## 3. Targeted Extraction
- Extract a tiny shared CRM triage summary component under `components/crm/triage/`.
- The component should accept:
  - eyebrow text
  - title
  - description
  - stat definitions
  - optional layout class names if needed
- Keep the implementation dumb and presentational so the two pages can keep their existing metrics and filter logic untouched.

## 4. Files Likely Involved
- `app/inbox/page.tsx`
- `app/review/page.tsx`
- `components/crm/triage/*` new shared component file(s)
- `status.md`

## 5. Validation Plan
- Run `npm run lint`
- Run `npm run typecheck`
- Run `npm run build` if the Windows environment allows it

## 6. Risks
- Over-abstracting the shared component could make the pages harder to read, so the extraction should stop at the repeated hero/stat shell.
- Sonar may still flag other small similarities if they are below the threshold, but the known duplicated block should be removed directly.
