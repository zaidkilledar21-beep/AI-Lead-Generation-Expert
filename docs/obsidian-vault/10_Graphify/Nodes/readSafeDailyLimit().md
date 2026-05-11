---
graphify_id: "settings_actions_readsafedailylimit"
graphify_type: "Unknown"
graphify_community: "0"
tags:
  - graphify
  - generated
---

# readSafeDailyLimit()

## Metadata

- Type: `Unknown`
- Community: [[10_Graphify/Communities/Community 0|Community 0]]

## Source fields

- No source fields exposed in graph metadata.

## Outgoing relationships

- `calls` → [[10_Graphify/Nodes/readInteger()|readInteger()]]

## Incoming relationships

- [[10_Graphify/Nodes/actions.ts|actions.ts]] → `contains`
- [[10_Graphify/Nodes/updateInboxDailyLimit()|updateInboxDailyLimit()]] → `calls`
- [[10_Graphify/Nodes/createInboxAction()|createInboxAction()]] → `calls`
- [[10_Graphify/Nodes/updateInboxAction()|updateInboxAction()]] → `calls`

## Codex note

Use this node to identify likely source files/symbols. Read exact source files before editing.
