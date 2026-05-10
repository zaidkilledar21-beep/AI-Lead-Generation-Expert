# Codex PR Review Checklist

Before final response, verify:

## Scope

- [ ] Only requested files/areas changed.
- [ ] No broad refactor introduced.
- [ ] No unrelated feature added.

## Context discipline

- [ ] Read applicable AGENTS.md files.
- [ ] Read status.md.
- [ ] Used plan/docs before raw file reads.
- [ ] Did not reread entire repo.
- [ ] Opened only shortlisted files.

## Security

- [ ] No secrets exposed client-side.
- [ ] No service role usage in browser code.
- [ ] No unsafe redirects.
- [ ] No unsafe regex from user input.
- [ ] No dangerouslySetInnerHTML.
- [ ] No polling loops.

## Performance

- [ ] No unbounded client-side filtering.
- [ ] No full-table fetches for counts.
- [ ] No large render-loop scans.
- [ ] Refresh/event handlers are bounded or debounced where relevant.

## Duplication

- [ ] No repeated handlers.
- [ ] Shared helpers reused.
- [ ] Validation centralized server-side where possible.

## Validation

- [ ] lint run or explicitly skipped with reason.
- [ ] typecheck run or explicitly skipped with reason.
- [ ] tests run or explicitly skipped with reason.
- [ ] build run or explicitly skipped with reason.