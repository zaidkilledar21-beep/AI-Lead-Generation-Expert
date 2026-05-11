---
graphify_id: "lib_app_audit_ts"
graphify_type: "Unknown"
graphify_community: "0"
tags:
  - graphify
  - generated
---

# audit.ts

## Metadata

- Type: `Unknown`
- Community: [[10_Graphify/Communities/Community 0|Community 0]]

## Source fields

- No source fields exposed in graph metadata.

## Outgoing relationships

- `contains` → [[10_Graphify/Nodes/CrmActionType|CrmActionType]]
- `imports_from` → [[10_Graphify/Nodes/auth.ts|auth.ts]]
- `imports_from` → [[10_Graphify/Nodes/server.ts|server.ts]]
- `imports` → [[10_Graphify/Nodes/createSupabaseServiceClient()|createSupabaseServiceClient()]]
- `imports` → [[10_Graphify/Nodes/AppActor|AppActor]]
- `contains` → [[10_Graphify/Nodes/LogCrmActionInput|LogCrmActionInput]]
- `contains` → [[10_Graphify/Nodes/logCrmAction()|logCrmAction()]]

## Incoming relationships

- [[10_Graphify/Nodes/actions.ts|actions.ts]] → `imports_from`
- [[10_Graphify/Nodes/campaigns.ts|campaigns.ts]] → `imports_from`
- [[10_Graphify/Nodes/inbox.ts|inbox.ts]] → `imports_from`
- [[10_Graphify/Nodes/leads.ts|leads.ts]] → `imports_from`
- [[10_Graphify/Nodes/reviews.ts|reviews.ts]] → `imports_from`
- [[10_Graphify/Nodes/settings.ts|settings.ts]] → `imports_from`

## Codex note

Use this node to identify likely source files/symbols. Read exact source files before editing.
