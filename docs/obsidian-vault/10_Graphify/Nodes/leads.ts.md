---
graphify_id: "lib_app_leads_ts"
graphify_type: "Unknown"
graphify_community: "0"
tags:
  - graphify
  - generated
---

# leads.ts

## Metadata

- Type: `Unknown`
- Community: [[10_Graphify/Communities/Community 0|Community 0]]

## Source fields

- No source fields exposed in graph metadata.

## Outgoing relationships

- `imports` → [[10_Graphify/Nodes/CrmActionType|CrmActionType]]
- `imports_from` → [[10_Graphify/Nodes/auth.ts|auth.ts]]
- `imports_from` → [[10_Graphify/Nodes/audit.ts|audit.ts]]
- `imports` → [[10_Graphify/Nodes/logCrmAction()|logCrmAction()]]
- `imports` → [[10_Graphify/Nodes/requireAppActor()|requireAppActor()]]
- `imports_from` → [[10_Graphify/Nodes/dashboard.ts|dashboard.ts]]
- `imports` → [[10_Graphify/Nodes/createSupabaseDashboardClient()|createSupabaseDashboardClient()]]
- `imports_from` → [[10_Graphify/Nodes/server.ts|server.ts]]
- `imports` → [[10_Graphify/Nodes/createSupabaseServiceClient()|createSupabaseServiceClient()]]
- `contains` → [[10_Graphify/Nodes/DashboardLeadStatus|DashboardLeadStatus]]
- `contains` → [[10_Graphify/Nodes/createRequiredDashboardClient()|createRequiredDashboardClient()]]
- `contains` → [[10_Graphify/Nodes/approveCrmLeadForOutreach()|approveCrmLeadForOutreach()]]
- `contains` → [[10_Graphify/Nodes/updateCrmLeadStatus()|updateCrmLeadStatus()]]
- `contains` → [[10_Graphify/Nodes/saveCrmLeadNote()|saveCrmLeadNote()]]
- `contains` → [[10_Graphify/Nodes/assignCrmLead()|assignCrmLead()]]
- `contains` → [[10_Graphify/Nodes/overrideCrmLeadBand()|overrideCrmLeadBand()]]

## Incoming relationships

- [[10_Graphify/Nodes/review-actions.ts|review-actions.ts]] → `imports_from`
- [[10_Graphify/Nodes/reviews.ts|reviews.ts]] → `imports_from`
- [[10_Graphify/Nodes/actions.ts|actions.ts]] → `imports_from`

## Codex note

Use this node to identify likely source files/symbols. Read exact source files before editing.
