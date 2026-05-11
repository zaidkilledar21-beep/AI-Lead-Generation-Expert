---
graphify_id: "lib_app_campaigns_ts"
graphify_type: "Unknown"
graphify_community: "12"
tags:
  - graphify
  - generated
---

# campaigns.ts

## Metadata

- Type: `Unknown`
- Community: [[10_Graphify/Communities/Community 12|Community 12]]

## Source fields

- No source fields exposed in graph metadata.

## Outgoing relationships

- `imports_from` → [[10_Graphify/Nodes/contracts.ts|contracts.ts]]
- `imports` → [[10_Graphify/Nodes/CampaignConfigInput|CampaignConfigInput]]
- `imports` → [[10_Graphify/Nodes/assertCampaignConfigInput()|assertCampaignConfigInput()]]
- `imports_from` → [[10_Graphify/Nodes/auth.ts|auth.ts]]
- `imports_from` → [[10_Graphify/Nodes/audit.ts|audit.ts]]
- `imports` → [[10_Graphify/Nodes/logCrmAction()|logCrmAction()]]
- `imports` → [[10_Graphify/Nodes/requireDashboardWriteAccess()|requireDashboardWriteAccess()]]
- `imports` → [[10_Graphify/Nodes/requireAppActor()|requireAppActor()]]
- `imports_from` → [[10_Graphify/Nodes/server.ts|server.ts]]
- `imports` → [[10_Graphify/Nodes/createSupabaseServiceClient()|createSupabaseServiceClient()]]
- `contains` → [[10_Graphify/Nodes/CampaignStatusChange|CampaignStatusChange]]
- `contains` → [[10_Graphify/Nodes/CampaignReadinessStatus|CampaignReadinessStatus]]
- `contains` → [[10_Graphify/Nodes/CampaignReadinessItem|CampaignReadinessItem]]
- `contains` → [[10_Graphify/Nodes/CampaignReadiness|CampaignReadiness]]
- `contains` → [[10_Graphify/Nodes/CAMPAIGN_CONFIG_COPY_FIELDS|CAMPAIGN_CONFIG_COPY_FIELDS]]
- `contains` → [[10_Graphify/Nodes/asArray()|asArray()]]
- `contains` → [[10_Graphify/Nodes/hasManualN8nConfig()|hasManualN8nConfig()]]
- `contains` → [[10_Graphify/Nodes/hasTargetGeography()|hasTargetGeography()]]
- `contains` → [[10_Graphify/Nodes/hasPositiveInteger()|hasPositiveInteger()]]
- `contains` → [[10_Graphify/Nodes/pushReadinessItem()|pushReadinessItem()]]
- `contains` → [[10_Graphify/Nodes/deriveLegacyCampaignColumns()|deriveLegacyCampaignColumns()]]
- `contains` → [[10_Graphify/Nodes/CampaignRow|CampaignRow]]
- `contains` → [[10_Graphify/Nodes/createCrmCampaign()|createCrmCampaign()]]
- `contains` → [[10_Graphify/Nodes/updateCrmCampaign()|updateCrmCampaign()]]
- `contains` → [[10_Graphify/Nodes/campaignStatusAction()|campaignStatusAction()]]
- `contains` → [[10_Graphify/Nodes/duplicateCrmCampaign()|duplicateCrmCampaign()]]
- `contains` → [[10_Graphify/Nodes/archiveCrmCampaign()|archiveCrmCampaign()]]
- `contains` → [[10_Graphify/Nodes/getCampaignReadiness()|getCampaignReadiness()]]
- `contains` → [[10_Graphify/Nodes/assertCampaignManualRunReadiness()|assertCampaignManualRunReadiness()]]
- `contains` → [[10_Graphify/Nodes/markCampaignManualRunRequested()|markCampaignManualRunRequested()]]

## Incoming relationships

- [[10_Graphify/Nodes/actions.ts|actions.ts]] → `imports_from`
- [[10_Graphify/Nodes/queries.ts|queries.ts]] → `imports_from`

## Codex note

Use this node to identify likely source files/symbols. Read exact source files before editing.
