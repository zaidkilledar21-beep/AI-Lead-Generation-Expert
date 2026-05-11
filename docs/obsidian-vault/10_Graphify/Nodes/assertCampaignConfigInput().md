---
graphify_id: "lib_contracts_assertcampaignconfiginput"
graphify_type: "Unknown"
graphify_community: "10"
tags:
  - graphify
  - generated
---

# assertCampaignConfigInput()

## Metadata

- Type: `Unknown`
- Community: [[10_Graphify/Communities/Community 10|Community 10]]

## Source fields

- No source fields exposed in graph metadata.

## Outgoing relationships

- `calls` → [[10_Graphify/Nodes/assertCampaignLimits()|assertCampaignLimits()]]
- `calls` → [[10_Graphify/Nodes/assertCampaignScoring()|assertCampaignScoring()]]

## Incoming relationships

- [[10_Graphify/Nodes/campaignFromForm()|campaignFromForm()]] → `calls`
- [[10_Graphify/Nodes/contracts.ts|contracts.ts]] → `contains`
- [[10_Graphify/Nodes/actions.ts|actions.ts]] → `imports`
- [[10_Graphify/Nodes/campaigns.ts|campaigns.ts]] → `imports`
- [[10_Graphify/Nodes/campaign-contract.test.ts|campaign-contract.test.ts]] → `imports`
- [[10_Graphify/Nodes/createCrmCampaign()|createCrmCampaign()]] → `calls`
- [[10_Graphify/Nodes/updateCrmCampaign()|updateCrmCampaign()]] → `calls`

## Codex note

Use this node to identify likely source files/symbols. Read exact source files before editing.
