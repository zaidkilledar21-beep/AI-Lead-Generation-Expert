# Phase 01 Implementation Plan: Create Campaign Wizard Persistence Fix

## Placement

Copy this file into the repo as:

```text
plans/01_campaign_wizard_persistence_fix.md
```

## Phase Objective

Fix the blocking campaign creation wizard issue before touching broader outreach readiness. The Create New Campaign flow must preserve all entered values across step navigation and submit a complete campaign payload on the final step.

This phase is intentionally narrow. Do not attempt discovery, n8n, sending, reply detection, or full outreach readiness fixes in this phase. Humans love fixing twelve things at once and then wondering why smoke comes out of the app. Avoid that.

## Known Critical Bug

The Create New Campaign wizard loses filled values when navigating back and forward. Stage 5/final step does not save or proceed correctly.

### Suspected Root Cause

The wizard appears to render step-specific fields conditionally. Fields from previous steps are unmounted when the user moves forward. If validation or final submission reads from `new FormData(form)`, it only sees currently mounted inputs. Previous step data is missing, so final submission receives an incomplete payload.

## Primary Files

Start with these files only. Use Graphify before opening raw files.

```text
app/campaigns/create-campaign-form.tsx
app/campaigns/actions.ts
lib/app/campaigns.ts
lib/contracts.ts
status.md
```

Only inspect additional files if Graphify or imports show they are directly involved.

## Required Graphify Workflow

Before editing, read the applicable docs and use Graphify to shortlist files.

1. Read the applicable `AGENTS.md` chain if present.
2. Read `status.md`.
3. Read `docs/obsidian-vault/10_Graphify/Graphify Index.md`.
4. Use `graphify-out/graph.json` and the Graphify Obsidian layer before opening raw source.
5. Do not reread the whole repo.

Recommended commands:

```bash
graphify query "Create campaign wizard form state validation submit payload campaign server action" --graph graphify-out/graph.json
graphify explain "app/campaigns/create-campaign-form.tsx" --graph graphify-out/graph.json
graphify explain "app/campaigns/actions.ts" --graph graphify-out/graph.json
graphify path "app/campaigns/create-campaign-form.tsx" "app/campaigns/actions.ts" --graph graphify-out/graph.json
graphify path "app/campaigns/actions.ts" "lib/app/campaigns.ts" --graph graphify-out/graph.json
```

## Subagents To Use

Use subagents if the environment supports them.

| Subagent | Responsibility |
|---|---|
| Frontend / React Form Subagent | Inspect and fix wizard state, navigation, validation, and submit behavior. |
| Backend / Server Action Subagent | Verify `createCampaignAction` payload expectations and prevent frontend/backend mismatch. |
| QA / Validation Subagent | Create regression checklist and run lint/type/build validation. |
| Documentation / Status Subagent | Update `status.md` with fix summary, validation, and remaining risks. |

## Skills To Shortlist Before Work

Look for project-relevant skills in the global skills folder configured for the agent environment. Shortlist only skills relevant to this phase.

Priority skill areas:

```text
Next.js
React controlled forms
TypeScript
Server actions
FormData validation
Supabase app contracts
QA/testing
Repo audit/navigation
```

If the global skills folder cannot be found, document where you looked and continue without blocking the fix.

## Non-Goals For This Phase

Do not do the following in Phase 01:

- Do not modify Supabase migrations.
- Do not modify n8n workflow JSON.
- Do not change outreach sending behavior.
- Do not change discovery/scoring/routing logic.
- Do not redesign the campaign UI.
- Do not introduce a new form library unless absolutely necessary.
- Do not refactor unrelated components.
- Do not add client-side secrets.
- Do not introduce broad state-management packages.

## Required Fix Design

### 1. Full Wizard State

Create a single typed state object that stores every campaign field across all steps.

The state must cover at least:

```text
Campaign identity fields
ICP / targeting fields
Locations / regions / country / city fields
Keywords and exclusions
Business type / niche fields
Discovery limits
Crawl/paid provider flags
Schedule/timezone/status fields
Any textareas/lists used by the wizard
```

Codex must inspect the actual component and server action to produce the exact final field inventory before editing.

### 2. Controlled Inputs

Every input, textarea, select, checkbox, and number field in the wizard must read from and write to the wizard state.

Use helper functions such as:

```ts
updateField(name, value)
updateNumberField(name, value)
updateBooleanField(name, checked)
updateListTextField(name, value)
```

Keep these helpers local to the component unless there is already a suitable utility nearby.

### 3. Step Validation

Step validation must read from the complete wizard state, not from mounted DOM fields.

Validation should be step-specific:

| Step | Validation intent |
|---|---|
| Step 1 | Campaign basics and required identity fields. |
| Step 2 | ICP/targeting fields. |
| Step 3 | Location/business filters. |
| Step 4 | Discovery caps/provider flags. |
| Step 5 | Final review and complete payload readiness. |

Use actual existing step names from the component after inspection.

### 4. Navigation Preservation

Back and Continue navigation must never clear previously entered values.

Acceptance behavior:

```text
Fill Step 1 -> Continue -> Back -> Step 1 values remain.
Fill Steps 1-4 -> Back repeatedly -> all values remain.
Change a prior value -> Continue again -> changed value remains in final payload.
```

### 5. Final Submit Payload

On final submit:

1. Prevent duplicate submission while pending.
2. Validate all required state.
3. Build a complete `FormData` payload from the wizard state.
4. Serialize arrays/lists in the format expected by `app/campaigns/actions.ts`.
5. Serialize numbers as strings acceptable to the server action.
6. Serialize booleans consistently with existing server parsing.
7. Call `createCampaignAction` using the complete payload.
8. Preserve existing redirect/revalidate behavior.

Do not depend on hidden inputs unless that is the smallest safe bridge. Preferred approach: controlled state + explicit `FormData` builder.

### 6. Final Button UX

The final step button must say:

```text
Save Campaign
```

It must not appear as another generic Continue action.

### 7. Error Display

Validation errors must be visible and specific.

Minimum behavior:

```text
Display step-level or field-level errors near the wizard controls.
Do not silently fail.
Clear or update errors when the user corrects the invalid field.
```

### 8. Preserve Styling

Preserve current UI styling and layout unless a small change is needed to show errors or clarify final save.

## Implementation Steps

### Step 0: Confirm Clean State

Run:

```bash
git status
```

If there are uncommitted user changes, do not overwrite them. Work around them or stop and report.

### Step 1: Read Context

Read:

```text
AGENTS.md chain, if present
status.md
plans/01_campaign_wizard_persistence_fix.md
docs/obsidian-vault/10_Graphify/Graphify Index.md
```

### Step 2: Graphify Shortlist

Run the Graphify commands listed above. Open only files proven relevant by Graphify/imports.

### Step 3: Inspect Contracts

Inspect:

```text
app/campaigns/create-campaign-form.tsx
app/campaigns/actions.ts
lib/app/campaigns.ts
lib/contracts.ts
```

Document in working notes:

```text
Field name
UI type
Current step
Required/optional
Expected server action key
Expected type/serialization
Default value
Validation rule
```

### Step 4: Implement State Model

Add typed initial state and update helpers in `create-campaign-form.tsx`.

State should be explicit and readable. Avoid clever dynamic chaos. The industry has enough of that.

### Step 5: Convert Inputs To Controlled Inputs

For each wizard field:

```text
value={formState.field}
onChange={...}
checked={formState.flag}
```

Make sure textareas, number inputs, checkboxes, select boxes, and list fields are all controlled.

### Step 6: Replace FormData-Based Step Validation

If `handleNext` currently uses `new FormData(form)`, replace this with state-based validation.

Return clear validation messages.

### Step 7: Build Final Payload

Add a helper such as:

```ts
function buildCampaignFormData(values: CampaignWizardState): FormData
```

This helper must create the complete payload expected by `createCampaignAction`.

### Step 8: Submit Safely

Ensure submit behavior:

```text
Validate all steps/state.
Set pending/submitting state.
Call server action.
Show error if action fails.
Prevent double submit.
```

### Step 9: Update Status

Update `status.md` with:

```text
Phase 01 completed/attempted
Files changed
Bug fixed
Validation results
Remaining risks
Next phase recommendation
```

### Step 10: Validate

Run:

```bash
npm run lint
npm run typecheck
npm run build
```

If tests exist and are relevant, run them too.

If validation fails due to unrelated existing issues, document them clearly and do not perform unrelated repairs.

## Acceptance Criteria

This phase is complete only when all are true:

- [ ] Campaign wizard values persist when moving forward and backward.
- [ ] Previous step values are visible again when returning to earlier steps.
- [ ] Final submit includes all required campaign fields.
- [ ] Step validation uses complete wizard state, not only mounted DOM fields.
- [ ] Stage 5/final button says `Save Campaign`.
- [ ] Invalid fields show clear errors.
- [ ] Duplicate submit is prevented while pending.
- [ ] `createCampaignAction` payload contract remains aligned.
- [ ] No unrelated outreach logic is changed.
- [ ] `status.md` is updated.
- [ ] Lint/type/build validation is run and documented.

## Validation Checklist

Manual UI checks:

```text
1. Open Create New Campaign.
2. Fill Step 1.
3. Continue to Step 2.
4. Go Back to Step 1.
5. Confirm Step 1 values remain.
6. Fill all steps.
7. Go back two steps.
8. Confirm values remain.
9. Edit a prior field.
10. Continue to final step.
11. Save Campaign.
12. Confirm campaign is created with complete values.
13. Confirm no silent failure on invalid required fields.
```

Command checks:

```bash
npm run lint
npm run typecheck
npm run build
```

## Risks

| Risk | Mitigation |
|---|---|
| Server action expects different field names than UI uses | Inspect `app/campaigns/actions.ts` before building payload. |
| Booleans serialize incorrectly | Match existing parsing behavior exactly. |
| Array/list fields serialize incorrectly | Match existing parser expectations from server action/contracts. |
| Large component diff | Keep helpers local and avoid UI redesign. |
| Existing unrelated validation failures | Document clearly and do not repair unrelated code. |

## Rollback Notes

If the fix breaks campaign creation:

```bash
git diff app/campaigns/create-campaign-form.tsx app/campaigns/actions.ts lib/app/campaigns.ts lib/contracts.ts status.md
git checkout -- app/campaigns/create-campaign-form.tsx app/campaigns/actions.ts lib/app/campaigns.ts lib/contracts.ts status.md
```

Only use rollback after preserving any useful findings in notes/status.

## Final Response Requirements For Codex

Codex final response must include:

```text
Files changed
Summary of wizard root cause
Summary of implementation
Validation results
Manual test checklist result/status
Remaining P0/P1 issues
Next recommended phase
```

After code changes, remind the user to run:

```bash
graphify update .
python scripts/export_graphify_to_obsidian.py --graph graphify-out/graph.json --out docs/obsidian-vault/10_Graphify
```
