---
graphify_id: "n8n_client_triggerdiscoveryworkflow"
graphify_type: "Unknown"
graphify_community: "7"
tags:
  - graphify
  - generated
---

# triggerDiscoveryWorkflow()

## Metadata

- Type: `Unknown`
- Community: [[10_Graphify/Communities/Community 7|Community 7]]

## Source fields

- No source fields exposed in graph metadata.

## Outgoing relationships

- `calls` → [[10_Graphify/Nodes/discoveryWebhookUrl()|discoveryWebhookUrl()]]
- `calls` → [[10_Graphify/Nodes/workflowApiKey()|workflowApiKey()]]

## Incoming relationships

- [[10_Graphify/Nodes/triggerCampaignManualRun()|triggerCampaignManualRun()]] → `calls`
- [[10_Graphify/Nodes/actions.ts|actions.ts]] → `imports`
- [[10_Graphify/Nodes/client.ts|client.ts]] → `contains`

## Codex note

Use this node to identify likely source files/symbols. Read exact source files before editing.
