---
graphify_id: "crm_status_contract_normalizereplyintent"
graphify_type: "Unknown"
graphify_community: "2"
tags:
  - graphify
  - generated
---

# normalizeReplyIntent()

## Metadata

- Type: `Unknown`
- Community: [[10_Graphify/Communities/Community 2|Community 2]]

## Source fields

- No source fields exposed in graph metadata.

## Outgoing relationships

- `calls` → [[10_Graphify/Nodes/isCanonicalReplyIntent()|isCanonicalReplyIntent()]]

## Incoming relationships

- [[10_Graphify/Nodes/queries.ts|queries.ts]] → `imports`
- [[10_Graphify/Nodes/mapPipelineRow()|mapPipelineRow()]] → `calls`
- [[10_Graphify/Nodes/status-contract.ts|status-contract.ts]] → `imports`
- [[10_Graphify/Nodes/normalizeReplyReviewReason()|normalizeReplyReviewReason()]] → `calls`
- [[10_Graphify/Nodes/formatReplyIntentLabel()|formatReplyIntentLabel()]] → `calls`

## Codex note

Use this node to identify likely source files/symbols. Read exact source files before editing.
