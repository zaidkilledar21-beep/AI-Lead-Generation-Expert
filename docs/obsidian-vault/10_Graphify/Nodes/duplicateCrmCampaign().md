---
graphify_id: "app_campaigns_duplicatecrmcampaign"
graphify_type: "Unknown"
graphify_community: "0"
tags:
  - graphify
  - generated
---

# duplicateCrmCampaign()

## Metadata

- Type: `Unknown`
- Community: [[10_Graphify/Communities/Community 0|Community 0]]

## Source fields

- No source fields exposed in graph metadata.

## Outgoing relationships

- `calls` → [[10_Graphify/Nodes/logCrmAction()|logCrmAction()]]
- `calls` → [[10_Graphify/Nodes/requireDashboardWriteAccess()|requireDashboardWriteAccess()]]
- `calls` → [[10_Graphify/Nodes/createSupabaseServiceClient()|createSupabaseServiceClient()]]

## Incoming relationships

- [[10_Graphify/Nodes/duplicateCampaignAction()|duplicateCampaignAction()]] → `calls`
- [[10_Graphify/Nodes/campaigns.ts|campaigns.ts]] → `contains`
- [[10_Graphify/Nodes/actions.ts|actions.ts]] → `imports`

## Codex note

Use this node to identify likely source files/symbols. Read exact source files before editing.
