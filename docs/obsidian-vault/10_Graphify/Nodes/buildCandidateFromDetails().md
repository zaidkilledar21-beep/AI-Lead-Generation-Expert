---
graphify_id: "workflows_lead_discovery_buildcandidatefromdetails"
graphify_type: "Unknown"
graphify_community: "5"
tags:
  - graphify
  - generated
---

# buildCandidateFromDetails()

## Metadata

- Type: `Unknown`
- Community: [[10_Graphify/Communities/Community 5|Community 5]]

## Source fields

- No source fields exposed in graph metadata.

## Outgoing relationships

- `calls` → [[10_Graphify/Nodes/buildLeadDedupeKey()|buildLeadDedupeKey()]]
- `calls` → [[10_Graphify/Nodes/getDetailsFieldMask()|getDetailsFieldMask()]]
- `calls` → [[10_Graphify/Nodes/cityFromAddress()|cityFromAddress()]]
- `calls` → [[10_Graphify/Nodes/countryFromAddress()|countryFromAddress()]]

## Incoming relationships

- [[10_Graphify/Nodes/lead-discovery.ts|lead-discovery.ts]] → `contains`
- [[10_Graphify/Nodes/processCandidatePlace()|processCandidatePlace()]] → `calls`

## Codex note

Use this node to identify likely source files/symbols. Read exact source files before editing.
