---
graphify_id: "crm_analytics_utils_resolveanalyticsdaterange"
graphify_type: "Unknown"
graphify_community: "1"
tags:
  - graphify
  - generated
---

# resolveAnalyticsDateRange()

## Metadata

- Type: `Unknown`
- Community: [[10_Graphify/Communities/Community 1|Community 1]]

## Source fields

- No source fields exposed in graph metadata.

## Outgoing relationships

- `calls` → [[10_Graphify/Nodes/toIsoDate()|toIsoDate()]]
- `calls` → [[10_Graphify/Nodes/parseDateOrToday()|parseDateOrToday()]]

## Incoming relationships

- [[10_Graphify/Nodes/analytics-utils.ts|analytics-utils.ts]] → `contains`
- [[10_Graphify/Nodes/queries.ts|queries.ts]] → `imports`
- [[10_Graphify/Nodes/getAnalyticsData()|getAnalyticsData()]] → `calls`
- [[10_Graphify/Nodes/getAnalyticsDiagnostics()|getAnalyticsDiagnostics()]] → `calls`

## Codex note

Use this node to identify likely source files/symbols. Read exact source files before editing.
