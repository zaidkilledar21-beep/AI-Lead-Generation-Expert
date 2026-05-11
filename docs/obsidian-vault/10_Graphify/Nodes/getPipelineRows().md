---
graphify_id: "crm_queries_getpipelinerows"
graphify_type: "Unknown"
graphify_community: "1"
tags:
  - graphify
  - generated
---

# getPipelineRows()

## Metadata

- Type: `Unknown`
- Community: [[10_Graphify/Communities/Community 1|Community 1]]

## Source fields

- No source fields exposed in graph metadata.

## Outgoing relationships

- `calls` → [[10_Graphify/Nodes/mapPipelineRow()|mapPipelineRow()]]
- `calls` → [[10_Graphify/Nodes/createOptionalSupabaseServiceClient()|createOptionalSupabaseServiceClient()]]

## Incoming relationships

- [[10_Graphify/Nodes/page.tsx|page.tsx]] → `imports`
- [[10_Graphify/Nodes/PipelinePage()|PipelinePage()]] → `calls`
- [[10_Graphify/Nodes/queries.ts|queries.ts]] → `contains`
- [[10_Graphify/Nodes/getCampaignDetailData()|getCampaignDetailData()]] → `calls`
- [[10_Graphify/Nodes/getLeadDetail()|getLeadDetail()]] → `calls`
- [[10_Graphify/Nodes/getReviewItems()|getReviewItems()]] → `calls`
- [[10_Graphify/Nodes/getAnalyticsData()|getAnalyticsData()]] → `calls`

## Codex note

Use this node to identify likely source files/symbols. Read exact source files before editing.
