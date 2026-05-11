---
graphify_id: "crm_actions_approveemaildraftaction"
graphify_type: "Unknown"
graphify_community: "0"
tags:
  - graphify
  - generated
---

# approveEmailDraftAction()

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

- [[10_Graphify/Nodes/draft-review-editor.tsx|draft-review-editor.tsx]] → `imports`
- [[10_Graphify/Nodes/actions.ts|actions.ts]] → `contains`
- [[10_Graphify/Nodes/completeReviewQueueItemAction()|completeReviewQueueItemAction()]] → `calls`

## Codex note

Use this node to identify likely source files/symbols. Read exact source files before editing.
