---
graphify_id: "app_campaigns_updatecrmcampaign"
graphify_type: "Unknown"
graphify_community: "12"
tags:
  - graphify
  - generated
---

# updateCrmCampaign()

## Metadata

- Type: `Unknown`
- Community: [[10_Graphify/Communities/Community 12|Community 12]]

## Source fields

- No source fields exposed in graph metadata.

## Outgoing relationships

- `calls` → [[10_Graphify/Nodes/campaignFromForm()|campaignFromForm()]]
- `calls` → [[10_Graphify/Nodes/assertCampaignConfigInput()|assertCampaignConfigInput()]]
- `calls` → [[10_Graphify/Nodes/logCrmAction()|logCrmAction()]]
- `calls` → [[10_Graphify/Nodes/requireAppActor()|requireAppActor()]]
- `calls` → [[10_Graphify/Nodes/CampaignRow|CampaignRow]]
- `calls` → [[10_Graphify/Nodes/archiveCrmCampaign()|archiveCrmCampaign()]]
- `calls` → [[10_Graphify/Nodes/campaignStatusAction()|campaignStatusAction()]]
- `calls` → [[10_Graphify/Nodes/createSupabaseServiceClient()|createSupabaseServiceClient()]]

## Incoming relationships

- [[10_Graphify/Nodes/page.tsx|page.tsx]] → `imports`
- [[10_Graphify/Nodes/edit-campaign-form.tsx|edit-campaign-form.tsx]] → `imports`
- [[10_Graphify/Nodes/campaign-detail-controls.tsx|campaign-detail-controls.tsx]] → `imports`
- [[10_Graphify/Nodes/campaigns.ts|campaigns.ts]] → `contains`
- [[10_Graphify/Nodes/actions.ts|actions.ts]] → `contains`

## Codex note

Use this node to identify likely source files/symbols. Read exact source files before editing.
