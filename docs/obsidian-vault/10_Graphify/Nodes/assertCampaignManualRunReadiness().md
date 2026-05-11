---
graphify_id: "app_campaigns_assertcampaignmanualrunreadiness"
graphify_type: "Unknown"
graphify_community: "12"
tags:
  - graphify
  - generated
---

# assertCampaignManualRunReadiness()

## Metadata

- Type: `Unknown`
- Community: [[10_Graphify/Communities/Community 12|Community 12]]

## Source fields

- No source fields exposed in graph metadata.

## Outgoing relationships

- `calls` → [[10_Graphify/Nodes/getCampaignReadiness()|getCampaignReadiness()]]

## Incoming relationships

- [[10_Graphify/Nodes/triggerCampaignManualRun()|triggerCampaignManualRun()]] → `calls`
- [[10_Graphify/Nodes/campaigns.ts|campaigns.ts]] → `contains`
- [[10_Graphify/Nodes/actions.ts|actions.ts]] → `imports`

## Codex note

Use this node to identify likely source files/symbols. Read exact source files before editing.
