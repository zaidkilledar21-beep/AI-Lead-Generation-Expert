---
graphify_id: "workflows_discovery_normalizedomain"
graphify_type: "Unknown"
graphify_community: "14"
tags:
  - graphify
  - generated
---

# normalizeDomain()

## Metadata

- Type: `Unknown`
- Community: [[10_Graphify/Communities/Community 14|Community 14]]

## Source fields

- No source fields exposed in graph metadata.

## Outgoing relationships

- `calls` → [[10_Graphify/Nodes/normalizeUrl()|normalizeUrl()]]

## Incoming relationships

- [[10_Graphify/Nodes/discovery.ts|discovery.ts]] → `contains`
- [[10_Graphify/Nodes/buildLeadDedupeKey()|buildLeadDedupeKey()]] → `calls`
- [[10_Graphify/Nodes/findDuplicateReason()|findDuplicateReason()]] → `calls`
- [[10_Graphify/Nodes/lead-discovery.ts|lead-discovery.ts]] → `contains`
- [[10_Graphify/Nodes/isSuppressed()|isSuppressed()]] → `calls`
- [[10_Graphify/Nodes/insertCandidateRecord()|insertCandidateRecord()]] → `calls`

## Codex note

Use this node to identify likely source files/symbols. Read exact source files before editing.
