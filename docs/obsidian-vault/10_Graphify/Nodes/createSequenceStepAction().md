---
graphify_id: "settings_actions_createsequencestepaction"
graphify_type: "Unknown"
graphify_community: "0"
tags:
  - graphify
  - generated
---

# createSequenceStepAction()

## Metadata

- Type: `Unknown`
- Community: [[10_Graphify/Communities/Community 0|Community 0]]

## Source fields

- No source fields exposed in graph metadata.

## Outgoing relationships

- `calls` → [[10_Graphify/Nodes/getActiveAssignedCampaignIds()|getActiveAssignedCampaignIds()]]
- `calls` → [[10_Graphify/Nodes/revalidateSequenceSettings()|revalidateSequenceSettings()]]
- `calls` → [[10_Graphify/Nodes/sequenceStepInput()|sequenceStepInput()]]
- `calls` → [[10_Graphify/Nodes/requireDashboardWriteAccess()|requireDashboardWriteAccess()]]
- `calls` → [[10_Graphify/Nodes/createSupabaseServiceClient()|createSupabaseServiceClient()]]
- `calls` → [[10_Graphify/Nodes/logCrmAction()|logCrmAction()]]

## Incoming relationships

- [[10_Graphify/Nodes/actions.ts|actions.ts]] → `contains`
- [[10_Graphify/Nodes/sequence-settings-editor.tsx|sequence-settings-editor.tsx]] → `imports`

## Codex note

Use this node to identify likely source files/symbols. Read exact source files before editing.
