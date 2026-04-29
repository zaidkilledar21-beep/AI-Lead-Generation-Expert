# AI Automation Lead Gen Agent

This repository is for the internal MVP of an AI-powered client acquisition engine for an automation business.

The canonical project specification is the PRD:
[AI_Automation_Lead_Gen_Agent_PRD.md](</Users/ZaidImranKilledar/Documents/Codex/2026-04-28/create-a-new-project-directory-titled/AI Automation/AI_Automation_Lead_Gen_Agent_PRD.md>)

This README is a working orientation document. When there is any conflict, the PRD is the source of truth.

## Project Goal

Build a lean but scalable lead-generation and outreach system that can:

- discover automation-fit businesses globally
- enrich lead and business data from public sources
- score each lead against a configurable ICP
- generate an automation hypothesis for qualified leads
- route leads into priority bands
- send personalized outreach from one professional business inbox
- follow up automatically when there is no reply
- detect replies and pause automation immediately
- notify founders for human takeover when a prospect shows interest
- track all activity in Supabase as the operational source of truth

This is an internal operating system for the founders, not a polished SaaS product.

## MVP Priorities

The PRD defines three core priorities:

1. Affordability
2. Longevity
3. Scalability

The MVP should automate repetitive work while keeping human review where quality, reputation, and sales judgment matter.

## Core Workflow

The end-to-end workflow described in the PRD is:

1. Lead discovery
2. Lead enrichment
3. ICP scoring
4. Automation hypothesis generation
5. Band assignment and routing
6. Outreach sequencing
7. Reply detection and pause logic
8. Founder notification and manual takeover
9. Reporting and dashboard visibility

## MVP Architecture

The recommended MVP stack in the PRD is:

- `Supabase` for database and long-term source of truth
- `n8n` for workflow orchestration
- `DeepSeek API` for scoring, hypothesis generation, personalization, and reply classification
- `Google Workspace` for the single outreach inbox
- `Next.js` on `Vercel` for the internal dashboard
- `GitHub` for version control
- `Telegram`, `Discord`, or email for internal notifications

## Product Boundaries

Included in MVP:

- internal dashboard
- configurable ICP scoring
- structured lead routing bands
- automated email sequencing
- reply detection and automatic pause behavior
- founder review queues and human takeover points

Out of scope for MVP:

- customer-facing SaaS dashboard
- payment processing
- proposal generation
- fully automated sales conversations
- expensive enrichment providers by default
- multi-inbox or enterprise outreach infrastructure

## Delivery Notes

- Supabase should remain the single source of truth across leads, scores, evidence, outreach, replies, and review state.
- Core AI outputs should be structured wherever possible, especially for scoring and classification.
- Workflow logic should be modular and safe to rerun.
- Security-sensitive credentials must live in environment variables or secure workflow credentials, never hardcoded.
- The dashboard can stay simple as long as the lead-to-outreach pipeline is reliable.

## Build Milestone Snapshot

The PRD roadmap breaks the MVP into these broad phases:

1. Supabase schema and dashboard shell
2. n8n and AI integration setup
3. lead discovery and deduplication
4. enrichment workflows
5. scoring and routing
6. outreach sequencing
7. reply detection and notifications
8. dashboard review workflows
9. end-to-end testing and first controlled outreach batch

## Working Rule

Before making substantial product, architecture, or workflow decisions, read the PRD first and align implementation to it.
