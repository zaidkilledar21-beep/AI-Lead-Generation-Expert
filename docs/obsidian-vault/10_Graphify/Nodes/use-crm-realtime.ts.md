---
graphify_id: "lib_hooks_use_crm_realtime_ts"
graphify_type: "Unknown"
graphify_community: "7"
tags:
  - graphify
  - generated
---

# use-crm-realtime.ts

## Metadata

- Type: `Unknown`
- Community: [[10_Graphify/Communities/Community 7|Community 7]]

## Source fields

- No source fields exposed in graph metadata.

## Outgoing relationships

- `imports_from` → [[10_Graphify/Nodes/browser.ts|browser.ts]]
- `imports` → [[10_Graphify/Nodes/createSupabaseBrowserClient()|createSupabaseBrowserClient()]]
- `contains` → [[10_Graphify/Nodes/CRM_REALTIME_TABLES|CRM_REALTIME_TABLES]]

## Incoming relationships

- [[10_Graphify/Nodes/crm-shell.tsx|crm-shell.tsx]] → `imports`
- [[10_Graphify/Nodes/CrmShell()|CrmShell()]] → `calls`
- [[10_Graphify/Nodes/crm-realtime.test.tsx|crm-realtime.test.tsx]] → `imports`
- [[10_Graphify/Nodes/RealtimeHarness()|RealtimeHarness()]] → `calls`

## Codex note

Use this node to identify likely source files/symbols. Read exact source files before editing.
