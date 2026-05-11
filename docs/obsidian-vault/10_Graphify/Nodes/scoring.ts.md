---
graphify_id: "lib_workflows_scoring_ts"
graphify_type: "Unknown"
graphify_community: "16"
tags:
  - graphify
  - generated
---

# scoring.ts

## Metadata

- Type: `Unknown`
- Community: [[10_Graphify/Communities/Community 16|Community 16]]

## Source fields

- No source fields exposed in graph metadata.

## Outgoing relationships

- `imports_from` → [[10_Graphify/Nodes/contracts.ts|contracts.ts]]
- `imports` → [[10_Graphify/Nodes/assertScoringOutput()|assertScoringOutput()]]
- `imports_from` → [[10_Graphify/Nodes/deepseek.ts|deepseek.ts]]
- `imports` → [[10_Graphify/Nodes/callDeepSeekJson()|callDeepSeekJson()]]
- `imports_from` → [[10_Graphify/Nodes/types.ts|types.ts]]
- `imports` → [[10_Graphify/Nodes/ScoringOutput|ScoringOutput]]
- `imports_from` → [[10_Graphify/Nodes/icp.ts|icp.ts]]
- `imports` → [[10_Graphify/Nodes/icpConfig|icpConfig]]
- `imports_from` → [[10_Graphify/Nodes/server.ts|server.ts]]
- `imports` → [[10_Graphify/Nodes/createSupabaseServiceClient()|createSupabaseServiceClient()]]
- `contains` → [[10_Graphify/Nodes/deriveBand()|deriveBand()]]
- `contains` → [[10_Graphify/Nodes/buildScoringSystemPrompt()|buildScoringSystemPrompt()]]
- `contains` → [[10_Graphify/Nodes/scoreLead()|scoreLead()]]
- `contains` → [[10_Graphify/Nodes/logScoringEvent()|logScoringEvent()]]

## Incoming relationships

- [[10_Graphify/Nodes/lead-discovery.ts|lead-discovery.ts]] → `imports_from`

## Codex note

Use this node to identify likely source files/symbols. Read exact source files before editing.
