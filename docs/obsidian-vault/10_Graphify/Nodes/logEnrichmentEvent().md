---
graphify_id: "workflows_enrichment_logenrichmentevent"
graphify_type: "Unknown"
graphify_community: "8"
tags:
  - graphify
  - generated
---

# logEnrichmentEvent()

## Metadata

- Type: `Unknown`
- Community: [[10_Graphify/Communities/Community 8|Community 8]]

## Source fields

- No source fields exposed in graph metadata.

## Outgoing relationships

- `calls` → [[10_Graphify/Nodes/createSupabaseServiceClient()|createSupabaseServiceClient()]]

## Incoming relationships

- [[10_Graphify/Nodes/EnrichLeadInput|EnrichLeadInput]] → `calls`
- [[10_Graphify/Nodes/enrichment.ts|enrichment.ts]] → `contains`
- [[10_Graphify/Nodes/logEnrichmentFailure()|logEnrichmentFailure()]] → `calls`

## Codex note

Use this node to identify likely source files/symbols. Read exact source files before editing.
