---
graphify_id: "crm_actions_normalizeeditableleadvalue"
graphify_type: "Unknown"
graphify_community: "0"
tags:
  - graphify
  - generated
---

# normalizeEditableLeadValue()

## Metadata

- Type: `Unknown`
- Community: [[10_Graphify/Communities/Community 0|Community 0]]

## Source fields

- No source fields exposed in graph metadata.

## Outgoing relationships

- `calls` → [[10_Graphify/Nodes/isValidEmailAddress()|isValidEmailAddress()]]
- `calls` → [[10_Graphify/Nodes/hasHttpScheme()|hasHttpScheme()]]
- `calls` → [[10_Graphify/Nodes/normalizeInlineText()|normalizeInlineText()]]

## Incoming relationships

- [[10_Graphify/Nodes/actions.ts|actions.ts]] → `contains`
- [[10_Graphify/Nodes/updateLeadFieldAction()|updateLeadFieldAction()]] → `calls`

## Codex note

Use this node to identify likely source files/symbols. Read exact source files before editing.
