---
graphify_id: "settings_actions_sequenceinput"
graphify_type: "Unknown"
graphify_community: "0"
tags:
  - graphify
  - generated
---

# sequenceInput()

## Metadata

- Type: `Unknown`
- Community: [[10_Graphify/Communities/Community 0|Community 0]]

## Source fields

- No source fields exposed in graph metadata.

## Outgoing relationships

- `calls` → [[10_Graphify/Nodes/readBoolean()|readBoolean()]]
- `calls` → [[10_Graphify/Nodes/assertSequenceBand()|assertSequenceBand()]]
- `calls` → [[10_Graphify/Nodes/cleanText()|cleanText()]]

## Incoming relationships

- [[10_Graphify/Nodes/actions.ts|actions.ts]] → `contains`
- [[10_Graphify/Nodes/createSequenceAction()|createSequenceAction()]] → `calls`
- [[10_Graphify/Nodes/updateSequenceAction()|updateSequenceAction()]] → `calls`

## Codex note

Use this node to identify likely source files/symbols. Read exact source files before editing.
