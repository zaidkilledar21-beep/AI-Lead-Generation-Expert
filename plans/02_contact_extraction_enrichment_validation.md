# Phase 2: Contact Extraction, Email Validation, and Enrichment Correctness

## Goal

Improve extraction quality so real leads have valid emails/phones where available, and bad extracted junk does not enter outreach.

## Files to inspect first

- `lib/workflows/website-crawler.ts`
- `lib/workflows/enrichment.ts`
- `lib/workflows/discovery.ts`
- `lib/workflows/lead-discovery.ts`
- `lib/contracts.ts`
- `lib/validation/*` if present
- `status.md`

## Problems to fix

### 1. Email extraction is too naive

Current extraction uses broad regex against lowercased HTML. This can capture junk from scripts, CSS, assets, tracking snippets, and placeholder emails.

Required fix:
- Strip `script`, `style`, `svg`, `noscript`, and comments before extraction.
- Decode basic HTML entities.
- Extract from visible text, `mailto:` links, and obfuscated formats like `name [at] domain [dot] com`.
- Normalize emails to lowercase.
- Validate with a strict but practical email validator.
- Reject asset filenames, placeholder domains, tracking/no-reply addresses when better addresses exist, malformed TLDs, and emails with paths/query fragments.

### 2. Prefer business-relevant emails

Ranking order:
1. Direct business domain email matching the website domain.
2. Contact/sales/info/hello/team/admin on business domain.
3. Non-domain but legitimate business email.
4. Generic or no-reply only as low-confidence evidence, not automatic outreach email.

Add helper:
`selectBestBusinessEmail(emails, websiteDomain): { email, confidence, reason }`

### 3. Phone extraction needs cleanup

Required fix:
- Normalize whitespace.
- Keep plus signs and digits.
- Reject numbers too short or obviously date-like.
- Prefer Google Places `nationalPhoneNumber` over crawl-extracted phone.
- Store extracted phone only if the lead has no phone.

### 4. Candidate normalized_payload should preserve extracted contact data

When `enrichCandidateFromWebsite` modifies candidate email/phone/whatsapp:
- Ensure inserted `lead_candidates.normalized_payload` contains the final enriched candidate values.
- Ensure `source_attribution.website_crawl_signals` includes extraction confidence summary.

### 5. Enrichment should reuse candidate crawl safely

In `enrichment.ts`:
- If candidate crawl succeeded, reuse it.
- If candidate normalized payload has a valid email, use it.
- If candidate email is invalid, ignore it and log why.
- Do not crawl the same site twice unless candidate crawl failed/skipped and the lead has a website.

### 6. Discovery should not promote unreachable leads automatically

Candidates with no valid email, phone, WhatsApp, or contact form can still be saved, but routing should send them to manual review or pause instead of assuming outreach readiness.

## Acceptance criteria

- Extracted emails pass validation and are explainable.
- `lead_candidates.normalized_payload.email` and `leads.email` match when email is found.
- Invalid emails do not enter `leads.email`.
- Candidate crawl failure does not fail the full discovery run.
- Enrichment records clearly show whether contact data came from Places or crawl.
- Tests cover email extraction edge cases where practical.
