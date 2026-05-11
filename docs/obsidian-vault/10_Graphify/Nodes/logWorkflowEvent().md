---
graphify_id: "workflows_lead_discovery_logworkflowevent"
graphify_type: "Unknown"
graphify_community: "5"
tags:
  - graphify
  - generated
---

# logWorkflowEvent()

## Metadata

- Type: `Unknown`
- Community: [[10_Graphify/Communities/Community 5|Community 5]]

## Source fields

- No source fields exposed in graph metadata.

## Outgoing relationships

- `calls` → [[10_Graphify/Nodes/createSupabaseServiceClient()|createSupabaseServiceClient()]]

## Incoming relationships

- [[10_Graphify/Nodes/lead-discovery.ts|lead-discovery.ts]] → `calls`
- [[10_Graphify/Nodes/processLeadEnrichmentAndScoring()|processLeadEnrichmentAndScoring()]] → `calls`
- [[10_Graphify/Nodes/finalizeDiscoveryRun()|finalizeDiscoveryRun()]] → `calls`

## Codex note

Use this node to identify likely source files/symbols. Read exact source files before editing.
