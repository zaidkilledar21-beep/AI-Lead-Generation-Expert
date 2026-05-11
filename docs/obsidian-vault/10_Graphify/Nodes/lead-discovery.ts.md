---
graphify_id: "lib_workflows_lead_discovery_ts"
graphify_type: "Unknown"
graphify_community: "5"
tags:
  - graphify
  - generated
---

# lead-discovery.ts

## Metadata

- Type: `Unknown`
- Community: [[10_Graphify/Communities/Community 5|Community 5]]

## Source fields

- No source fields exposed in graph metadata.

## Outgoing relationships

- `imports_from` → [[10_Graphify/Nodes/contracts.ts|contracts.ts]]
- `imports` → [[10_Graphify/Nodes/discoveryLimits|discoveryLimits]]
- `imports` → [[10_Graphify/Nodes/EnrichLeadInput|EnrichLeadInput]]
- `imports_from` → [[10_Graphify/Nodes/env.ts|env.ts]]
- `imports` → [[10_Graphify/Nodes/getRequiredEnv()|getRequiredEnv()]]
- `calls` → [[10_Graphify/Nodes/getCampaignRows()|getCampaignRows()]]
- `contains` → [[10_Graphify/Nodes/CampaignRow|CampaignRow]]
- `imports_from` → [[10_Graphify/Nodes/server.ts|server.ts]]
- `calls` → [[10_Graphify/Nodes/createSupabaseServiceClient()|createSupabaseServiceClient()]]
- `imports_from` → [[10_Graphify/Nodes/discovery.ts|discovery.ts]]
- `imports` → [[10_Graphify/Nodes/RawLeadInput|RawLeadInput]]
- `contains` → [[10_Graphify/Nodes/normalizeDomain()|normalizeDomain()]]
- `imports` → [[10_Graphify/Nodes/buildLeadDedupeKey()|buildLeadDedupeKey()]]
- `imports` → [[10_Graphify/Nodes/importDiscoveredLeads()|importDiscoveredLeads()]]
- `imports_from` → [[10_Graphify/Nodes/enrichment.ts|enrichment.ts]]
- `imports_from` → [[10_Graphify/Nodes/scoring.ts|scoring.ts]]
- `imports` → [[10_Graphify/Nodes/scoreLead()|scoreLead()]]
- `imports_from` → [[10_Graphify/Nodes/website-crawler.ts|website-crawler.ts]]
- `imports` → [[10_Graphify/Nodes/crawlBusinessWebsite()|crawlBusinessWebsite()]]
- `imports` → [[10_Graphify/Nodes/extractWebsiteSignals()|extractWebsiteSignals()]]
- `contains` → [[10_Graphify/Nodes/PlacesSearchResult|PlacesSearchResult]]
- `contains` → [[10_Graphify/Nodes/PlacesDetails|PlacesDetails]]
- `contains` → [[10_Graphify/Nodes/RunLeadDiscoveryInput|RunLeadDiscoveryInput]]
- `contains` → [[10_Graphify/Nodes/DiscoveryRunStatus|DiscoveryRunStatus]]
- `contains` → [[10_Graphify/Nodes/RunLeadDiscoveryOutput|RunLeadDiscoveryOutput]]
- `contains` → [[10_Graphify/Nodes/allowedDetailsFields|allowedDetailsFields]]
- `contains` → [[10_Graphify/Nodes/getDetailsFieldMask()|getDetailsFieldMask()]]
- `contains` → [[10_Graphify/Nodes/cityFromAddress()|cityFromAddress()]]
- `contains` → [[10_Graphify/Nodes/countryFromAddress()|countryFromAddress()]]
- `calls` → [[10_Graphify/Nodes/buildQueries()|buildQueries()]]
- `contains` → [[10_Graphify/Nodes/hasExcludedTerm()|hasExcludedTerm()]]
- `calls` → [[10_Graphify/Nodes/reserveQuota()|reserveQuota()]]
- `contains` → [[10_Graphify/Nodes/textSearch()|textSearch()]]
- `contains` → [[10_Graphify/Nodes/placeDetails()|placeDetails()]]
- `calls` → [[10_Graphify/Nodes/logWorkflowEvent()|logWorkflowEvent()]]

## Incoming relationships

- [[10_Graphify/Nodes/POST()|POST()]] → `calls`
- [[10_Graphify/Nodes/route.ts|route.ts]] → `imports`
- [[10_Graphify/Nodes/validate-workflow-contracts.mjs|validate-workflow-contracts.mjs]] → `contains`

## Codex note

Use this node to identify likely source files/symbols. Read exact source files before editing.
