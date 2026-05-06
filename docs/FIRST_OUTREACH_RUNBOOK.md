# First Outreach Runbook

Use this sequence before enabling real outreach beyond a single controlled test.

1. Verify app env vars: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `APP_BASE_URL`, `N8N_API_KEY`, `N8N_BASE_URL`, `N8N_DISCOVERY_WEBHOOK_PATH`.
2. Apply Supabase migrations through `011_pass_6_contract_closure.sql`.
3. Run `supabase/validation/pass_6_contract_checks.sql`; each query should return zero rows.
4. Import n8n workflows from `n8n/importable-json/`.
5. Keep `app_settings.global_outreach.paused = true`.
6. Create a test campaign in the CRM.
7. Use manual import or click `Request n8n run` for controlled discovery.
8. Run enrichment, scoring, and routing workflows for the test lead.
9. Review the lead in the CRM.
10. Run WF-05, then edit and approve the generated draft.
11. Temporarily disable global pause for the test window.
12. Let WF-06 send exactly one approved draft from a test inbox.
13. Reply from the test recipient inbox.
14. Run WF-07 and verify `reply_events` has canonical intent, summary, suggested next action, and `ai_draft_reply`.
15. Verify `outreach_queue` for that lead is paused/replied and no future automated sends are due.
16. Open CRM inbox and confirm reply context plus AI draft displays.
17. Mark the reply handled, won, or lost.
18. Check analytics and WF-08 weekly metrics.
19. Re-enable global pause unless proceeding into a deliberately limited production batch.
