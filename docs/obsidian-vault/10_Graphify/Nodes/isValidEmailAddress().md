---
graphify_id: "lib_text_validation_isvalidemailaddress"
graphify_type: "Unknown"
graphify_community: "0"
tags:
  - graphify
  - generated
---

# isValidEmailAddress()

## Metadata

- Type: `Unknown`
- Community: [[10_Graphify/Communities/Community 0|Community 0]]

## Source fields

- No source fields exposed in graph metadata.

## Outgoing relationships

- `calls` → [[10_Graphify/Nodes/hasAsciiWhitespace()|hasAsciiWhitespace()]]

## Incoming relationships

- [[10_Graphify/Nodes/cleanEmail()|cleanEmail()]] → `calls`
- [[10_Graphify/Nodes/text-validation.ts|text-validation.ts]] → `contains`
- [[10_Graphify/Nodes/actions.ts|actions.ts]] → `imports`
- [[10_Graphify/Nodes/normalizeEditableLeadValue()|normalizeEditableLeadValue()]] → `calls`

## Codex note

Use this node to identify likely source files/symbols. Read exact source files before editing.
