# Campaign Operator Cockpit Implementation Plan

## Purpose

This plan is the first concrete step toward making the outreach app usable for a non-technical operator.

The backend is now generating real value: discovery runs complete, candidates are deduped, leads are promoted, enrichment/scoring runs, score evidence is stored, manual review rows are created, and at least one outreach queue/draft path is being touched.

The frontend, however, does not expose that value clearly. The operator cannot reliably see what happened, why it happened, what each lead’s current state is, or what action to take next. The campaign `Open` action also routes to a 404 even when the campaign exists, which blocks the main inspection workflow entirely.

This plan fixes the product experience one layer at a time without changing the core discovery/scoring/routing architecture.

---

## Current confirmed production behavior

### Latest successful test run

Run:

```text
f7f86588-d485-40df-89cd-f92682839e05
```

Campaign:

```text
952cb7ea-37a1-47a2-b443-11cb8ac048db
Middle East Test 2
```

Observed result:

```text
status: quota_exhausted
candidates_checked: 75
places_text_search_calls: 4
places_details_calls: 4
total_places_calls: 8
duplicates_skipped: 71
candidates_rejected: 1
candidates_promoted: 3
manual_review_candidates: 0
crawl_failures: 1
error_message: null
```

This was not a hard failure. It completed useful work and stopped because a configured quota/cap was reached.

### Leads created

| Lead | Email | Score | Band | Confidence | Current status |
|---|---|---:|---|---|---|
| Wide Wings Media LLC | info@wide-wings.ae | 72 | B | medium | scored |
| Be On Top | info@beontop.ae | 72 | B | medium | scored |
| Shark Matrix | null | 48 | C | low | scored + manual review |

### Confirmed data exists in DB

Useful backend data exists across:

- `discovery_runs`
- `workflow_events`
- `lead_candidates`
- `leads`
- `lead_enrichment`
- `lead_scores`
- `score_evidence`
- `automation_hypotheses`
- `manual_review_queue`
- `outreach_queue`
- `email_drafts`
- campaign configuration fields such as assigned inbox and sequences

The problem is not that the backend has no data. The problem is that the frontend does not expose it in the campaign/operator workflow.

---

## Key diagnosis

### 1. Campaign `Open` action is broken

The campaign list page links to `/campaigns/:campaign_id`, but clicking `Open` returns 404 even though the campaign exists in the database.

Likely cause:

- `app/campaigns/[campaign_id]/page.tsx` calls `getCampaignDetailData(params.campaign_id)`.
- `getCampaignDetailData()` appears to depend on aggregate campaign list construction instead of fetching the campaign directly by ID first.
- If the aggregate helper fails, filters differently, or does not return the campaign, the detail page returns `notFound()`.

Required fix:

- Campaign detail must first fetch the campaign directly by ID.
- If the campaign exists and the user is allowed to see it, the page must render.
- Supporting analytics should fail gracefully instead of causing 404.

### 2. `quota_exhausted` is presented as “Needs Attention”

For a run that creates leads and has no error, `quota_exhausted` should be user-facing as:

```text
Completed: quota reached
```

Not:

```text
Needs Attention
```

Required fix:

- Add frontend/user-facing status mapping.
- Treat `quota_exhausted + created/promoted > 0 + no error` as a successful limited completion.
- Reserve “Needs Attention” for failed/stuck/blocked states.

### 3. Manual review and outreach state are hidden or confusing

The DB shows:

- One lead has `manual_review_queue.reason = enrichment_failed`.
- Another lead has `manual_review_queue.reason = low_confidence_requires_manual_review`.
- One lead also has `outreach_queue.status = drafted`.

The UI does not show these outcomes clearly.

Required fix:

- Collapse technical backend state into one readable operator state per lead.
- Example operator states:
  - `Needs review`
  - `Draft ready`
  - `Queued`
  - `Blocked`
  - `Scored only`
  - `Sent`
  - `Replied`
- If a lead exists in multiple technical states, the UI should show the most important operator state and explain supporting sub-states.

### 4. Routing is not idempotent

Workflow events show a duplicate manual review insert caused a 409 conflict on `manual_review_one_pending_per_lead_idx`.

Required fix:

- Routing/manual-review creation should be idempotent.
- If a pending manual review already exists, update or no-op, then continue.
- A duplicate manual review should not crash routing.
- Routing events should be logged clearly.

### 5. Scored leads can remain in limbo

Two B-band leads were scored and not manual-review-required, but at least one query showed no queue status for them at that point. Later, one outreach queue row appeared with `status = drafted`.

Required fix:

- After scoring, every lead should have a clear next operational outcome:
  - manual review pending
  - outreach queued
  - draft ready
  - blocked due to missing sequence/inbox/email/config
  - paused due to campaign/global status
  - routing failed with a visible reason
- No valid lead should silently sit at `status = scored` with no action trail.

### 6. Score evidence is valuable but hidden

Score evidence contains rich reasoning such as:

- automation opportunity
- workflow gap
- customer volume
- niche fit
- reachability
- ability to pay
- missing data
- evidence text

Required fix:

- Campaign detail and/or lead detail must expose this reasoning.
- Operators should be able to answer:
  - why is this Band B?
  - what signals were found?
  - what was missing?
  - why does this need manual review?
  - what should I do next?

---

## Product goal

Build an operator-grade campaign cockpit where a non-technical user can understand:

```text
Can this campaign run?
Is it active or paused?
What happened in the latest run?
Which leads were created?
Which leads were scored?
Why were they scored that way?
Which leads need review?
Which leads have drafts?
Which leads are blocked?
What should I do next?
```

No SQL should be required for normal operation.

---

## Implementation phases

## Phase 1: Campaign detail route reliability and baseline cockpit

### Goal

Fix the broken `Open` action and make `/campaigns/:campaign_id` a reliable operator cockpit.

### Scope

Primary files:

```text
app/campaigns/page.tsx
app/campaigns/[campaign_id]/page.tsx
app/campaigns/[campaign_id]/campaign-detail-controls.tsx
lib/crm/queries.ts
lib/app/campaigns.ts
status.md
```

Possible files:

```text
app/campaigns/[campaign_id]/run-timeline.tsx
app/campaigns/[campaign_id]/campaign-leads-table.tsx
app/campaigns/[campaign_id]/operator-state-badge.tsx
```

Do not touch:

```text
n8n workflows
sending scheduler
Gmail/reply detection
DB migrations unless absolutely required
```

### Required work

#### 1. Fix campaign detail 404

- Replace fragile detail lookup with a direct campaign-by-ID fetch.
- If the campaign exists, render the page.
- If analytics/supporting data fails, show a warning section instead of 404.
- Keep true 404 only for:
  - campaign does not exist
  - user is unauthorized
  - invalid campaign ID format

#### 2. Add top-level campaign status panel

Display:

```text
Campaign status: Active / Paused / Archived / Draft
Global outreach: Enabled / Paused
Discovery: Ready / Running / Completed / Quota reached / Failed / Stuck
Sending: Enabled / Paused / Blocked
```

Include plain-language explanation:

```text
Global outreach is enabled, but this campaign is paused.
Discovery can run, but sending is paused.
This campaign has no assigned inbox.
This campaign has no Band B sequence.
```

#### 3. Add latest run summary

Show the latest discovery run:

```text
Status
Started
Completed
Duration
Candidates checked
Duplicates skipped
Leads created
Rejected
Manual review
Scored
Queued
Drafted
Errors/warnings
```

Map statuses:

| Raw status | User label |
|---|---|
| `completed` | Completed |
| `quota_exhausted` with leads created | Completed: quota reached |
| `quota_exhausted` with zero leads | Quota reached: no new leads |
| `failed` | Failed |
| `running` | Running |
| stale `running` | Stuck |
| `paused` | Paused |

#### 4. Add latest run timeline

Use `workflow_events` for the latest run.

Show readable labels instead of raw event spam:

| Event pattern | Label |
|---|---|
| `run_inserted` | Run created |
| `query_loop_started` | Search started |
| `text_search_completed` | Google Places search completed |
| `place_processing_started` | Place details processing |
| `import_started` | Lead import started |
| `import_completed` | Lead import completed |
| `enrichment_scoring_started` | Enrichment and scoring started |
| `lead_enrichment` | Lead enrichment |
| `lead_scoring` | Lead scoring |
| `wf_04_routing` | Routing decision |
| `finalize_started` | Finalizing run |
| `finalize_completed` | Run finalized |
| `finalize_failed` | Finalization failed |

#### 5. Add campaign leads table

The campaign detail page must show leads with useful columns:

```text
Business
Website
Email
Phone
Score
Band
Confidence
Lead status
Operator state
Manual review reason
Queue status
Draft status
Latest action
Open lead
```

#### 6. Add operator state derivation

Create a helper that converts raw technical state into a readable operator state.

Suggested priority:

1. Replied / closed / bounced / unsubscribed
2. Sent / in sequence
3. Draft ready
4. Queued
5. Needs review
6. Blocked
7. Scored only
8. Enriched
9. New

Examples:

```text
manual_review_queue.pending + no draft => Needs review
outreach_queue.status = drafted => Draft ready
lead.score exists + no queue/manual review => Scored only / Routing incomplete
missing email + no phone => Missing contact
campaign paused + queue exists => Campaign paused
global outreach paused + queue exists => Sending paused
```

#### 7. Add “why” fields

For each lead row, include a compact reason summary:

```text
Band B because: high niche fit, good reachability, clear service offering.
Needs review because: enrichment failed; robots.txt blocked crawl; email missing.
Draft ready: draft generated from Band B sequence.
```

This can initially be short and derived from `lead_scores`, `score_evidence`, `manual_review_queue`, and workflow event summaries.

### Acceptance criteria

- Clicking `Open` on an existing campaign never 404s.
- A non-technical user can see the latest run result.
- `quota_exhausted` is shown as “Completed: quota reached” when useful work happened.
- Leads generated by the campaign are visible.
- Each lead shows score, band, confidence, and operator state.
- Manual review and draft/queue states are visible.
- Raw DB statuses are translated into readable labels.
- No SQL is required to understand a normal campaign run.

---

## Phase 2: Run detail page

### Goal

Create a dedicated run inspection view for each discovery run.

### Suggested route

```text
/campaigns/:campaign_id/runs/:run_id
```

### Required sections

#### Run summary

```text
Run status
Started/completed
Duration
Quota/cap reached
Created leads
Duplicates
Rejected
Manual review
Scored
Queued
Drafted
Failures
```

#### Run timeline

Show stage-by-stage progression:

```text
Run requested
Campaign verified
Quota reserved
Google Places search
Place details
Website crawl/contact extraction
Candidates saved
Leads promoted
Enrichment
Scoring
Routing
Draft handoff
Finalized
```

#### Run leads

Show only leads created in this run.

Columns:

```text
Business
Website
Email
Phone
Score
Band
Confidence
Operator state
Review reason
Queue/draft status
Open lead
```

#### Run warnings

Examples:

```text
71 duplicates skipped
1 crawl failure
1 enrichment failure
Quota reached after 75 candidates
```

### Acceptance criteria

- Operator can inspect exactly what happened in one run.
- Run page explains quota reached vs failed.
- Run page shows all leads created by that run.
- Run page exposes failures/warnings without requiring DB access.

---

## Phase 3: Routing idempotency and lifecycle cleanup

### Goal

Make post-scoring routing reliable and visible.

### Scope

Primary files:

```text
lib/workflows/routing.ts
lib/workflows/lead-discovery.ts
lib/crm/queries.ts
status.md
```

Possible DB/RPC files if routing is done through stored procedures:

```text
supabase/migrations/*
```

### Required work

#### 1. Make manual review creation idempotent

Current failure:

```text
duplicate key value violates manual_review_one_pending_per_lead_idx
```

Required behavior:

```text
If pending manual review exists:
  update reason/priority if needed
  log as already_pending
  continue routing
```

#### 2. Make outreach queue creation idempotent

If queue row already exists:

```text
do not insert duplicate
update status/next_send_at only when safe
log already_queued/already_drafted
```

#### 3. Enforce one clear routing outcome per lead

After routing, each lead should have one clear outcome:

```text
manual_review_pending
queued
drafted
blocked_missing_email
blocked_missing_sequence
blocked_missing_inbox
paused_campaign
paused_global
routing_failed
```

#### 4. Add routing events

For each lead, log:

```text
routing_started
routing_completed
routing_blocked
routing_failed
manual_review_created
manual_review_already_pending
queue_created
queue_already_exists
draft_ready
```

#### 5. Prevent silent `scored` limbo

No scored lead should lack:

```text
manual_review_queue row
or outreach_queue row
or visible blocked state
or routing_failed event
```

### Acceptance criteria

- Duplicate manual review insert no longer crashes routing.
- Duplicate queue insert no longer crashes routing.
- Every scored lead has a visible next state.
- Routing failures are visible in frontend.
- No lead silently remains at `scored` without explanation.

---

## Phase 4: Lead detail richness

### Goal

Expose the AI reasoning and evidence behind each lead.

### Existing backend data to surface

```text
lead_enrichment
lead_scores
score_evidence
automation_hypotheses
manual_review_queue
outreach_queue
email_drafts
workflow_events
```

### Required sections

#### Lead header

```text
Business name
Website
Email
Phone
Campaign
Source
Current operator state
```

#### Score panel

```text
Total score
Band
Confidence
Manual review required
Score date
```

#### Score evidence table

```text
Metric
Score / Max
Evidence
Missing data
```

#### Enrichment panel

```text
Website crawl status
Contact extraction result
Emails found
Phones found
Signals found
Missing signals
```

#### Routing panel

```text
Manual review status/reason
Queue status
Draft status
Assigned sequence
Assigned inbox
Next send time
```

#### AI hypothesis panel

```text
Automation opportunities
Suggested pain points
Recommended angle
```

### Acceptance criteria

- User can understand why a lead is valuable.
- User can understand why a lead needs review.
- User can see whether a draft exists.
- User can open a lead from campaign or run views.

---

## Phase 5: Email and notification wording cleanup

### Goal

Make n8n/app notifications match product semantics.

### Required work

#### Email subject mapping

| Current | Better |
|---|---|
| WF-10 Lead Discovery Needs Attention | WF-10 Lead Discovery Finished: Quota Reached |
| Needs Attention for all quota statuses | Needs Attention only for failed/stuck/blocked |
| Status: quota_exhausted | Completed: quota reached |

#### Email body should include

```text
Campaign name
Run ID
Final status
Created leads
Scored leads
Manual review count
Drafted/queued count
Duplicates skipped
First error, if any
Dashboard link
Run detail link
```

### Acceptance criteria

- Quota reached is not treated as failure when leads were created.
- Email includes a direct link to the campaign/run detail.
- Non-technical user can understand if action is required.

---

## Required SQL diagnostics during development

### Latest campaign run

```sql
select
  id,
  campaign_id,
  status,
  candidates_checked,
  duplicates_skipped,
  candidates_rejected,
  candidates_promoted,
  manual_review_candidates,
  crawl_failures,
  error_message,
  started_at,
  completed_at
from discovery_runs
where campaign_id = '<campaign_id>'
order by started_at desc
limit 5;
```

### Leads and operator state source tables

```sql
select
  l.id,
  l.business_name,
  l.email,
  l.phone,
  l.status as lead_status,
  s.total_score,
  s.band,
  s.confidence,
  s.manual_review_required,
  r.reason as manual_review_reason,
  r.review_status,
  q.status as queue_status,
  q.pause_reason,
  q.next_send_at
from leads l
left join lead_scores s on s.lead_id = l.id
left join manual_review_queue r on r.lead_id = l.id and r.review_status = 'pending'
left join outreach_queue q on q.lead_id = l.id
where l.campaign_id = '<campaign_id>'
order by l.created_at desc;
```

### Routing events

```sql
select
  event_type,
  status,
  error_message,
  payload,
  created_at
from workflow_events
where payload::text ilike '%<lead_id>%'
order by created_at asc;
```

### Score evidence

```sql
select
  l.business_name,
  se.metric_name,
  se.score,
  se.max_score,
  se.evidence,
  se.missing_data,
  se.created_at
from leads l
join score_evidence se on se.lead_id = l.id
where l.campaign_id = '<campaign_id>'
order by l.business_name, se.metric_name;
```

---

## Implementation guidance for Codex

### Use Graphify first

Suggested commands:

```bash
graphify query "campaign detail 404 run history leads score evidence manual review outreach queue operator cockpit" --graph graphify-out/graph.json
graphify explain "app/campaigns/[campaign_id]/page.tsx" --graph graphify-out/graph.json
graphify explain "lib/crm/queries.ts" --graph graphify-out/graph.json
graphify explain "lib/workflows/routing.ts" --graph graphify-out/graph.json
graphify path "app/campaigns/page.tsx" "app/campaigns/[campaign_id]/page.tsx" --graph graphify-out/graph.json
```

### Keep changes scoped

Do not rebuild the whole app.

Phase 1 should only fix:

```text
campaign detail 404
campaign cockpit baseline
latest run summary
lead table visibility
operator state mapping
quota_exhausted wording on frontend
```

Do not do all phases at once.

### Validation

Run:

```bash
npm run lint
npm run typecheck
npm run build
git diff --check
```

If tests exist for relevant helpers, run those too.

Update:

```text
status.md
```

before final response.

---

## Definition of done for first implementation pass

The first pass is done when:

```text
1. Open button works for existing campaigns.
2. Campaign detail page loads reliably.
3. Latest run result is visible and human-readable.
4. Quota reached is not shown like a failure if leads were created.
5. Leads from the campaign are visible with score, band, confidence, and operator state.
6. Manual review and queue/draft state are visible.
7. The operator can understand what happened without SQL.
8. Existing discovery/scoring/routing behavior is not broken.
```

---

## Production retest after Phase 1

After deployment:

1. Open the existing campaign:

```text
/campaigns/952cb7ea-37a1-47a2-b443-11cb8ac048db
```

2. Confirm the page loads.

3. Confirm it shows:

```text
Latest run: Completed: quota reached
Candidates checked: 75
Duplicates skipped: 71
Leads created: 3
Scored: 3
Band B: 2
Manual review: at least 1
Draft/queue: at least 1 if present
```

4. Confirm all three leads are visible.

5. Confirm each lead has an operator state.

6. Confirm the Shark Matrix lead explains:

```text
Needs review because enrichment failed / email missing / low confidence.
```

7. Confirm the Be On Top/Wide Wings leads show their score/band and queue/review status.

Do not run a new discovery campaign until this visibility works.
