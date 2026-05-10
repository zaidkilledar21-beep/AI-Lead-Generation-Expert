# AI Automation CRM - Project AGENTS.md

## Project context

This is the AI Automation CRM / lead generation dashboard.

The app uses:
- Next.js / React
- Supabase for database and auth
- n8n for workflow automation
- Gmail / Google Workspace for sending and replies
- DeepSeek for scoring, draft generation, and reply classification

## Context policy

- Read root `status.md` before substantial work.
- Read relevant files in `plans/` before implementation.
- Do not reread the whole repo unless explicitly asked.
- Shortlist files before opening raw files.
- Prefer existing query/action/UI patterns.

## High-risk areas

Use extra care for:
- auth/session handling
- Supabase RLS and dashboard_users access
- n8n webhook routes
- Gmail sending/reply detection
- global outreach pause
- analytics queries
- CSV exports
- settings/diagnostics involving secrets

## Security rules

- Do not expose service role keys, webhook URLs, SMTP credentials, API keys, or tokens client-side.
- Do not use unsafe regex from user input.
- Do not add polling loops.
- Do not fetch full tables into React for counts or analytics.
- Do not use dangerouslySetInnerHTML.
- Keep server-side validation canonical.

## Quality rules

- Avoid duplicated handlers.
- Prefer shared helpers/components when the same pattern appears more than twice.
- Keep PRs small and reviewable.
- Do not introduce broad refactors unless explicitly required.
- Preserve existing app behavior unless the plan says otherwise.

## Verification

Run available checks:
- npm run lint
- npm run typecheck
- npm test
- npm run build

If a command does not exist, state that clearly.
