---
graphify_id: "lib_crm_status_contract_ts"
graphify_type: "Unknown"
graphify_community: "2"
tags:
  - graphify
  - generated
---

# status-contract.ts

## Metadata

- Type: `Unknown`
- Community: [[10_Graphify/Communities/Community 2|Community 2]]

## Source fields

- No source fields exposed in graph metadata.

## Outgoing relationships

- `contains` → [[10_Graphify/Nodes/LeadStatus|LeadStatus]]
- `contains` → [[10_Graphify/Nodes/ReplyIntent|ReplyIntent]]
- `contains` → [[10_Graphify/Nodes/LeadLifecycleStatus|LeadLifecycleStatus]]
- `contains` → [[10_Graphify/Nodes/QUEUE_STATUSES|QUEUE_STATUSES]]
- `contains` → [[10_Graphify/Nodes/DRAFT_APPROVAL_STATUSES|DRAFT_APPROVAL_STATUSES]]
- `contains` → [[10_Graphify/Nodes/MANUAL_REVIEW_STATUSES|MANUAL_REVIEW_STATUSES]]
- `contains` → [[10_Graphify/Nodes/TERMINAL_LEAD_STATUSES|TERMINAL_LEAD_STATUSES]]
- `contains` → [[10_Graphify/Nodes/REPLY_INTENT_LABELS|REPLY_INTENT_LABELS]]
- `contains` → [[10_Graphify/Nodes/isCanonicalReplyIntent()|isCanonicalReplyIntent()]]
- `imports` → [[10_Graphify/Nodes/normalizeReplyIntent()|normalizeReplyIntent()]]
- `imports` → [[10_Graphify/Nodes/normalizeReplyReviewReason()|normalizeReplyReviewReason()]]
- `contains` → [[10_Graphify/Nodes/formatReplyIntentLabel()|formatReplyIntentLabel()]]
- `contains` → [[10_Graphify/Nodes/ManualBoardMoveStatus|ManualBoardMoveStatus]]
- `contains` → [[10_Graphify/Nodes/WORKFLOW_OWNED_BOARD_STATUSES|WORKFLOW_OWNED_BOARD_STATUSES]]
- `contains` → [[10_Graphify/Nodes/LEAD_STATUS_LABELS|LEAD_STATUS_LABELS]]
- `contains` → [[10_Graphify/Nodes/formatStatusLabel()|formatStatusLabel()]]
- `contains` → [[10_Graphify/Nodes/isTerminalLeadStatus()|isTerminalLeadStatus()]]

## Incoming relationships

- [[10_Graphify/Nodes/page.tsx|page.tsx]] → `imports_from`
- [[10_Graphify/Nodes/inbox-view.tsx|inbox-view.tsx]] → `imports_from`
- [[10_Graphify/Nodes/KanbanBoard()|KanbanBoard()]] → `imports_from`
- [[10_Graphify/Nodes/pipeline-list-view.tsx|pipeline-list-view.tsx]] → `imports_from`
- [[10_Graphify/Nodes/ReviewBoard()|ReviewBoard()]] → `imports_from`
- [[10_Graphify/Nodes/types.ts|types.ts]] → `imports_from`
- [[10_Graphify/Nodes/actions.ts|actions.ts]] → `imports_from`
- [[10_Graphify/Nodes/queries.ts|queries.ts]] → `imports_from`

## Codex note

Use this node to identify likely source files/symbols. Read exact source files before editing.
