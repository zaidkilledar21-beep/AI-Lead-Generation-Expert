---
graphify_id: "app_campaigns_getcampaignreadiness"
graphify_type: "Unknown"
graphify_community: "12"
tags:
  - graphify
  - generated
---

# getCampaignReadiness()

## Metadata

- Type: `Unknown`
- Community: [[10_Graphify/Communities/Community 12|Community 12]]

## Source fields

- No source fields exposed in graph metadata.

## Outgoing relationships

- `calls` → [[10_Graphify/Nodes/hasManualN8nConfig()|hasManualN8nConfig()]]
- `calls` → [[10_Graphify/Nodes/hasTargetGeography()|hasTargetGeography()]]
- `calls` → [[10_Graphify/Nodes/hasPositiveInteger()|hasPositiveInteger()]]
- `calls` → [[10_Graphify/Nodes/pushReadinessItem()|pushReadinessItem()]]
- `calls` → [[10_Graphify/Nodes/asArray()|asArray()]]
- `calls` → [[10_Graphify/Nodes/createSupabaseServiceClient()|createSupabaseServiceClient()]]

## Incoming relationships

- [[10_Graphify/Nodes/campaigns.ts|campaigns.ts]] → `contains`
- [[10_Graphify/Nodes/assertCampaignManualRunReadiness()|assertCampaignManualRunReadiness()]] → `calls`
- [[10_Graphify/Nodes/queries.ts|queries.ts]] → `imports`
- [[10_Graphify/Nodes/getCampaignDetailData()|getCampaignDetailData()]] → `calls`

## Codex note

Use this node to identify likely source files/symbols. Read exact source files before editing.
