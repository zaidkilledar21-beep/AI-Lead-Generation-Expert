---
graphify_id: "app_auth_requiredashboardwriteaccess"
graphify_type: "Unknown"
graphify_community: "0"
tags:
  - graphify
  - generated
---

# requireDashboardWriteAccess()

## Metadata

- Type: `Unknown`
- Community: [[10_Graphify/Communities/Community 0|Community 0]]

## Source fields

- No source fields exposed in graph metadata.

## Outgoing relationships

- `calls` → [[10_Graphify/Nodes/requireDashboardRole()|requireDashboardRole()]]

## Incoming relationships

- [[10_Graphify/Nodes/triggerCampaignManualRun()|triggerCampaignManualRun()]] → `calls`
- [[10_Graphify/Nodes/manualImportLeadsAction()|manualImportLeadsAction()]] → `calls`
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
- [[10_Graphify/Nodes/auth.ts|auth.ts]] → `contains`
- [[10_Graphify/Nodes/actions.ts|actions.ts]] → `imports`
- [[10_Graphify/Nodes/campaigns.ts|campaigns.ts]] → `imports`
- [[10_Graphify/Nodes/duplicateCrmCampaign()|duplicateCrmCampaign()]] → `calls`
- [[10_Graphify/Nodes/archiveCrmCampaign()|archiveCrmCampaign()]] → `calls`

## Codex note

Use this node to identify likely source files/symbols. Read exact source files before editing.
