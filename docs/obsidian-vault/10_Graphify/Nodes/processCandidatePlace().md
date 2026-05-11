---
graphify_id: "workflows_lead_discovery_processcandidateplace"
graphify_type: "Unknown"
graphify_community: "5"
tags:
  - graphify
  - generated
---

# processCandidatePlace()

## Metadata

- Type: `Unknown`
- Community: [[10_Graphify/Communities/Community 5|Community 5]]

## Source fields

- No source fields exposed in graph metadata.

## Outgoing relationships

- `calls` → [[10_Graphify/Nodes/reserveQuota()|reserveQuota()]]
- `calls` → [[10_Graphify/Nodes/placeDetails()|placeDetails()]]
- `calls` → [[10_Graphify/Nodes/candidateExists()|candidateExists()]]
- `calls` → [[10_Graphify/Nodes/validateCandidate()|validateCandidate()]]
- `calls` → [[10_Graphify/Nodes/enrichCandidateFromWebsite()|enrichCandidateFromWebsite()]]
- `calls` → [[10_Graphify/Nodes/resolveCrawlStatus()|resolveCrawlStatus()]]
- `calls` → [[10_Graphify/Nodes/buildCandidateFromDetails()|buildCandidateFromDetails()]]
- `calls` → [[10_Graphify/Nodes/insertCandidateRecord()|insertCandidateRecord()]]

## Incoming relationships

- [[10_Graphify/Nodes/lead-discovery.ts|lead-discovery.ts]] → `contains`
- [[10_Graphify/Nodes/processSearchResultPlaces()|processSearchResultPlaces()]] → `calls`

## Codex note

Use this node to identify likely source files/symbols. Read exact source files before editing.
