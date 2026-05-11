---
graphify_id: "crm_queries_getcampaignrows"
graphify_type: "Unknown"
graphify_community: "1"
tags:
  - graphify
  - generated
---

# getCampaignRows()

## Metadata

- Type: `Unknown`
- Community: [[10_Graphify/Communities/Community 1|Community 1]]

## Source fields

- No source fields exposed in graph metadata.

## Outgoing relationships

- `calls` → [[10_Graphify/Nodes/asArray()|asArray()]]
- `calls` → [[10_Graphify/Nodes/createOptionalSupabaseServiceClient()|createOptionalSupabaseServiceClient()]]
- `calls` → [[10_Graphify/Nodes/createSupabaseServiceClient()|createSupabaseServiceClient()]]

## Incoming relationships

- [[10_Graphify/Nodes/page.tsx|page.tsx]] → `imports`
- [[10_Graphify/Nodes/CampaignsPage()|CampaignsPage()]] → `calls`
- [[10_Graphify/Nodes/SequencesSettingsPage()|SequencesSettingsPage()]] → `calls`
- [[10_Graphify/Nodes/queries.ts|queries.ts]] → `contains`
- [[10_Graphify/Nodes/getCampaignDetailData()|getCampaignDetailData()]] → `calls`
- [[10_Graphify/Nodes/lead-discovery.ts|lead-discovery.ts]] → `calls`

## Codex note

Use this node to identify likely source files/symbols. Read exact source files before editing.
