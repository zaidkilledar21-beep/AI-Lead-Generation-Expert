---
graphify_id: "lib_workflows_discovery_ts"
graphify_type: "Unknown"
graphify_community: "14"
tags:
  - graphify
  - generated
---

# discovery.ts

## Metadata

- Type: `Unknown`
- Community: [[10_Graphify/Communities/Community 14|Community 14]]

## Source fields

- No source fields exposed in graph metadata.

## Outgoing relationships

- `imports_from` → [[10_Graphify/Nodes/contracts.ts|contracts.ts]]
- `imports` → [[10_Graphify/Nodes/DiscoverLeadsInput|DiscoverLeadsInput]]
- `imports` → [[10_Graphify/Nodes/GooglePlacesLeadInput|GooglePlacesLeadInput]]
- `imports` → [[10_Graphify/Nodes/DiscoverLeadsOutput|DiscoverLeadsOutput]]
- `imports` → [[10_Graphify/Nodes/assertDiscoverInput()|assertDiscoverInput()]]
- `imports_from` → [[10_Graphify/Nodes/server.ts|server.ts]]
- `imports` → [[10_Graphify/Nodes/createSupabaseServiceClient()|createSupabaseServiceClient()]]
- `contains` → [[10_Graphify/Nodes/RawLeadInput|RawLeadInput]]
- `contains` → [[10_Graphify/Nodes/normalizeUrl()|normalizeUrl()]]
- `contains` → [[10_Graphify/Nodes/normalizeEmail()|normalizeEmail()]]
- `contains` → [[10_Graphify/Nodes/normalizeDomain()|normalizeDomain()]]
- `contains` → [[10_Graphify/Nodes/DuplicateReason|DuplicateReason]]
- `contains` → [[10_Graphify/Nodes/buildLeadDedupeKey()|buildLeadDedupeKey()]]
- `contains` → [[10_Graphify/Nodes/findDuplicateReason()|findDuplicateReason()]]
- `contains` → [[10_Graphify/Nodes/normalizeLead()|normalizeLead()]]
- `contains` → [[10_Graphify/Nodes/importDiscoveredLeads()|importDiscoveredLeads()]]

## Incoming relationships

- [[10_Graphify/Nodes/route.ts|route.ts]] → `imports_from`
- [[10_Graphify/Nodes/actions.ts|actions.ts]] → `imports_from`
- [[10_Graphify/Nodes/lead-discovery.ts|lead-discovery.ts]] → `imports_from`

## Codex note

Use this node to identify likely source files/symbols. Read exact source files before editing.
