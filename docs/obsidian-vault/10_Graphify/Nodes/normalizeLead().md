---
graphify_id: "workflows_discovery_normalizelead"
graphify_type: "Unknown"
graphify_community: "14"
tags:
  - graphify
  - generated
---

# normalizeLead()

## Metadata

- Type: `Unknown`
- Community: [[10_Graphify/Communities/Community 14|Community 14]]

## Source fields

- No source fields exposed in graph metadata.

## Outgoing relationships

- `calls` → [[10_Graphify/Nodes/normalizeUrl()|normalizeUrl()]]
- `calls` → [[10_Graphify/Nodes/normalizeEmail()|normalizeEmail()]]
- `calls` → [[10_Graphify/Nodes/buildLeadDedupeKey()|buildLeadDedupeKey()]]

## Incoming relationships

- [[10_Graphify/Nodes/discovery.ts|discovery.ts]] → `contains`
- [[10_Graphify/Nodes/importDiscoveredLeads()|importDiscoveredLeads()]] → `calls`

## Codex note

Use this node to identify likely source files/symbols. Read exact source files before editing.
