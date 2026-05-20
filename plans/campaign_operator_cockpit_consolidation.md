# Campaign Operator Cockpit Consolidation

## Source of truth

- `plans/campaign_operator_cockpit_implementation_plan.md`

## Phase alignment

### Plan Phase 1: Campaign detail route reliability and baseline cockpit

- Implemented:
  - Campaign detail route uses direct campaign-by-ID loading and no longer false-404s when supporting data fails.
  - Next 16 async `params` / `searchParams` handling is in place.
  - Top-level operator cockpit, latest run summary, readiness, support warnings, and campaign lead table exist.
  - `quota_exhausted` with useful work is mapped to `Completed: quota reached`.
  - Campaign leads expose score, band, confidence, manual review, queue, draft, and operator state.
- Missing:
  - None found for baseline Phase 1 scope.
- Needs QA:
  - Authenticated production QA for `/campaigns/952cb7ea-37a1-47a2-b443-11cb8ac048db`.

### Plan Phase 2: Run detail page

- Implemented:
  - Latest run timeline is visible on campaign detail.
  - Dedicated `/campaigns/[campaign_id]/runs/[run_id]` route.
  - Run-specific query/helper.
  - Links from campaign detail latest run and run history to the run detail page.
  - Run-specific summary, timeline, leads, warnings/errors, and queue/review/draft outcomes.
- Missing:
  - None found for the scoped Phase 2 run-detail slice after implementation.
- Needs QA:
  - Authenticated run detail QA after implementation.

### Plan Phase 3: Routing idempotency and lifecycle cleanup

- Implemented:
  - Manual review creation is idempotent.
  - Outreach queue creation is idempotent.
  - Routing returns clear lifecycle outcomes.
  - Missing email, sequence, inbox, paused campaign/global pause, and routing failure outcomes exist.
  - Focused routing tests cover duplicate review conflict recovery, idempotent queueing, and missing sequence.
- Missing:
  - Full plan taxonomy for explicit routing events such as `routing_started`, `manual_review_already_pending`, and `queue_already_exists` is not fully implemented.
- Needs QA:
  - Production routing QA against fresh scored leads and workflow event payload visibility.

### Plan Phase 4: Lead detail richness

- Implemented:
  - `/leads/[id]` now renders a read-only lead intelligence page instead of redirecting to the pipeline action page.
  - Lead detail shows identity, campaign/source/contact state, operator state, score/band/confidence/manual-review requirement, score evidence, enrichment/contact signals, AI hypothesis, routing state, and draft preview.
  - Campaign and run lead tables now link to `/leads/[id]`.
- Missing:
  - None found for the scoped Phase 4 read-only richness slice.
- Needs QA:
  - Authenticated production QA for the three known leads from campaign `952cb7ea-37a1-47a2-b443-11cb8ac048db`.

### Plan Phase 5: Email and notification wording cleanup

- Not started unless repo proves otherwise:
  - Notification/email wording and direct run-detail links are outside this slice.

## Next implementation slice

Implemented Plan Phase 2 only:

- Add `/campaigns/[campaign_id]/runs/[run_id]`.
- Add a minimal run-detail query/helper in `lib/crm/queries.ts`.
- Link latest run and run history rows from campaign detail to the run detail page.
- Show run summary, quota/failure wording, timeline, run-specific leads, review/queue/draft outcomes, warnings, and safe error messages.

## Non-goals

- Do not rework discovery, scoring, routing, drafting, sending, Gmail, n8n, or database schema.
- Do not redesign the campaign cockpit.
- Do not implement Phase 4 or Phase 5.
