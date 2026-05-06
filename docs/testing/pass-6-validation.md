# Pass 6 QA Validation

Date: 2026-05-06

## Scope

- Package scripts and existing test topology.
- Workflow JSON contract checks for n8n app callbacks and Supabase quota RPC naming.
- Workflow endpoint auth helper behavior.
- Middleware route protection feasibility.
- Current validation gaps.

## Repo Searches Run

- `Get-ChildItem -Force -Filter AGENTS.md -Recurse`
  - No repo-root `AGENTS.md` was present. The only match was inside `node_modules/recharts`, so dependency-local instructions were not applied.
- `rg --files`
  - Attempted first as required, but `rg.exe` returned `Access is denied`; PowerShell enumeration was used instead.
- `Get-ChildItem -Recurse -File app,lib,tests,n8n,supabase`
  - Used to inspect app routes, workflow libraries, tests, n8n docs/exports, and Supabase migrations.
- `Select-String` for:
  - `requireWorkflowAuth`
  - `x-n8n-api-key`
  - `N8N_API_KEY`
  - `N8N_WORKFLOW_API_KEY`
  - `/api/workflows/lead-intake`
  - `/api/workflows/discovery/run`
  - `reserve_discovery_quota`
  - `reserve_places_quota`

## Findings

- Existing package scripts covered lint, typecheck, Vitest, and Playwright.
- No Playwright spec files were present under `tests/e2e`, so route protection E2E is configured but not currently implemented.
- Workflow endpoint auth is unit-testable without network or Supabase access because `requireWorkflowAuth` only depends on request headers and env vars.
- Middleware route protection is unit-testable with a mocked `@supabase/ssr` server client. Full browser route protection remains blocked without a seeded Supabase auth session or a dedicated auth-state fixture.
- n8n workflow docs had one stale RPC reference to `reserve_discovery_quota`; current app code and migrations use `reserve_places_quota`.

## Checks Added

- `npm run validate:workflows`
  - Parses all checked-in importable n8n workflow JSON files, including aggregate exports.
  - Verifies WF-01 and WF-10 call app endpoints through `APP_BASE_URL`.
  - Verifies app workflow calls use `POST` and send `x-n8n-api-key`.
  - Verifies app routes enforce `requireWorkflowAuth`.
  - Verifies the app calls `reserve_places_quota` with the expected RPC argument names and that the matching migration defines/grants it.
  - Fails if n8n workflow docs reference retired `reserve_discovery_quota`.
- `npm run test:auth`
  - Covers workflow API-key auth success and failure paths.
  - Covers middleware API bypass, production missing-auth-config failure, unauthenticated protected-route redirect, and authenticated `/login` redirect.

## Remaining Gaps

- No Playwright route protection test yet. Add one after the repo has a deterministic auth fixture or Supabase test project.
- Workflow contract script is static validation only. It does not execute n8n workflows, Supabase RPCs, Google Places calls, or app route handlers end-to-end.
- The checked-in workflows still require external environment setup before deployment validation: `APP_BASE_URL`, app workflow API key, n8n webhook URL/path, Supabase service access, and provider credentials.
