---
graphify_id: "app_leads_approvecrmleadforoutreach"
graphify_type: "Unknown"
graphify_community: "0"
tags:
  - graphify
  - generated
---

# approveCrmLeadForOutreach()

## Metadata

- Type: `Unknown`
- Community: [[10_Graphify/Communities/Community 0|Community 0]]

## Source fields

- No source fields exposed in graph metadata.

## Outgoing relationships

- `calls` → [[10_Graphify/Nodes/logCrmAction()|logCrmAction()]]
- `calls` → [[10_Graphify/Nodes/requireAppActor()|requireAppActor()]]
- `calls` → [[10_Graphify/Nodes/createRequiredDashboardClient()|createRequiredDashboardClient()]]
- `calls` → [[10_Graphify/Nodes/createSupabaseServiceClient()|createSupabaseServiceClient()]]

## Incoming relationships

- [[10_Graphify/Nodes/review-actions.ts|review-actions.ts]] → `contains`
- [[10_Graphify/Nodes/leads.ts|leads.ts]] → `contains`
- [[10_Graphify/Nodes/reviews.ts|reviews.ts]] → `imports`
- [[10_Graphify/Nodes/actions.ts|actions.ts]] → `imports`
- [[10_Graphify/Nodes/completeManualReview()|completeManualReview()]] → `calls`
- [[10_Graphify/Nodes/approveLeadAction()|approveLeadAction()]] → `calls`
- [[10_Graphify/Nodes/completeReviewAction()|completeReviewAction()]] → `calls`

## Codex note

Use this node to identify likely source files/symbols. Read exact source files before editing.
