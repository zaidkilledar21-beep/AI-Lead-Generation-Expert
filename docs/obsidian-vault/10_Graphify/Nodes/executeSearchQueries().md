---
graphify_id: "workflows_lead_discovery_executesearchqueries"
graphify_type: "Unknown"
graphify_community: "5"
tags:
  - graphify
  - generated
---

# executeSearchQueries()

## Metadata

- Type: `Unknown`
- Community: [[10_Graphify/Communities/Community 5|Community 5]]

## Source fields

- No source fields exposed in graph metadata.

## Outgoing relationships

- `calls` → [[10_Graphify/Nodes/createSupabaseServiceClient()|createSupabaseServiceClient()]]
- `calls` → [[10_Graphify/Nodes/reserveQuota()|reserveQuota()]]
- `calls` → [[10_Graphify/Nodes/textSearch()|textSearch()]]
- `calls` → [[10_Graphify/Nodes/processSearchResultPlaces()|processSearchResultPlaces()]]

## Incoming relationships

- [[10_Graphify/Nodes/lead-discovery.ts|lead-discovery.ts]] → `calls`

## Codex note

Use this node to identify likely source files/symbols. Read exact source files before editing.
