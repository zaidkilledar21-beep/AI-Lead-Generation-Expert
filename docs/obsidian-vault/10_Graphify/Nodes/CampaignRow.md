---
graphify_id: "crm_types_campaignrow"
graphify_type: "Unknown"
graphify_community: "12"
tags:
  - graphify
  - generated
---

# CampaignRow

## Metadata

- Type: `Unknown`
- Community: [[10_Graphify/Communities/Community 12|Community 12]]

## Source fields

- No source fields exposed in graph metadata.

## Outgoing relationships

- `calls` → [[10_Graphify/Nodes/deriveLegacyCampaignColumns()|deriveLegacyCampaignColumns()]]

## Incoming relationships

- [[10_Graphify/Nodes/types.ts|types.ts]] → `contains`
- [[10_Graphify/Nodes/campaigns.ts|campaigns.ts]] → `contains`
- [[10_Graphify/Nodes/createCrmCampaign()|createCrmCampaign()]] → `calls`
- [[10_Graphify/Nodes/updateCrmCampaign()|updateCrmCampaign()]] → `calls`
- [[10_Graphify/Nodes/lead-discovery.ts|lead-discovery.ts]] → `contains`

## Codex note

Use this node to identify likely source files/symbols. Read exact source files before editing.
