# WF-10 Lead Discovery

Purpose: generate near-zero-cost lead candidates from co-founder campaign filters using Google Places only, then hand valid leads to WF-01.

MVP source rules:

- Allowed: Google Places API, direct website crawl of `websiteUri`, Supabase, n8n.
- Disabled: Brave Search, SerpAPI, Apify, proxies, paid scraping services, paid lead databases, generic search fallback.

Trigger:

1. Manual Trigger during setup.
2. Schedule Trigger claims every due active scheduled campaign.
3. CRM manual-run webhook in n8n: `POST /webhook/wf-10-lead-discovery`.
4. Internal app callback from WF-10: `POST /api/workflows/discovery/run`.

Input shape:

```json
{
  "campaign_id": "uuid",
  "dry_run": false,
  "trigger_type": "manual"
}
```

Node Skeleton:

1. Trigger
   - Schedule trigger first uses `trigger_type = schedule` without a campaign ID.
   - The app atomically claims due campaigns and advances each `next_run_at`.
   - Split the returned campaigns and call the app once per explicit campaign ID.
   - CRM webhook uses `trigger_type = manual` and passes `campaign_id` from the CRM payload.
   - Protect the CRM webhook with n8n Header Auth using the `x-n8n-api-key` header.

2. Authenticate App Callback
   - Use `x-n8n-api-key` for app route calls.
   - Prefer `$env.N8N_API_KEY`; keep `$env.N8N_WORKFLOW_API_KEY` as a compatibility fallback.

3. Supabase Select `campaigns`
   - Claim every due `status = active` campaign whose cadence is not `manual`.
   - Required campaign fields:
     - `niche`
     - `region`
     - `keywords`
     - `excluded_keywords`
     - `target_business_types`
     - `max_leads_per_day <= 30`
     - `max_candidates_per_day <= 75`
     - `max_details_calls_per_day <= 100`
     - `max_total_places_calls_per_day <= 150`
     - `max_discovery_runs_per_day = 1`
     - all paid fallback flags false.

4. Reserve Daily Run Quota
   - Call Supabase RPC `reserve_places_quota`.
   - Counter: `run_count`.
   - Stop if run count cap is reached.

5. Supabase Insert `discovery_runs`
   - `status = running`
   - `source = google_places`.

6. Generate Places Queries
   - Deterministic query text from:
     - niche
     - region
     - target business types
     - keywords.
   - Keep to a small set of high-intent queries.

7. Google Places Text Search IDs-only
   - Endpoint: Places Text Search.
   - Field mask: `places.id,nextPageToken`.
   - Increment `places_text_search_calls` and `total_places_calls`.
   - Do not request display fields in this step.

8. Dedupe Before Details
   - Skip IDs already found in:
     - `leads.google_place_id`
     - `lead_candidates.google_place_id`
   - Increment duplicate count.

9. Reserve Candidate + Details Quota
   - Stop if:
     - candidates checked >= 75
     - Details calls >= 100
     - final leads >= 30
     - total Places calls >= 150.

10. Google Place Details
    - Allowed field mask only:
      - `id`
      - `displayName`
      - `formattedAddress`
      - `nationalPhoneNumber`
      - `websiteUri`
      - `rating`
      - `userRatingCount`
      - `googleMapsUri`
    - Never request:
      - photos
      - reviews
      - opening hours
      - editorial summaries
      - generative summaries
      - atmosphere data
      - advanced/enterprise-only extras.

11. Normalize Candidate
    - `business_name = displayName.text`
    - `website = websiteUri`
    - `phone = nationalPhoneNumber`
    - `address = formattedAddress`
    - `rating = rating`
    - `review_count = userRatingCount`
    - `google_maps_url = googleMapsUri`
    - `source = google_places`
    - Build `dedupe_key`.

12. Candidate Validation
    - Reject missing business name or address.
    - Reject excluded keywords.
    - Reject suppressed contacts/domains.
    - Candidates without `websiteUri` become `manual_review`, not automatic leads.

13. VPS Website Crawl
    - Only crawl Google Places `websiteUri`.
    - Max depth: 1.
    - Max pages per lead: 6.
    - Timeout: 12 seconds.
    - Max bytes per page: 500 KB.
    - HTML only.
    - Skip media/files.
    - Block private, loopback, link-local, and metadata IPs.
    - Respect robots.txt when applicable.
    - Log crawl failures without failing the whole run.

14. Supabase Insert `lead_candidates`
    - Store source attribution and limited raw Place payload.
    - Store crawl status and summary.

15. Call WF-01 Lead Intake
    - Send only promotable `leads[]`.
    - Include:
      - `campaign_id`
      - `discovery_run_id`
      - `candidate_id`
      - `google_place_id`
      - `dedupe_key`
      - `source_attribution`.

16. Supabase Update `discovery_runs`
    - Count:
      - candidates checked
      - Details calls
      - total Places calls
      - duplicates skipped
      - manual review candidates
      - promoted leads
      - crawl failures
    - Terminal status:
      - `completed`
      - `failed`
      - `quota_exhausted`
      - `paused`.

17. Supabase Insert `workflow_events`
    - `workflow_name = WF-10 Lead Discovery`
    - redact API keys, raw HTML, headers, and full PII payloads.

18. Send founder notification
    - Use the app response `notification.subject` and `notification.body`.
    - Treat `quota_exhausted` with promoted leads as `Completed: quota reached`.
    - Treat `quota_exhausted` with no promoted leads as `Quota reached: no new leads`.
    - Reserve `Needs Attention` for failed, stuck, blocked, or paused runs.
    - Include campaign detail and run detail links built from `APP_BASE_URL`.

Success criteria:

- No paid fallback source is called.
- Text Search is IDs-only before Details.
- Details uses only the approved field mask.
- Quotas stop the run before cost exposure.
- Candidates without websites are kept for manual review.
- Valid leads enter WF-01, then WF-02.
