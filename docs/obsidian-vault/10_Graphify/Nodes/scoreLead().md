---
graphify_id: "workflows_scoring_scorelead"
graphify_type: "Unknown"
graphify_community: "16"
tags:
  - graphify
  - generated
---

# scoreLead()

## Metadata

- Type: `Unknown`
- Community: [[10_Graphify/Communities/Community 16|Community 16]]

## Source fields

- No source fields exposed in graph metadata.

## Outgoing relationships

- `calls` → [[10_Graphify/Nodes/assertScoringOutput()|assertScoringOutput()]]
- `calls` → [[10_Graphify/Nodes/createSupabaseServiceClient()|createSupabaseServiceClient()]]
- `calls` → [[10_Graphify/Nodes/deriveBand()|deriveBand()]]
- `calls` → [[10_Graphify/Nodes/buildScoringSystemPrompt()|buildScoringSystemPrompt()]]
- `calls` → [[10_Graphify/Nodes/logScoringEvent()|logScoringEvent()]]

## Incoming relationships

- [[10_Graphify/Nodes/lead-discovery.ts|lead-discovery.ts]] → `imports`
- [[10_Graphify/Nodes/processLeadEnrichmentAndScoring()|processLeadEnrichmentAndScoring()]] → `calls`
- [[10_Graphify/Nodes/scoring.ts|scoring.ts]] → `contains`

## Codex note

Use this node to identify likely source files/symbols. Read exact source files before editing.
