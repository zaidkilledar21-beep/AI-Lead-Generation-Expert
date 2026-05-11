---
graphify_id: "app_auth_requiredashboardrole"
graphify_type: "Unknown"
graphify_community: "3"
tags:
  - graphify
  - generated
---

# requireDashboardRole()

## Metadata

- Type: `Unknown`
- Community: [[10_Graphify/Communities/Community 3|Community 3]]

## Source fields

- No source fields exposed in graph metadata.

## Outgoing relationships

- `calls` → [[10_Graphify/Nodes/resolveDisplayName()|resolveDisplayName()]]
- `calls` → [[10_Graphify/Nodes/getActiveDashboardUserRole()|getActiveDashboardUserRole()]]
- `calls` → [[10_Graphify/Nodes/createSupabaseDashboardClient()|createSupabaseDashboardClient()]]

## Incoming relationships

- [[10_Graphify/Nodes/layout.tsx|layout.tsx]] → `imports`
- [[10_Graphify/Nodes/RootLayout()|RootLayout()]] → `calls`
- [[10_Graphify/Nodes/GET()|GET()]] → `calls`
- [[10_Graphify/Nodes/route.ts|route.ts]] → `imports`
- [[10_Graphify/Nodes/auth.ts|auth.ts]] → `contains`
- [[10_Graphify/Nodes/requireDashboardWriteAccess()|requireDashboardWriteAccess()]] → `calls`
- [[10_Graphify/Nodes/requireDashboardAdminAccess()|requireDashboardAdminAccess()]] → `calls`
- [[10_Graphify/Nodes/requireAppActor()|requireAppActor()]] → `calls`

## Codex note

Use this node to identify likely source files/symbols. Read exact source files before editing.
