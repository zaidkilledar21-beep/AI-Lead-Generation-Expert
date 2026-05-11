---
graphify_id: "lib_contracts_enrichleadinput"
graphify_type: "Unknown"
graphify_community: "8"
tags:
  - graphify
  - generated
---

# EnrichLeadInput

## Metadata

- Type: `Unknown`
- Community: [[10_Graphify/Communities/Community 8|Community 8]]

## Source fields

- No source fields exposed in graph metadata.

## Outgoing relationships

- `calls` → [[10_Graphify/Nodes/logEnrichmentFailure()|logEnrichmentFailure()]]
- `calls` → [[10_Graphify/Nodes/logEnrichmentEvent()|logEnrichmentEvent()]]
- `calls` → [[10_Graphify/Nodes/hasAny()|hasAny()]]
- `calls` → [[10_Graphify/Nodes/createSupabaseServiceClient()|createSupabaseServiceClient()]]
- `calls` → [[10_Graphify/Nodes/crawlBusinessWebsite()|crawlBusinessWebsite()]]
- `calls` → [[10_Graphify/Nodes/extractWebsiteSignals()|extractWebsiteSignals()]]

## Incoming relationships

- [[10_Graphify/Nodes/contracts.ts|contracts.ts]] → `contains`
- [[10_Graphify/Nodes/enrichment.ts|enrichment.ts]] → `contains`
- [[10_Graphify/Nodes/lead-discovery.ts|lead-discovery.ts]] → `imports`
- [[10_Graphify/Nodes/processLeadEnrichmentAndScoring()|processLeadEnrichmentAndScoring()]] → `calls`

## Codex note

Use this node to identify likely source files/symbols. Read exact source files before editing.
