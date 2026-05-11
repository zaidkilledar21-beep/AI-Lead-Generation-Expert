---
graphify_id: "crm_queries_getsettingsdata"
graphify_type: "Unknown"
graphify_community: "1"
tags:
  - graphify
  - generated
---

# getSettingsData()

## Metadata

- Type: `Unknown`
- Community: [[10_Graphify/Communities/Community 1|Community 1]]

## Source fields

- No source fields exposed in graph metadata.

## Outgoing relationships

- `calls` → [[10_Graphify/Nodes/toStrOrNull()|toStrOrNull()]]
- `calls` → [[10_Graphify/Nodes/asArray()|asArray()]]
- `calls` → [[10_Graphify/Nodes/getSavedFilters()|getSavedFilters()]]
- `calls` → [[10_Graphify/Nodes/createOptionalSupabaseServiceClient()|createOptionalSupabaseServiceClient()]]

## Incoming relationships

- [[10_Graphify/Nodes/page.tsx|page.tsx]] → `imports`
- [[10_Graphify/Nodes/NewCampaignPage()|NewCampaignPage()]] → `calls`
- [[10_Graphify/Nodes/CampaignDetailPage()|CampaignDetailPage()]] → `calls`
- [[10_Graphify/Nodes/InboxPage()|InboxPage()]] → `calls`
- [[10_Graphify/Nodes/PipelinePage()|PipelinePage()]] → `calls`
- [[10_Graphify/Nodes/SettingsIndexPage()|SettingsIndexPage()]] → `calls`
- [[10_Graphify/Nodes/InboxesSettingsPage()|InboxesSettingsPage()]] → `calls`
- [[10_Graphify/Nodes/NotificationsSettingsPage()|NotificationsSettingsPage()]] → `calls`
- [[10_Graphify/Nodes/SequencesSettingsPage()|SequencesSettingsPage()]] → `calls`
- [[10_Graphify/Nodes/queries.ts|queries.ts]] → `contains`

## Codex note

Use this node to identify likely source files/symbols. Read exact source files before editing.
