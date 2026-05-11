---
graphify_id: "login_actions_signin"
graphify_type: "Unknown"
graphify_community: "3"
tags:
  - graphify
  - generated
---

# signIn()

## Metadata

- Type: `Unknown`
- Community: [[10_Graphify/Communities/Community 3|Community 3]]

## Source fields

- No source fields exposed in graph metadata.

## Outgoing relationships

- `calls` → [[10_Graphify/Nodes/str()|str()]]
- `calls` → [[10_Graphify/Nodes/signOut()|signOut()]]
- `calls` → [[10_Graphify/Nodes/normalizeAppRedirectPath()|normalizeAppRedirectPath()]]
- `calls` → [[10_Graphify/Nodes/createSupabaseDashboardClient()|createSupabaseDashboardClient()]]
- `calls` → [[10_Graphify/Nodes/getActiveDashboardUserRole()|getActiveDashboardUserRole()]]

## Incoming relationships

- [[10_Graphify/Nodes/page.tsx|page.tsx]] → `imports`
- [[10_Graphify/Nodes/actions.ts|actions.ts]] → `contains`
- [[10_Graphify/Nodes/login-actions.test.ts|login-actions.test.ts]] → `imports`

## Codex note

Use this node to identify likely source files/symbols. Read exact source files before editing.
