# Frontend Run Visibility Production QA Checklist

Use this after deploying the Phase 4 frontend run visibility changes.

1. Create a fresh active Google Places campaign with one narrow niche and one target city.
2. Open `/campaigns`, click `Run now`, and confirm the card shows requested/running feedback without double-clicking.
3. During the run, confirm the campaign card shows latest status, candidate/lead/review/rejected counts, and the latest checkpoint.
4. Open the campaign detail page, switch to `Run history`, and confirm the run row shows candidates, promoted leads, manual review, rejected/crawl failures, Places calls, duration, and status.
5. In the same tab, confirm `Latest run checkpoints` shows recent WF-10 events with status, timestamp, and compact payload summary.
6. In Supabase, confirm the latest `discovery_runs` row for the campaign is terminal (`completed` or `failed`) and has `completed_at`.
7. Compare frontend counts with SQL counts for `lead_candidates`, `leads`, `lead_enrichment`, `lead_scores`, `manual_review_queue`, and `outreach_queue`.
8. If global outreach pause is enabled, confirm eligible discovery leads route to pending manual review and the frontend manual-review count/reason reflects that state.
