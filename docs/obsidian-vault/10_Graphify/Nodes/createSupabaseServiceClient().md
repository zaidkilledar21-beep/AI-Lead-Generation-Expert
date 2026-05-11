---
graphify_id: "supabase_server_createsupabaseserviceclient"
graphify_type: "Unknown"
graphify_community: "0"
tags:
  - graphify
  - generated
---

# createSupabaseServiceClient()

## Metadata

- Type: `Unknown`
- Community: [[10_Graphify/Communities/Community 0|Community 0]]

## Source fields

- No source fields exposed in graph metadata.

## Outgoing relationships

- `calls` → [[10_Graphify/Nodes/getRequiredEnv()|getRequiredEnv()]]

## Incoming relationships

- [[10_Graphify/Nodes/triggerCampaignManualRun()|triggerCampaignManualRun()]] → `calls`
- [[10_Graphify/Nodes/manualImportLeadsAction()|manualImportLeadsAction()]] → `calls`
- [[10_Graphify/Nodes/createInboxAction()|createInboxAction()]] → `calls`
- [[10_Graphify/Nodes/updateInboxAction()|updateInboxAction()]] → `calls`
- [[10_Graphify/Nodes/archiveInboxAction()|archiveInboxAction()]] → `calls`
- [[10_Graphify/Nodes/updateNotificationSettingsAction()|updateNotificationSettingsAction()]] → `calls`
- [[10_Graphify/Nodes/updateFounderProfileAction()|updateFounderProfileAction()]] → `calls`
- [[10_Graphify/Nodes/sendTestNotificationAction()|sendTestNotificationAction()]] → `calls`
- [[10_Graphify/Nodes/createSequenceAction()|createSequenceAction()]] → `calls`
- [[10_Graphify/Nodes/updateSequenceAction()|updateSequenceAction()]] → `calls`
- [[10_Graphify/Nodes/archiveSequenceAction()|archiveSequenceAction()]] → `calls`
- [[10_Graphify/Nodes/createSequenceStepAction()|createSequenceStepAction()]] → `calls`
- [[10_Graphify/Nodes/updateSequenceStepAction()|updateSequenceStepAction()]] → `calls`
- [[10_Graphify/Nodes/archiveSequenceStepAction()|archiveSequenceStepAction()]] → `calls`
- [[10_Graphify/Nodes/EnrichLeadInput|EnrichLeadInput]] → `calls`
- [[10_Graphify/Nodes/auth.ts|auth.ts]] → `imports`
- [[10_Graphify/Nodes/audit.ts|audit.ts]] → `imports`
- [[10_Graphify/Nodes/logCrmAction()|logCrmAction()]] → `calls`
- [[10_Graphify/Nodes/getActiveDashboardUserRole()|getActiveDashboardUserRole()]] → `calls`
- [[10_Graphify/Nodes/campaigns.ts|campaigns.ts]] → `imports`
- [[10_Graphify/Nodes/createCrmCampaign()|createCrmCampaign()]] → `calls`
- [[10_Graphify/Nodes/updateCrmCampaign()|updateCrmCampaign()]] → `calls`
- [[10_Graphify/Nodes/duplicateCrmCampaign()|duplicateCrmCampaign()]] → `calls`
- [[10_Graphify/Nodes/archiveCrmCampaign()|archiveCrmCampaign()]] → `calls`
- [[10_Graphify/Nodes/getCampaignReadiness()|getCampaignReadiness()]] → `calls`
- [[10_Graphify/Nodes/markCampaignManualRunRequested()|markCampaignManualRunRequested()]] → `calls`
- [[10_Graphify/Nodes/inbox.ts|inbox.ts]] → `imports`
- [[10_Graphify/Nodes/markReplyHandled()|markReplyHandled()]] → `calls`
- [[10_Graphify/Nodes/leads.ts|leads.ts]] → `imports`
- [[10_Graphify/Nodes/approveCrmLeadForOutreach()|approveCrmLeadForOutreach()]] → `calls`
- [[10_Graphify/Nodes/saveCrmLeadNote()|saveCrmLeadNote()]] → `calls`
- [[10_Graphify/Nodes/assignCrmLead()|assignCrmLead()]] → `calls`
- [[10_Graphify/Nodes/overrideCrmLeadBand()|overrideCrmLeadBand()]] → `calls`
- [[10_Graphify/Nodes/reviews.ts|reviews.ts]] → `imports`
- [[10_Graphify/Nodes/completeManualReview()|completeManualReview()]] → `calls`

## Codex note

Use this node to identify likely source files/symbols. Read exact source files before editing.
