---
graphify_id: "settings_actions_createinboxaction"
graphify_type: "Unknown"
graphify_community: "0"
tags:
  - graphify
  - generated
---

# createInboxAction()

## Metadata

- Type: `Unknown`
- Community: [[10_Graphify/Communities/Community 0|Community 0]]

## Source fields

- No source fields exposed in graph metadata.

## Outgoing relationships

- `calls` → [[10_Graphify/Nodes/cleanEmail()|cleanEmail()]]
- `calls` → [[10_Graphify/Nodes/assertAllowed()|assertAllowed()]]
- `calls` → [[10_Graphify/Nodes/readSafeDailyLimit()|readSafeDailyLimit()]]
- `calls` → [[10_Graphify/Nodes/cleanText()|cleanText()]]
- `calls` → [[10_Graphify/Nodes/requireDashboardWriteAccess()|requireDashboardWriteAccess()]]
- `calls` → [[10_Graphify/Nodes/createSupabaseServiceClient()|createSupabaseServiceClient()]]
- `calls` → [[10_Graphify/Nodes/logCrmAction()|logCrmAction()]]

## Incoming relationships

- [[10_Graphify/Nodes/page.tsx|page.tsx]] → `imports`
- [[10_Graphify/Nodes/actions.ts|actions.ts]] → `contains`

## Codex note

Use this node to identify likely source files/symbols. Read exact source files before editing.
