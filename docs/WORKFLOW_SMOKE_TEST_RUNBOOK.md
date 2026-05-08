# Workflow Smoke Test Runbook

Use this checklist to prove the CRM, Supabase, Gmail, DeepSeek, and n8n workflows work together live before real outreach.

This is an operational validation runbook only. It does not define runtime behavior, new app features, migrations, or workflow implementation changes.

## Scope

- WF-10 lead discovery from the CRM
- WF-02 enrichment, WF-03 scoring, and WF-04 routing
- WF-05 draft generation
- WF-06 controlled sending
- WF-07 reply detection
- CRM review, inbox, lead detail, and analytics verification
- Global pause safety

## Preconditions

Complete these before starting the smoke test.

- [ ] `app_settings.global_outreach.paused` is `true`.
- [ ] `supabase/validation/pass_6_contract_checks.sql` returns zero rows.
- [ ] Updated n8n workflows are imported and published.
- [ ] Vercel production deployment is complete.
- [ ] n8n workflow credentials are valid.
- [ ] Supabase service credentials are configured for n8n.
- [ ] Gmail test sender inbox is connected.
- [ ] Test recipient inbox is available and controlled by the operator.
- [ ] DeepSeek credentials are valid where WF-05/WF-07 require them.
- [ ] CRM dashboard access is available for the operator running the test.

## Test Data Guardrails

- [ ] Use a test campaign name that clearly identifies the run, such as `Smoke Test - YYYY-MM-DD`.
- [ ] Use safe targeting with a very small cap.
- [ ] Use a test inbox only.
- [ ] Approve exactly one draft.
- [ ] Send exactly one email.
- [ ] Re-enable global pause immediately after the one-email send window.

## Smoke Test Sequence

### 1. Confirm Global Pause

Action:

- [ ] In CRM or Supabase, confirm global outreach pause is enabled.

Expected evidence:

- [ ] Global pause reads as ON/paused.
- [ ] WF-06 does not send while pause is enabled.

### 2. Create a Test Campaign

Action:

- [ ] Create a small test campaign in CRM.
- [ ] Configure target geography, inbox assignment, daily/discovery caps, and sequence routing.
- [ ] Confirm the campaign readiness card is not blocked for missing geography or n8n manual-run configuration.

Expected evidence:

- [ ] Campaign exists in CRM.
- [ ] Campaign has usable targeting.
- [ ] Campaign has an active inbox or valid assigned inbox.
- [ ] Campaign has sequence/routing configured.
- [ ] Campaign caps are configured.

### 3. Trigger WF-10 from CRM

Action:

- [ ] From the campaign detail page, trigger a manual n8n discovery run.

Expected evidence:

- [ ] n8n WF-10 starts.
- [ ] `discovery_runs` row is created or updated.
- [ ] `workflow_events` row is logged.
- [ ] A lead/candidate is created, or the candidate is correctly skipped with traceable reason.
- [ ] CRM campaign run history reflects the request/result.

### 4. Run Enrichment, Scoring, and Routing

Action:

- [ ] Run or wait for WF-02 enrichment.
- [ ] Run or wait for WF-03 scoring.
- [ ] Run or wait for WF-04 routing.

Expected evidence:

- [ ] Lead receives enrichment data.
- [ ] Lead receives ICP score and band.
- [ ] Lead appears in pipeline or review queue with the expected lifecycle status.
- [ ] Any manual review requirement is visible in CRM.

### 5. Run WF-05 Draft Generation

Action:

- [ ] Run or wait for WF-05 to process the routed lead.

Expected evidence:

- [ ] `email_drafts` row is created.
- [ ] Draft appears in lead detail or review queue.
- [ ] Draft is pending approval unless campaign rules explicitly allow auto-approval.
- [ ] Draft includes subject/body content or a clear block reason.
- [ ] WF-05 workflow event is traceable.

### 6. Approve Exactly One Draft

Action:

- [ ] In CRM review queue or lead detail, edit the draft if needed.
- [ ] Approve exactly one draft.

Expected evidence:

- [ ] Draft `approval_status` is `approved`.
- [ ] Draft is not sent while global pause is ON.
- [ ] Approval action is visible in CRM history/audit surfaces where available.

### 7. Send Exactly One Email

Action:

- [ ] Temporarily disable global pause.
- [ ] Allow WF-06 to send one eligible approved draft.
- [ ] Immediately re-enable global pause.

Expected evidence:

- [ ] Exactly one Gmail email is sent.
- [ ] `outreach_events` row is written.
- [ ] `email_drafts.sent` state is updated.
- [ ] `outreach_queue` is updated.
- [ ] Provider message/thread ID is stored when available.
- [ ] No second email is sent.

### 8. Reply from the Test Recipient

Action:

- [ ] Reply to the sent email from the controlled test recipient inbox.

Expected evidence:

- [ ] Reply appears in the Gmail inbox monitored by WF-07.
- [ ] Reply is on the expected provider thread when possible.

### 9. Run WF-07 Reply Detection

Action:

- [ ] Run or wait for WF-07 to detect and classify the reply.

Expected `reply_events` evidence:

- [ ] `lead_id` is populated.
- [ ] `intent_classification` is populated.
- [ ] `summary` is populated, or missing summary is honestly represented in CRM.
- [ ] `suggested_next_action` is populated where available.
- [ ] `ai_draft_reply` is populated or CRM shows a clear missing-draft state.
- [ ] `requires_human_review` is `true` when operator review is required.
- [ ] Provider thread/message ID is populated when available.

Expected queue evidence:

- [ ] Future sends for the lead are paused or marked replied.
- [ ] No additional due sends remain for that lead.

Expected CRM evidence:

- [ ] Inbox shows the reply.
- [ ] Review queue shows reply review if required.
- [ ] Lead detail shows reply context and AI draft/missing-draft state.

### 10. Mark Reply Handled, Won, or Lost

Action:

- [ ] Use CRM inbox or review actions to mark the reply handled, won, or lost.

Expected evidence:

- [ ] Reply handled state updates.
- [ ] Lead status updates.
- [ ] Manual review item closes when applicable.
- [ ] Timeline/audit surfaces show the operator action where available.
- [ ] Analytics updates with at least one send and one reply signal.

## Hard Stop Conditions

Stop the smoke test immediately if any condition occurs.

- [ ] WF-06 sends more than one email.
- [ ] WF-06 sends while global pause is ON.
- [ ] WF-07 fails to pause future outreach after a reply.
- [ ] Reply is matched to the wrong lead.
- [ ] Provider thread/message ID is missing and fallback matching also fails.
- [ ] CRM state contradicts source-of-truth Supabase state.

## Final Acceptance Criteria

The smoke test passes only when all criteria are true.

- [ ] One full lead lifecycle completes from campaign discovery to reply handling.
- [ ] No automated second email sends after reply.
- [ ] CRM UI reflects Supabase state without manual DB edits.
- [ ] Global pause blocks sending.
- [ ] Analytics receives at least one send signal.
- [ ] Analytics receives at least one reply signal.
- [ ] Workflow events provide traceability for each major step.
- [ ] Inbox and review surfaces show the reply and required operator actions.

## Evidence to Capture

Record the following before declaring the smoke test complete.

- [ ] Test campaign ID.
- [ ] Test lead ID.
- [ ] Discovery run ID.
- [ ] Email draft ID.
- [ ] Outreach event ID.
- [ ] Reply event ID.
- [ ] n8n execution IDs for WF-10, WF-05, WF-06, and WF-07.
- [ ] Confirmation that global pause was re-enabled after the send window.
- [ ] Screenshot or note confirming analytics send/reply visibility.

## Post-Test Decision

If the smoke test passes:

- [ ] Status: controlled production batch ready.
- [ ] Batch size: 5-10 leads maximum.
- [ ] Manual approval remains ON.
- [ ] Global pause remains actively monitored.

If the smoke test fails:

- [ ] Do not start production outreach.
- [ ] Keep or re-enable global pause.
- [ ] Fix only the failing module or workflow path.
- [ ] Repeat this smoke test from the relevant failed step.
