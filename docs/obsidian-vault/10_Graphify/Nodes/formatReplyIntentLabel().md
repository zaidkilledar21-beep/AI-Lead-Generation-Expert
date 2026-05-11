---
graphify_id: "crm_status_contract_formatreplyintentlabel"
graphify_type: "Unknown"
graphify_community: "2"
tags:
  - graphify
  - generated
---

# formatReplyIntentLabel()

## Metadata

- Type: `Unknown`
- Community: [[10_Graphify/Communities/Community 2|Community 2]]

## Source fields

- No source fields exposed in graph metadata.

## Outgoing relationships

- `calls` → [[10_Graphify/Nodes/normalizeReplyIntent()|normalizeReplyIntent()]]

## Incoming relationships

- [[10_Graphify/Nodes/inbox-view.tsx|inbox-view.tsx]] → `imports`
- [[10_Graphify/Nodes/reviewReasonLabel()|reviewReasonLabel()]] → `calls`
- [[10_Graphify/Nodes/ReviewBoard()|ReviewBoard()]] → `calls`
- [[10_Graphify/Nodes/queries.ts|queries.ts]] → `imports`
- [[10_Graphify/Nodes/status-contract.ts|status-contract.ts]] → `contains`

## Codex note

Use this node to identify likely source files/symbols. Read exact source files before editing.
