---
graphify_id: "crm_queries_getaccountsettingsdata"
graphify_type: "Unknown"
graphify_community: "3"
tags:
  - graphify
  - generated
---

# getAccountSettingsData()

## Metadata

- Type: `Unknown`
- Community: [[10_Graphify/Communities/Community 3|Community 3]]

## Source fields

- No source fields exposed in graph metadata.

## Outgoing relationships

- `calls` → [[10_Graphify/Nodes/getActiveDashboardUserRole()|getActiveDashboardUserRole()]]
- `calls` → [[10_Graphify/Nodes/createSupabaseDashboardClient()|createSupabaseDashboardClient()]]

## Incoming relationships

- [[10_Graphify/Nodes/page.tsx|page.tsx]] → `imports`
- [[10_Graphify/Nodes/AccountSettingsPage()|AccountSettingsPage()]] → `calls`
- [[10_Graphify/Nodes/queries.ts|queries.ts]] → `contains`

## Codex note

Use this node to identify likely source files/symbols. Read exact source files before editing.
