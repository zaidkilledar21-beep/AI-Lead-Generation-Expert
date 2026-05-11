---
graphify_id: "lib_crm_queries_ts"
graphify_type: "Unknown"
graphify_community: "1"
tags:
  - graphify
  - generated
---

# queries.ts

## Metadata

- Type: `Unknown`
- Community: [[10_Graphify/Communities/Community 1|Community 1]]

## Source fields

- No source fields exposed in graph metadata.

## Outgoing relationships

- `imports_from` → [[10_Graphify/Nodes/types.ts|types.ts]]
- `imports_from` → [[10_Graphify/Nodes/auth.ts|auth.ts]]
- `imports` → [[10_Graphify/Nodes/getActiveDashboardUserRole()|getActiveDashboardUserRole()]]
- `imports_from` → [[10_Graphify/Nodes/campaigns.ts|campaigns.ts]]
- `imports` → [[10_Graphify/Nodes/getCampaignReadiness()|getCampaignReadiness()]]
- `imports_from` → [[10_Graphify/Nodes/analytics-utils.ts|analytics-utils.ts]]
- `imports` → [[10_Graphify/Nodes/resolveAnalyticsDateRange()|resolveAnalyticsDateRange()]]
- `imports_from` → [[10_Graphify/Nodes/inbox-utils.ts|inbox-utils.ts]]
- `imports` → [[10_Graphify/Nodes/previewText()|previewText()]]
- `imports_from` → [[10_Graphify/Nodes/server.ts|server.ts]]
- `imports` → [[10_Graphify/Nodes/createOptionalSupabaseServiceClient()|createOptionalSupabaseServiceClient()]]
- `imports_from` → [[10_Graphify/Nodes/dashboard.ts|dashboard.ts]]
- `imports` → [[10_Graphify/Nodes/createSupabaseDashboardClient()|createSupabaseDashboardClient()]]
- `imports_from` → [[10_Graphify/Nodes/status-contract.ts|status-contract.ts]]
- `imports` → [[10_Graphify/Nodes/formatReplyIntentLabel()|formatReplyIntentLabel()]]
- `imports` → [[10_Graphify/Nodes/normalizeReplyIntent()|normalizeReplyIntent()]]
- `imports` → [[10_Graphify/Nodes/normalizeReplyReviewReason()|normalizeReplyReviewReason()]]
- `imports` → [[10_Graphify/Nodes/AnalyticsCampaign|AnalyticsCampaign]]
- `imports` → [[10_Graphify/Nodes/AnalyticsDaily|AnalyticsDaily]]
- `imports` → [[10_Graphify/Nodes/AnalyticsSequenceStep|AnalyticsSequenceStep]]
- `imports` → [[10_Graphify/Nodes/CountryData|CountryData]]
- `imports` → [[10_Graphify/Nodes/IntentData|IntentData]]
- `imports` → [[10_Graphify/Nodes/NicheData|NicheData]]
- `imports` → [[10_Graphify/Nodes/LeadProfile|LeadProfile]]
- `imports` → [[10_Graphify/Nodes/WeeklySnapshot|WeeklySnapshot]]
- `contains` → [[10_Graphify/Nodes/AnalyticsExportKind|AnalyticsExportKind]]
- `contains` → [[10_Graphify/Nodes/OptionalSupabaseClient|OptionalSupabaseClient]]
- `contains` → [[10_Graphify/Nodes/AnalyticsSupabaseClient|AnalyticsSupabaseClient]]
- `contains` → [[10_Graphify/Nodes/AnalyticsCampaignExportRow|AnalyticsCampaignExportRow]]
- `contains` → [[10_Graphify/Nodes/toStr()|toStr()]]
- `contains` → [[10_Graphify/Nodes/toStrOrNull()|toStrOrNull()]]
- `contains` → [[10_Graphify/Nodes/asArray()|asArray()]]
- `contains` → [[10_Graphify/Nodes/relationOne()|relationOne()]]
- `contains` → [[10_Graphify/Nodes/mapPipelineRow()|mapPipelineRow()]]
- `contains` → [[10_Graphify/Nodes/getCrmHomeMetrics()|getCrmHomeMetrics()]]

## Incoming relationships

- [[10_Graphify/Nodes/layout.tsx|layout.tsx]] → `imports_from`
- [[10_Graphify/Nodes/page.tsx|page.tsx]] → `imports_from`
- [[10_Graphify/Nodes/route.ts|route.ts]] → `imports_from`

## Codex note

Use this node to identify likely source files/symbols. Read exact source files before editing.
