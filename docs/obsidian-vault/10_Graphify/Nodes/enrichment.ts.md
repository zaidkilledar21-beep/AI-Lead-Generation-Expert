---
graphify_id: "lib_workflows_enrichment_ts"
graphify_type: "Unknown"
graphify_community: "8"
tags:
  - graphify
  - generated
---

# enrichment.ts

## Metadata

- Type: `Unknown`
- Community: [[10_Graphify/Communities/Community 8|Community 8]]

## Source fields

- No source fields exposed in graph metadata.

## Outgoing relationships

- `imports_from` → [[10_Graphify/Nodes/contracts.ts|contracts.ts]]
- `contains` → [[10_Graphify/Nodes/EnrichLeadInput|EnrichLeadInput]]
- `imports` → [[10_Graphify/Nodes/EnrichLeadOutput|EnrichLeadOutput]]
- `imports_from` → [[10_Graphify/Nodes/server.ts|server.ts]]
- `imports` → [[10_Graphify/Nodes/createSupabaseServiceClient()|createSupabaseServiceClient()]]
- `imports_from` → [[10_Graphify/Nodes/website-crawler.ts|website-crawler.ts]]
- `imports` → [[10_Graphify/Nodes/crawlBusinessWebsite()|crawlBusinessWebsite()]]
- `imports` → [[10_Graphify/Nodes/extractWebsiteSignals()|extractWebsiteSignals()]]
- `contains` → [[10_Graphify/Nodes/CandidateSourceAttribution|CandidateSourceAttribution]]
- `contains` → [[10_Graphify/Nodes/CandidatePayload|CandidatePayload]]
- `contains` → [[10_Graphify/Nodes/hasAny()|hasAny()]]
- `contains` → [[10_Graphify/Nodes/logEnrichmentFailure()|logEnrichmentFailure()]]
- `contains` → [[10_Graphify/Nodes/upsertManualReview()|upsertManualReview()]]
- `contains` → [[10_Graphify/Nodes/logEnrichmentEvent()|logEnrichmentEvent()]]

## Incoming relationships

- [[10_Graphify/Nodes/lead-discovery.ts|lead-discovery.ts]] → `imports_from`

## Codex note

Use this node to identify likely source files/symbols. Read exact source files before editing.
