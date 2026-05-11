---
graphify_id: "app_auth_callback_route_ts"
graphify_type: "Unknown"
graphify_community: "9"
tags:
  - graphify
  - generated
---

# route.ts

## Metadata

- Type: `Unknown`
- Community: [[10_Graphify/Communities/Community 9|Community 9]]

## Source fields

- No source fields exposed in graph metadata.

## Outgoing relationships

- `contains` → [[10_Graphify/Nodes/EXPORT_KINDS|EXPORT_KINDS]]
- `contains` → [[10_Graphify/Nodes/parseDays()|parseDays()]]
- `contains` → [[10_Graphify/Nodes/parseKind()|parseKind()]]
- `contains` → [[10_Graphify/Nodes/GET()|GET()]]
- `contains` → [[10_Graphify/Nodes/POST()|POST()]]
- `contains` → [[10_Graphify/Nodes/LeadIntakePayload|LeadIntakePayload]]
- `imports_from` → [[10_Graphify/Nodes/auth.ts|auth.ts]]
- `imports` → [[10_Graphify/Nodes/requireDashboardRole()|requireDashboardRole()]]
- `imports_from` → [[10_Graphify/Nodes/csv.ts|csv.ts]]
- `imports` → [[10_Graphify/Nodes/serializeCsv()|serializeCsv()]]
- `imports` → [[10_Graphify/Nodes/CsvColumn|CsvColumn]]
- `imports_from` → [[10_Graphify/Nodes/queries.ts|queries.ts]]
- `imports` → [[10_Graphify/Nodes/getAnalyticsExport()|getAnalyticsExport()]]
- `imports` → [[10_Graphify/Nodes/AnalyticsExportKind|AnalyticsExportKind]]
- `imports` → [[10_Graphify/Nodes/requireWorkflowAuth()|requireWorkflowAuth()]]
- `imports` → [[10_Graphify/Nodes/lead-discovery.ts|lead-discovery.ts]]
- `imports_from` → [[10_Graphify/Nodes/discovery.ts|discovery.ts]]
- `imports` → [[10_Graphify/Nodes/importDiscoveredLeads()|importDiscoveredLeads()]]
- `imports_from` → [[10_Graphify/Nodes/contracts.ts|contracts.ts]]
- `imports` → [[10_Graphify/Nodes/discoveryLimits|discoveryLimits]]
- `imports` → [[10_Graphify/Nodes/GooglePlacesLeadInput|GooglePlacesLeadInput]]
- `imports_from` → [[10_Graphify/Nodes/redirects.ts|redirects.ts]]
- `imports` → [[10_Graphify/Nodes/normalizeAppRedirectPath()|normalizeAppRedirectPath()]]
- `imports_from` → [[10_Graphify/Nodes/dashboard.ts|dashboard.ts]]
- `imports` → [[10_Graphify/Nodes/createSupabaseDashboardClient()|createSupabaseDashboardClient()]]
- `contains` → [[10_Graphify/Nodes/loginRedirect()|loginRedirect()]]

## Incoming relationships

- [[10_Graphify/Nodes/auth-callback.test.ts|auth-callback.test.ts]] → `imports_from`

## Codex note

Use this node to identify likely source files/symbols. Read exact source files before editing.
