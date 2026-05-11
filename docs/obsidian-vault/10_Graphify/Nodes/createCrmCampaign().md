---
graphify_id: "app_campaigns_createcrmcampaign"
graphify_type: "Unknown"
graphify_community: "4"
tags:
  - graphify
  - generated
---

# createCrmCampaign()

## Metadata

- Type: `Unknown`
- Community: [[10_Graphify/Communities/Community 4|Community 4]]

## Source fields

- No source fields exposed in graph metadata.

## Outgoing relationships

- `calls` → [[10_Graphify/Nodes/campaignFromForm()|campaignFromForm()]]
- `contains` → [[10_Graphify/Nodes/STEPS|STEPS]]
- `contains` → [[10_Graphify/Nodes/previewSchema|previewSchema]]
- `contains` → [[10_Graphify/Nodes/PreviewData|PreviewData]]
- `imports_from` → [[10_Graphify/Nodes/select-options.ts|select-options.ts]]
- `calls` → [[10_Graphify/Nodes/toInboxOptions()|toInboxOptions()]]
- `calls` → [[10_Graphify/Nodes/toBandSequenceOptions()|toBandSequenceOptions()]]
- `contains` → [[10_Graphify/Nodes/SubmitButton()|SubmitButton()]]
- `imports_from` → [[10_Graphify/Nodes/button.tsx|button.tsx]]
- `imports` → [[10_Graphify/Nodes/Button()|Button()]]
- `imports` → [[10_Graphify/Nodes/CrmDateField()|CrmDateField()]]
- `imports_from` → [[10_Graphify/Nodes/crm-select.tsx|crm-select.tsx]]
- `imports` → [[10_Graphify/Nodes/CrmSelect()|CrmSelect()]]
- `calls` → [[10_Graphify/Nodes/assertCampaignConfigInput()|assertCampaignConfigInput()]]
- `calls` → [[10_Graphify/Nodes/logCrmAction()|logCrmAction()]]
- `calls` → [[10_Graphify/Nodes/requireAppActor()|requireAppActor()]]
- `imports_from` → [[10_Graphify/Nodes/actions.ts|actions.ts]]
- `calls` → [[10_Graphify/Nodes/CampaignRow|CampaignRow]]
- `calls` → [[10_Graphify/Nodes/createSupabaseServiceClient()|createSupabaseServiceClient()]]

## Incoming relationships

- [[10_Graphify/Nodes/page.tsx|page.tsx]] → `imports`
- [[10_Graphify/Nodes/campaigns.ts|campaigns.ts]] → `contains`

## Codex note

Use this node to identify likely source files/symbols. Read exact source files before editing.
