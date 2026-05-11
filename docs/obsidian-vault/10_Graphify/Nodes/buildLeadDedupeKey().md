---
graphify_id: "workflows_discovery_buildleaddedupekey"
graphify_type: "Unknown"
graphify_community: "14"
tags:
  - graphify
  - generated
---

# buildLeadDedupeKey()

## Metadata

- Type: `Unknown`
- Community: [[10_Graphify/Communities/Community 14|Community 14]]

## Source fields

- No source fields exposed in graph metadata.

## Outgoing relationships

- `calls` → [[10_Graphify/Nodes/normalizeDomain()|normalizeDomain()]]

## Incoming relationships

- [[10_Graphify/Nodes/discovery.ts|discovery.ts]] → `contains`
- [[10_Graphify/Nodes/normalizeLead()|normalizeLead()]] → `calls`
- [[10_Graphify/Nodes/lead-discovery.ts|lead-discovery.ts]] → `imports`
- [[10_Graphify/Nodes/buildCandidateFromDetails()|buildCandidateFromDetails()]] → `calls`

## Codex note

Use this node to identify likely source files/symbols. Read exact source files before editing.
