---
graphify_id: "dashboard_queries_getpipelinesnapshot"
graphify_type: "Unknown"
graphify_community: "1"
tags:
  - graphify
  - generated
---

# getPipelineSnapshot()

## Metadata

- Type: `Unknown`
- Community: [[10_Graphify/Communities/Community 1|Community 1]]

## Source fields

- No source fields exposed in graph metadata.

## Outgoing relationships

- `calls` → [[10_Graphify/Nodes/createOptionalSupabaseServiceClient()|createOptionalSupabaseServiceClient()]]

## Incoming relationships

- [[10_Graphify/Nodes/queries.ts|queries.ts]] → `contains`
- [[10_Graphify/Nodes/getMetricsSnapshot()|getMetricsSnapshot()]] → `calls`
- [[10_Graphify/Nodes/getPipelineDashboard()|getPipelineDashboard()]] → `calls`
- [[10_Graphify/Nodes/getAnalyticsDashboard()|getAnalyticsDashboard()]] → `calls`

## Codex note

Use this node to identify likely source files/symbols. Read exact source files before editing.
