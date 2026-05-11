---
graphify_id: "workflows_lead_discovery_finalizediscoveryrun"
graphify_type: "Unknown"
graphify_community: "5"
tags:
  - graphify
  - generated
---

# finalizeDiscoveryRun()

## Metadata

- Type: `Unknown`
- Community: [[10_Graphify/Communities/Community 5|Community 5]]

## Source fields

- No source fields exposed in graph metadata.

## Outgoing relationships

- `calls` → [[10_Graphify/Nodes/createSupabaseServiceClient()|createSupabaseServiceClient()]]
- `calls` → [[10_Graphify/Nodes/logWorkflowEvent()|logWorkflowEvent()]]
- `calls` → [[10_Graphify/Nodes/mapEventStatus()|mapEventStatus()]]

## Incoming relationships

- [[10_Graphify/Nodes/lead-discovery.ts|lead-discovery.ts]] → `calls`

## Codex note

Use this node to identify likely source files/symbols. Read exact source files before editing.
