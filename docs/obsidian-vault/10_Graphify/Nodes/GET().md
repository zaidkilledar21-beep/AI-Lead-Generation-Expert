---
graphify_id: "export_route_get"
graphify_type: "Unknown"
graphify_community: "9"
tags:
  - graphify
  - generated
---

# GET()

## Metadata

- Type: `Unknown`
- Community: [[10_Graphify/Communities/Community 9|Community 9]]

## Source fields

- No source fields exposed in graph metadata.

## Outgoing relationships

- `calls` → [[10_Graphify/Nodes/parseDays()|parseDays()]]
- `calls` → [[10_Graphify/Nodes/parseKind()|parseKind()]]
- `calls` → [[10_Graphify/Nodes/loginRedirect()|loginRedirect()]]
- `calls` → [[10_Graphify/Nodes/requireDashboardRole()|requireDashboardRole()]]
- `calls` → [[10_Graphify/Nodes/getAnalyticsExport()|getAnalyticsExport()]]
- `calls` → [[10_Graphify/Nodes/serializeCsv()|serializeCsv()]]
- `calls` → [[10_Graphify/Nodes/normalizeAppRedirectPath()|normalizeAppRedirectPath()]]
- `calls` → [[10_Graphify/Nodes/createSupabaseDashboardClient()|createSupabaseDashboardClient()]]

## Incoming relationships

- [[10_Graphify/Nodes/route.ts|route.ts]] → `contains`
- [[10_Graphify/Nodes/auth-callback.test.ts|auth-callback.test.ts]] → `imports`

## Codex note

Use this node to identify likely source files/symbols. Read exact source files before editing.
