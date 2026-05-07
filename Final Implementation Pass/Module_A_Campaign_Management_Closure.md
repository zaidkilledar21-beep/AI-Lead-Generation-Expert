# Module A Implementation Plan: Campaign Management Closure

## Goal

Make campaign lifecycle administration complete, safe, and honest without redesigning the campaign module.

## Current State

Campaign creation, editing, detail tabs, import, pause/resume, and n8n manual run are implemented. The remaining gaps are admin lifecycle controls and clearer readiness/copy.

## Scope

This module covers:

- Campaign duplication
- Campaign archive/delete behavior
- Campaign readiness checks
- Campaign launch copy cleanup
- Manual n8n run guardrails

## Files Likely Involved

```text
app/campaigns/actions.ts
app/campaigns/page.tsx
app/campaigns/[campaign_id]/page.tsx
app/campaigns/create-campaign-form.tsx
lib/crm/queries.ts
lib/crm/actions.ts
supabase/migrations/*
```

## Tasks

### 1. Add Duplicate Campaign Action

Create `duplicateCampaignAction(campaignId)`.

Behavior:

- Require dashboard write access.
- Load the source campaign.
- Copy all configuration fields:
  - niche
  - region/countries/cities
  - keywords/excluded keywords
  - scoring thresholds
  - sequence routing
  - inbox assignment
  - discovery caps
  - provider flags
  - crawl settings
- Set copied campaign status to `draft`.
- Append `"Copy"` or timestamp to campaign name.
- Do not copy:
  - leads
  - lead candidates
  - discovery runs
  - workflow events
  - campaign analytics
- Revalidate:
  - `/campaigns`
  - new campaign detail route

### 2. Add Archive Campaign Action

Create `archiveCampaignAction(campaignId)`.

Behavior:

- Require dashboard write access.
- Prefer `status = archived` instead of hard delete.
- Block archive if a related discovery run is currently `running`.
- Preserve analytics and historical lead relationships.
- Revalidate:
  - `/campaigns`
  - `/analytics`
  - `/pipeline`

### 3. Add Campaign Detail UI Controls

Add actions on campaign detail page:

- `Duplicate`
- `Archive`
- Confirm archive with a clear warning.

Suggested copy:

```text
Archiving keeps historical leads, runs, and analytics, but removes this campaign from active operating views.
```

### 4. Fix Launch Copy

Replace any copy implying immediate ingestion with:

```text
Active campaigns are eligible for scheduled or manual n8n discovery runs.
```

Avoid claiming discovery starts automatically unless the workflow schedule actually does so.

### 5. Add Campaign Readiness Card

Add readiness checks:

- Campaign has active status or draft warning.
- At least one target country/city/region exists.
- At least one inbox is active.
- Daily caps are configured.
- Sequence/routing exists.
- n8n manual-run configuration exists.
- Global pause status visible.

Readiness states:

```text
Ready
Needs attention
Blocked
```

## Acceptance Criteria

- Duplicating a campaign creates a draft with copied config but no copied leads/runs.
- Archiving removes the campaign from active default views but keeps history.
- Campaign detail has Duplicate and Archive actions.
- Campaign launch copy does not overpromise automation behavior.
- Readiness card blocks or warns before manual n8n run when required configuration is missing.

## Validation

Run:

```bash
npm run lint
npm run typecheck
npm run build
npm test
```

Manual smoke:

1. Create campaign.
2. Duplicate campaign.
3. Confirm duplicate is draft.
4. Archive duplicate.
5. Confirm archived campaign does not appear in default active campaign list.
6. Confirm analytics/history is preserved.
