---
graphify_id: "campaigns_actions_triggercampaignmanualrun"
graphify_type: "Unknown"
graphify_community: "0"
tags:
  - graphify
  - generated
---

# triggerCampaignManualRun()

## Metadata

- Type: `Unknown`
- Community: [[10_Graphify/Communities/Community 0|Community 0]]

## Source fields

- No source fields exposed in graph metadata.

## Outgoing relationships

- `calls` → [[10_Graphify/Nodes/requireDashboardWriteAccess()|requireDashboardWriteAccess()]]
- `calls` → [[10_Graphify/Nodes/assertCampaignManualRunReadiness()|assertCampaignManualRunReadiness()]]
- `calls` → [[10_Graphify/Nodes/markCampaignManualRunRequested()|markCampaignManualRunRequested()]]
- `calls` → [[10_Graphify/Nodes/triggerDiscoveryWorkflow()|triggerDiscoveryWorkflow()]]
- `calls` → [[10_Graphify/Nodes/createSupabaseServiceClient()|createSupabaseServiceClient()]]

## Incoming relationships

- [[10_Graphify/Nodes/page.tsx|page.tsx]] → `imports`
- [[10_Graphify/Nodes/actions.ts|actions.ts]] → `contains`
- [[10_Graphify/Nodes/campaign-detail-controls.tsx|campaign-detail-controls.tsx]] → `imports`

## Codex note

Use this node to identify likely source files/symbols. Read exact source files before editing.
