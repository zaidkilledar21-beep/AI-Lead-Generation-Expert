---
graphify_id: "app_auth_getactivedashboarduserrole"
graphify_type: "Unknown"
graphify_community: "3"
tags:
  - graphify
  - generated
---

# getActiveDashboardUserRole()

## Metadata

- Type: `Unknown`
- Community: [[10_Graphify/Communities/Community 3|Community 3]]

## Source fields

- No source fields exposed in graph metadata.

## Outgoing relationships

- `calls` → [[10_Graphify/Nodes/createSupabaseServiceClient()|createSupabaseServiceClient()]]

## Incoming relationships

- [[10_Graphify/Nodes/signIn()|signIn()]] → `calls`
- [[10_Graphify/Nodes/auth.ts|auth.ts]] → `contains`
- [[10_Graphify/Nodes/actions.ts|actions.ts]] → `imports`
- [[10_Graphify/Nodes/requireDashboardRole()|requireDashboardRole()]] → `calls`
- [[10_Graphify/Nodes/queries.ts|queries.ts]] → `imports`
- [[10_Graphify/Nodes/getAccountSettingsData()|getAccountSettingsData()]] → `calls`

## Codex note

Use this node to identify likely source files/symbols. Read exact source files before editing.
