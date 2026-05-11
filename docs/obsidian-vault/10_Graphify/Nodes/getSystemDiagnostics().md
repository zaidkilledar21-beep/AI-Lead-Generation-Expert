---
graphify_id: "crm_queries_getsystemdiagnostics"
graphify_type: "Unknown"
graphify_community: "1"
tags:
  - graphify
  - generated
---

# getSystemDiagnostics()

## Metadata

- Type: `Unknown`
- Community: [[10_Graphify/Communities/Community 1|Community 1]]

## Source fields

- No source fields exposed in graph metadata.

## Outgoing relationships

- `calls` → [[10_Graphify/Nodes/latestDiagnosticLabel()|latestDiagnosticLabel()]]
- `calls` → [[10_Graphify/Nodes/createOptionalSupabaseServiceClient()|createOptionalSupabaseServiceClient()]]

## Incoming relationships

- [[10_Graphify/Nodes/page.tsx|page.tsx]] → `imports`
- [[10_Graphify/Nodes/SettingsIndexPage()|SettingsIndexPage()]] → `calls`
- [[10_Graphify/Nodes/queries.ts|queries.ts]] → `contains`

## Codex note

Use this node to identify likely source files/symbols. Read exact source files before editing.
