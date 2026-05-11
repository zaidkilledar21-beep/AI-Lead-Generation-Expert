---
graphify_id: "app_audit_logcrmaction"
graphify_type: "Unknown"
graphify_community: "0"
tags:
  - graphify
  - generated
---

# logCrmAction()

## Metadata

- Type: `Unknown`
- Community: [[10_Graphify/Communities/Community 0|Community 0]]

## Source fields

- No source fields exposed in graph metadata.

## Outgoing relationships

- `calls` → [[10_Graphify/Nodes/createSupabaseServiceClient()|createSupabaseServiceClient()]]

## Incoming relationships

- [[10_Graphify/Nodes/createInboxAction()|createInboxAction()]] → `calls`
- [[10_Graphify/Nodes/updateInboxAction()|updateInboxAction()]] → `calls`
- [[10_Graphify/Nodes/archiveInboxAction()|archiveInboxAction()]] → `calls`
- [[10_Graphify/Nodes/updateNotificationSettingsAction()|updateNotificationSettingsAction()]] → `calls`
- [[10_Graphify/Nodes/sendTestNotificationAction()|sendTestNotificationAction()]] → `calls`
- [[10_Graphify/Nodes/createSequenceAction()|createSequenceAction()]] → `calls`
- [[10_Graphify/Nodes/updateSequenceAction()|updateSequenceAction()]] → `calls`
- [[10_Graphify/Nodes/archiveSequenceAction()|archiveSequenceAction()]] → `calls`
- [[10_Graphify/Nodes/createSequenceStepAction()|createSequenceStepAction()]] → `calls`
- [[10_Graphify/Nodes/updateSequenceStepAction()|updateSequenceStepAction()]] → `calls`
- [[10_Graphify/Nodes/archiveSequenceStepAction()|archiveSequenceStepAction()]] → `calls`
- [[10_Graphify/Nodes/audit.ts|audit.ts]] → `contains`
- [[10_Graphify/Nodes/actions.ts|actions.ts]] → `imports`
- [[10_Graphify/Nodes/campaigns.ts|campaigns.ts]] → `imports`
- [[10_Graphify/Nodes/inbox.ts|inbox.ts]] → `imports`
- [[10_Graphify/Nodes/leads.ts|leads.ts]] → `imports`
- [[10_Graphify/Nodes/reviews.ts|reviews.ts]] → `imports`
- [[10_Graphify/Nodes/settings.ts|settings.ts]] → `imports`
- [[10_Graphify/Nodes/createCrmCampaign()|createCrmCampaign()]] → `calls`
- [[10_Graphify/Nodes/updateCrmCampaign()|updateCrmCampaign()]] → `calls`
- [[10_Graphify/Nodes/duplicateCrmCampaign()|duplicateCrmCampaign()]] → `calls`
- [[10_Graphify/Nodes/archiveCrmCampaign()|archiveCrmCampaign()]] → `calls`
- [[10_Graphify/Nodes/markCampaignManualRunRequested()|markCampaignManualRunRequested()]] → `calls`
- [[10_Graphify/Nodes/markReplyHandled()|markReplyHandled()]] → `calls`
- [[10_Graphify/Nodes/approveCrmLeadForOutreach()|approveCrmLeadForOutreach()]] → `calls`
- [[10_Graphify/Nodes/updateCrmLeadStatus()|updateCrmLeadStatus()]] → `calls`
- [[10_Graphify/Nodes/saveCrmLeadNote()|saveCrmLeadNote()]] → `calls`
- [[10_Graphify/Nodes/assignCrmLead()|assignCrmLead()]] → `calls`
- [[10_Graphify/Nodes/overrideCrmLeadBand()|overrideCrmLeadBand()]] → `calls`
- [[10_Graphify/Nodes/completeManualReview()|completeManualReview()]] → `calls`
- [[10_Graphify/Nodes/updateGlobalOutreachSettings()|updateGlobalOutreachSettings()]] → `calls`
- [[10_Graphify/Nodes/updateInboxDailyLimit()|updateInboxDailyLimit()]] → `calls`
- [[10_Graphify/Nodes/assignLeadAction()|assignLeadAction()]] → `calls`
- [[10_Graphify/Nodes/assignReplyAction()|assignReplyAction()]] → `calls`
- [[10_Graphify/Nodes/updateLeadNotesAction()|updateLeadNotesAction()]] → `calls`

## Codex note

Use this node to identify likely source files/symbols. Read exact source files before editing.
