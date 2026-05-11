---
graphify_id: "workflows_routing_routeapprovedlead"
graphify_type: "Unknown"
graphify_community: "15"
tags:
  - graphify
  - generated
---

# routeApprovedLead()

## Metadata

- Type: `Unknown`
- Community: [[10_Graphify/Communities/Community 15|Community 15]]

## Source fields

- No source fields exposed in graph metadata.

## Outgoing relationships

- `calls` → [[10_Graphify/Nodes/createSupabaseServiceClient()|createSupabaseServiceClient()]]
- `calls` → [[10_Graphify/Nodes/updateLeadStatus()|updateLeadStatus()]]

## Incoming relationships

- [[10_Graphify/Nodes/routing.ts|routing.ts]] → `contains`
- [[10_Graphify/Nodes/routeLead()|routeLead()]] → `calls`

## Codex note

Use this node to identify likely source files/symbols. Read exact source files before editing.
