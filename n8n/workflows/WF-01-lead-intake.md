# WF-01 Lead Intake

Purpose: create canonical lead records from WF-10 generated lead batches or controlled manual imports.

Trigger options:

1. Manual Trigger for first setup.
2. Webhook `POST /api/workflows/lead-intake` for WF-10 handoff.

Input shape:

```json
{
  "source_workflow": "WF-10",
  "campaign_id": "uuid",
  "discovery_run_id": "uuid",
  "niche": "dental clinics",
  "location": "Dubai",
  "max_results": 30,
  "leads": [
    {
      "candidate_id": "uuid",
      "business_name": "Example Clinic",
      "source": "google_places",
      "google_place_id": "ChIJ...",
      "website": "https://example.com",
      "google_maps_url": "https://maps.google.com/...",
      "phone": "+971...",
      "rating": 4.7,
      "review_count": 82,
      "address": "Dubai, UAE",
      "source_attribution": {
        "provider": "google_places",
        "query": "dental clinics in Dubai"
      }
    }
  ]
}
```

Node Skeleton:

1. Trigger

2. Authenticate request
   - Require `x-n8n-api-key` or Bearer token for app endpoints.

3. Set `batch_config`
   - Normalize `niche`, `location`, `max_results`.
   - Cap `max_results` at `30` during MVP.
   - Refuse paid fallback source flags.

4. Split In Batches
   - Batch size: `10`.

5. Normalize Lead
   - Required: `business_name`.
   - Normalize website to `https://...`.
   - Normalize email lowercase.
   - Preserve source attribution, campaign ID, run ID, candidate ID, Google Place ID, and Google Maps URL.

6. Supabase Insert `leads`
   - Insert fields:
     - `business_name`
     - `website`
     - `country`
     - `city`
     - `niche`
     - `source`
     - `campaign_id`
     - `candidate_id`
     - `discovery_run_id`
     - `google_place_id`
     - `dedupe_key`
     - `source_attribution`
     - `google_maps_url`
     - `linkedin_url`
     - `phone`
     - `email`
     - `whatsapp`
     - `rating`
     - `review_count`
     - `address`
     - `status = new`
   - Continue on fail.
   - Treat Postgres `23505` as duplicate, not fatal.

7. Supabase Update `lead_candidates`
   - Set `candidate_status = promoted`.
   - Save `final_lead_id`.

8. Supabase Insert `workflow_events`
   - `workflow_name = WF-01 Lead Intake`
   - `event_type = lead_intake`
   - `status = completed|skipped|failed`
   - Include created/duplicate/error counts in `payload`.

Output:

```json
{
  "created": 0,
  "duplicates": 0,
  "errors": []
}
```

Success criteria:

- Rerunning same batch does not create duplicates.
- Leads are created with `status = new`.
- WF-01 does not call discovery providers.
- Duplicates are counted.
