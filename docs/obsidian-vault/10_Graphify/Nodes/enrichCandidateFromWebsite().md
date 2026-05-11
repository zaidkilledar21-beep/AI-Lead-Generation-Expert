---
graphify_id: "workflows_lead_discovery_enrichcandidatefromwebsite"
graphify_type: "Unknown"
graphify_community: "8"
tags:
  - graphify
  - generated
---

# enrichCandidateFromWebsite()

## Metadata

- Type: `Unknown`
- Community: [[10_Graphify/Communities/Community 8|Community 8]]

## Source fields

- No source fields exposed in graph metadata.

## Outgoing relationships

- `calls` → [[10_Graphify/Nodes/crawlBusinessWebsite()|crawlBusinessWebsite()]]
- `calls` → [[10_Graphify/Nodes/extractWebsiteSignals()|extractWebsiteSignals()]]

## Incoming relationships

- [[10_Graphify/Nodes/lead-discovery.ts|lead-discovery.ts]] → `contains`
- [[10_Graphify/Nodes/processCandidatePlace()|processCandidatePlace()]] → `calls`

## Codex note

Use this node to identify likely source files/symbols. Read exact source files before editing.
