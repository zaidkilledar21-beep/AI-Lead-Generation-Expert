---
graphify_id: "workflows_website_crawler_crawlbusinesswebsite"
graphify_type: "Unknown"
graphify_community: "8"
tags:
  - graphify
  - generated
---

# crawlBusinessWebsite()

## Metadata

- Type: `Unknown`
- Community: [[10_Graphify/Communities/Community 8|Community 8]]

## Source fields

- No source fields exposed in graph metadata.

## Outgoing relationships

- `calls` → [[10_Graphify/Nodes/getNumberEnv()|getNumberEnv()]]
- `calls` → [[10_Graphify/Nodes/robotsAllows()|robotsAllows()]]
- `calls` → [[10_Graphify/Nodes/fetchHtml()|fetchHtml()]]

## Incoming relationships

- [[10_Graphify/Nodes/EnrichLeadInput|EnrichLeadInput]] → `calls`
- [[10_Graphify/Nodes/enrichment.ts|enrichment.ts]] → `imports`
- [[10_Graphify/Nodes/lead-discovery.ts|lead-discovery.ts]] → `imports`
- [[10_Graphify/Nodes/enrichCandidateFromWebsite()|enrichCandidateFromWebsite()]] → `calls`
- [[10_Graphify/Nodes/website-crawler.ts|website-crawler.ts]] → `contains`

## Codex note

Use this node to identify likely source files/symbols. Read exact source files before editing.
