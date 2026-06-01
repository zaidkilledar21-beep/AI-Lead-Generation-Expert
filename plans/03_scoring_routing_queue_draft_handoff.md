# Phase 3: Scoring, Routing, Queueing, and Draft Handoff

> Superseded ownership note: GitHub Issue #52 preserves backend ownership for WF-01/WF-02/WF-03 and moves WF-04 routing back to n8n. Backend discovery must leave successfully scored leads as `status = 'scored'` for the n8n WF-04 safe source.

## Goal

Move valid discovered leads from `new/enriched/scored` into the correct next operational state: manual review, queued outreach, or paused/archived. Discovery alone is not enough.

## Files to inspect first

- `lib/workflows/lead-discovery.ts`
- `lib/workflows/scoring.ts`
- `lib/workflows/routing.ts`
- `lib/deepseek.ts`
- `n8n/workflows/WF-05-draft-generation.md`
- `n8n/workflows/WF-06-sending-scheduler.md`
- `supabase/migrations/*`
- `status.md`

## Problems to fix

### 1. DeepSeek calls have no timeout

`callDeepSeekJson` should support:
- timeout via `AbortController`,
- compact error messages,
- optional retry once for transient 429/5xx,
- JSON parse error reporting without raw massive payloads.

Do not retry endlessly.

### 2. Scoring failures should isolate per lead

If one lead scoring fails:
- log `WF-03 ICP Scoring` failed,
- mark that lead `review_pending`,
- upsert manual review reason `scoring_failed`,
- continue other leads,
- do not leave discovery run stuck.

### 3. Routing must run after successful scoring

After each lead is scored in `processLeadEnrichmentAndScoring`, call `routeLead(leadId)`.

The result should be logged:
- `wf_04_routing`
- status `completed` or `failed`
- payload includes lead_id, route status, reasons.

### 4. Global pause should not break discovery

Current global pause should prevent actual sending, not destroy discovery finalization.

Required behavior:
- If global outreach is paused:
  - still allow leads to be scored,
  - still allow manual review records,
  - either queue as paused/pending or leave as review_pending with reason `global_outreach_paused`,
  - do not throw an uncaught error that fails the whole discovery run.
- WF-06 remains responsible for not sending while paused.

### 5. Queue only truly reachable leads

`routeLead` should only create `outreach_queue` rows when:
- lead has valid email,
- score/band meets route policy,
- sequence exists,
- no reply exists,
- lead not suppressed,
- global sending pause behavior is handled safely.

### 6. Draft generation handoff

Do not force WF-05 to run inside discovery unless the app already supports that.

Minimum requirement:
- Lead reaches `outreach_queue.status = 'queued'` where WF-05 source query can pick it up.
- Manual review leads are visible in `manual_review_queue`.

Optional controlled improvement:
- Add a manual action or API endpoint to trigger draft generation for one queued lead after discovery, but do not send email.

## Acceptance criteria

- Scored leads do not just sit in `scored` forever.
- B-band reachable leads route to queue when policy allows.
- A-band/low-confidence/missing-contact leads route to manual review.
- Global pause does not crash discovery.
- DeepSeek timeout cannot leave a run hanging.
- Workflow events show enrichment, scoring, and routing per lead.
