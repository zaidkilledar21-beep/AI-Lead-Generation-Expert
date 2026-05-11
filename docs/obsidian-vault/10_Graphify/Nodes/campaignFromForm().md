---
graphify_id: "campaigns_actions_campaignfromform"
graphify_type: "Unknown"
graphify_community: "0"
tags:
  - graphify
  - generated
---

# campaignFromForm()

## Metadata

- Type: `Unknown`
- Community: [[10_Graphify/Communities/Community 0|Community 0]]

## Source fields

- No source fields exposed in graph metadata.

## Outgoing relationships

- `calls` → [[10_Graphify/Nodes/parseCsv()|parseCsv()]]
- `calls` → [[10_Graphify/Nodes/parseNumber()|parseNumber()]]
- `calls` → [[10_Graphify/Nodes/parseOptionalNumber()|parseOptionalNumber()]]
- `calls` → [[10_Graphify/Nodes/parseBoolean()|parseBoolean()]]
- `calls` → [[10_Graphify/Nodes/normalizeLeadSource()|normalizeLeadSource()]]
- `calls` → [[10_Graphify/Nodes/str()|str()]]
- `calls` → [[10_Graphify/Nodes/assertCampaignConfigInput()|assertCampaignConfigInput()]]

## Incoming relationships

- [[10_Graphify/Nodes/actions.ts|actions.ts]] → `contains`
- [[10_Graphify/Nodes/createCrmCampaign()|createCrmCampaign()]] → `calls`
- [[10_Graphify/Nodes/updateCrmCampaign()|updateCrmCampaign()]] → `calls`

## Codex note

Use this node to identify likely source files/symbols. Read exact source files before editing.
