---
graphify_id: "app_settings_updateglobaloutreachsettings"
graphify_type: "Unknown"
graphify_community: "0"
tags:
  - graphify
  - generated
---

# updateGlobalOutreachSettings()

## Metadata

- Type: `Unknown`
- Community: [[10_Graphify/Communities/Community 0|Community 0]]

## Source fields

- No source fields exposed in graph metadata.

## Outgoing relationships

- `calls` → [[10_Graphify/Nodes/logCrmAction()|logCrmAction()]]
- `calls` → [[10_Graphify/Nodes/requireAppActor()|requireAppActor()]]
- `calls` → [[10_Graphify/Nodes/cleanText()|cleanText()]]
- `calls` → [[10_Graphify/Nodes/createSupabaseServiceClient()|createSupabaseServiceClient()]]

## Incoming relationships

- [[10_Graphify/Nodes/page.tsx|page.tsx]] → `imports`
- [[10_Graphify/Nodes/settings.ts|settings.ts]] → `contains`
- [[10_Graphify/Nodes/actions.ts|actions.ts]] → `imports`
- [[10_Graphify/Nodes/setGlobalOutreachPaused()|setGlobalOutreachPaused()]] → `calls`
- [[10_Graphify/Nodes/toggleGlobalPauseAction()|toggleGlobalPauseAction()]] → `calls`

## Codex note

Use this node to identify likely source files/symbols. Read exact source files before editing.
