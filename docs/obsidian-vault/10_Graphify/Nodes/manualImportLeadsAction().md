---
graphify_id: "campaigns_actions_manualimportleadsaction"
graphify_type: "Unknown"
graphify_community: "0"
tags:
  - graphify
  - generated
---

# manualImportLeadsAction()

## Metadata

- Type: `Unknown`
- Community: [[10_Graphify/Communities/Community 0|Community 0]]

## Source fields

- No source fields exposed in graph metadata.

## Outgoing relationships

- `calls` → [[10_Graphify/Nodes/normalizeWebsite()|normalizeWebsite()]]
- `calls` → [[10_Graphify/Nodes/parseCsvRows()|parseCsvRows()]]
- `calls` → [[10_Graphify/Nodes/str()|str()]]
- `calls` → [[10_Graphify/Nodes/requireDashboardWriteAccess()|requireDashboardWriteAccess()]]
- `calls` → [[10_Graphify/Nodes/createSupabaseServiceClient()|createSupabaseServiceClient()]]
- `calls` → [[10_Graphify/Nodes/importDiscoveredLeads()|importDiscoveredLeads()]]

## Incoming relationships

- [[10_Graphify/Nodes/actions.ts|actions.ts]] → `contains`
- [[10_Graphify/Nodes/import-form.tsx|import-form.tsx]] → `imports`

## Codex note

Use this node to identify likely source files/symbols. Read exact source files before editing.
