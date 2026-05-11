---
graphify_id: "workflows_discovery_importdiscoveredleads"
graphify_type: "Unknown"
graphify_community: "14"
tags:
  - graphify
  - generated
---

# importDiscoveredLeads()

## Metadata

- Type: `Unknown`
- Community: [[10_Graphify/Communities/Community 14|Community 14]]

## Source fields

- No source fields exposed in graph metadata.

## Outgoing relationships

- `calls` → [[10_Graphify/Nodes/assertDiscoverInput()|assertDiscoverInput()]]
- `calls` → [[10_Graphify/Nodes/createSupabaseServiceClient()|createSupabaseServiceClient()]]
- `calls` → [[10_Graphify/Nodes/findDuplicateReason()|findDuplicateReason()]]
- `calls` → [[10_Graphify/Nodes/normalizeLead()|normalizeLead()]]

## Incoming relationships

- [[10_Graphify/Nodes/POST()|POST()]] → `calls`
- [[10_Graphify/Nodes/route.ts|route.ts]] → `imports`
- [[10_Graphify/Nodes/manualImportLeadsAction()|manualImportLeadsAction()]] → `calls`
- [[10_Graphify/Nodes/actions.ts|actions.ts]] → `imports`
- [[10_Graphify/Nodes/discovery.ts|discovery.ts]] → `contains`
- [[10_Graphify/Nodes/lead-discovery.ts|lead-discovery.ts]] → `imports`
- [[10_Graphify/Nodes/promoteAndProcessLeads()|promoteAndProcessLeads()]] → `calls`

## Codex note

Use this node to identify likely source files/symbols. Read exact source files before editing.
