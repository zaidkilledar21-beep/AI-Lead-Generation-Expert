# WF-09 Dry Run Acceptance

Purpose: validate the n8n setup before live outreach.

Run with:

```sql
select value from app_settings where key = 'global_outreach';
```

Keep `paused = true` until every item below passes.

## Dry Run Checklist

1. WF-10 campaign discovery
   - Create one paused test campaign from the dashboard.
   - Activate it only for the dry run.
   - Confirm fallback flags are all false:
     - `fallback_search_enabled`
     - `apify_enabled`
     - `serpapi_enabled`
     - `brave_enabled`
     - `paid_scraping_enabled`
   - Run `WF-10 Lead Discovery` with `dry_run = true`.
   - Confirm Google Places Text Search uses field mask `places.id,nextPageToken`.
   - Confirm Place Details uses only the approved field mask.
   - Confirm no Brave, SerpAPI, Apify, proxy, paid scraping, paid database, or generic search call is present.

2. Discovery quotas
   - Confirm run count stops at `1` per day.
   - Confirm candidates checked stops at `75`.
   - Confirm Place Details calls stop at `100`.
   - Confirm total Places calls stop at `150`.
   - Confirm final promoted leads stop at `30`.
   - Confirm quota blocks write `workflow_events` and `discovery_runs.status = quota_exhausted`.

3. Candidate dedupe and manual review
   - Rerun the same Places IDs.
   - Confirm duplicate `google_place_id` values do not create duplicate leads.
   - Confirm duplicate website/phone/name-location records are skipped.
   - Confirm candidates without `websiteUri` are saved with `candidate_status = manual_review`.
   - Confirm they are not auto-promoted to outreach.

4. VPS website crawl
   - Confirm only Google Places `websiteUri` is crawled.
   - Confirm max depth, page, byte, timeout, redirect, HTML-only, and media/file skip limits.
   - Confirm failed crawls are logged without raw HTML or secrets.

5. Lead intake
   - Import 10-25 test leads.
   - Rerun same import.
   - Confirm duplicates do not grow.
   - Confirm WF-10 generated leads preserve:
     - `campaign_id`
     - `discovery_run_id`
     - `candidate_id`
     - `google_place_id`
     - `source_attribution`.

6. Enrichment
   - Run enrichment.
   - Confirm successful rows in `lead_enrichment`.
   - Confirm failed websites create failed enrichment rows and `workflow_events`.
   - Confirm WF-10 crawl summaries are reused when available.

7. Scoring
   - Run scoring.
   - Confirm every scored lead has:
     - one `lead_scores` row
     - eight `score_evidence` rows
     - one `automation_hypotheses` row
   - Confirm scoring does not infer review text, social signals, employee count, revenue, or paid enrichment data.

8. Routing
   - Confirm Band A leads enter `manual_review_queue`.
   - Confirm review reruns do not duplicate pending review rows.
   - Confirm global pause prevents live queue approval.

9. Drafting
   - Generate drafts only.
   - Confirm invalid drafts create `send_blocks`.
   - Confirm Band A Step 1 remains `pending`.

10. Sending
   - Use only internal/founder test recipient.
   - Temporarily unpause global outreach only for the internal test.
   - Confirm `outreach_events.status = sent`.
   - Confirm inbox daily sent increments.

11. Reply detection
   - Reply from the test recipient.
   - Confirm `reply_events` row exists.
   - Confirm `outreach_queue.status = replied`.
   - Confirm no follow-up sends.
   - Confirm founder notification arrives.

## Live Outreach Unlock

Only after dry run:

```sql
update app_settings
set value = jsonb_set(value, '{paused}', 'false'::jsonb)
where key = 'global_outreach';
```
