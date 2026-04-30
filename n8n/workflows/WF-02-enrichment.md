# WF-02 Enrichment

Purpose: enrich new leads with website, contact, and workflow signals while reusing WF-10 crawl evidence when available.

Trigger:

1. Schedule Trigger every 30-60 minutes.
2. Manual Trigger for testing.

Supabase source query:

```sql
select id
from leads
where status = 'new'
  and website is not null
order by created_at asc
limit 25;
```

Node Skeleton:

1. Schedule Trigger

2. Supabase Select `leads`
   - Pull oldest `status = new` leads with websites.

3. Split In Batches
   - Batch size: `5`.

4. HTTP Request `Fetch Homepage`
   - URL: lead website.
   - Timeout: 12 seconds.
   - Continue on fail.
   - Only direct website crawl is allowed in MVP.
   - Do not call paid enrichment, search fallback, Apify, SerpAPI, Brave, or proxy services.
   - If linked `lead_candidates.website_crawl_status = success`, reuse its crawl summary before recrawling.

5. IF Fetch Failed
   - Insert `lead_enrichment`:
     - `lead_id`
     - `status = failed`
     - `enrichment_confidence = low`
     - `error_message`
   - Insert `workflow_events`.
   - Continue next lead.

6. HTML/Text Extract
   - Extract title, meta description, emails, phones, WhatsApp links.
   - Detect forms, booking links, FAQ, chat widgets, calendar tools.

7. Optional HTTP Requests
   - Try `/contact`, `/contact-us`, `/about`, `/services`.
   - Continue on fail.
   - Keep within crawl limits:
     - max depth `1`
     - max pages `6`
     - max bytes per page `500 KB`
     - HTML only
     - skip files/media
     - block private/loopback/link-local targets
     - respect robots.txt where applicable.

8. Set `enrichment_record`
   - `services_offered`
   - `contact_page_url`
   - `booking_link_found`
   - `contact_form_found`
   - `email_found`
   - `phone_found`
   - `whatsapp_found`
   - `social_links`
   - `detected_tools`
   - `raw_scrape_summary`
   - `enrichment_confidence`
   - `status = completed`

9. Supabase Insert `lead_enrichment`

10. Supabase Update `leads`
    - `status = enriched`
    - Fill missing `email`, `phone`, `whatsapp` if extracted.

11. Supabase Insert `workflow_events`
    - `status = completed`.

Success criteria:

- Failed websites are logged, not silently dropped.
- Successful leads move to `enriched`.
- Workflow can be rerun safely.
