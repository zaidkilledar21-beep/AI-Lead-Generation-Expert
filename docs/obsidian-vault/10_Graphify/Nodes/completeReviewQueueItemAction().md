---
graphify_id: "crm_actions_completereviewqueueitemaction"
graphify_type: "Unknown"
graphify_community: "0"
tags:
  - graphify
  - generated
---

# completeReviewQueueItemAction()

## Metadata

- Type: `Unknown`
- Community: [[10_Graphify/Communities/Community 0|Community 0]]

## Source fields

- No source fields exposed in graph metadata.

## Outgoing relationships

- `calls` → [[10_Graphify/Nodes/markReplyHandled()|markReplyHandled()]]
- `calls` → [[10_Graphify/Nodes/cleanText()|cleanText()]]
- `calls` → [[10_Graphify/Nodes/closeLeadAction()|closeLeadAction()]]
- `calls` → [[10_Graphify/Nodes/completeReviewAction()|completeReviewAction()]]
- `calls` → [[10_Graphify/Nodes/approveEmailDraftAction()|approveEmailDraftAction()]]
- `calls` → [[10_Graphify/Nodes/rejectEmailDraftAction()|rejectEmailDraftAction()]]

## Incoming relationships

- [[10_Graphify/Nodes/ReviewBoard()|ReviewBoard()]] → `imports`
- [[10_Graphify/Nodes/actions.ts|actions.ts]] → `contains`

## Codex note

Use this node to identify likely source files/symbols. Read exact source files before editing.
