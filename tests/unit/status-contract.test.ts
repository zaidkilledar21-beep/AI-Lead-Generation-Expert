import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  DRAFT_APPROVAL_STATUSES,
  LEAD_STATUS_LABELS,
  LEAD_STATUSES,
  MANUAL_REVIEW_STATUSES,
  QUEUE_STATUSES,
  normalizeReplyIntent,
  normalizeReplyReviewReason
} from "@/lib/crm/status-contract";

function quotedValues(value: string) {
  return [...value.matchAll(/'([^']+)'/g)].map((match) => match[1]);
}

function expectSameSet(actual: readonly string[], expected: readonly string[]) {
  expect([...actual].sort((left, right) => left.localeCompare(right))).toEqual(
    [...expected].sort((left, right) => left.localeCompare(right))
  );
}

describe("reply intent contract", () => {
  it("normalizes legacy positive reply intents to the canonical value", () => {
    expect(normalizeReplyIntent("interested")).toBe("positive_interest");
    expect(normalizeReplyIntent("pricing_request")).toBe("positive_interest");
    expect(normalizeReplyIntent("call_request")).toBe("positive_interest");
  });

  it("normalizes legacy neutral and fallback values safely", () => {
    expect(normalizeReplyIntent("question")).toBe("neutral_question");
    expect(normalizeReplyIntent("ambiguous")).toBe("manual_review_required");
    expect(normalizeReplyIntent("unknown")).toBe("manual_review_required");
    expect(normalizeReplyIntent(null)).toBe("manual_review_required");
  });

  it("normalizes legacy reply review reasons while preserving canonical reason shape", () => {
    expect(normalizeReplyReviewReason("reply_interested")).toBe("reply_positive_interest");
    expect(normalizeReplyReviewReason("reply_question")).toBe("reply_neutral_question");
    expect(normalizeReplyReviewReason("reply_bounce_or_noise")).toBe("reply_bounce");
  });
});

describe("CRM state naming contract", () => {
  it("keeps canonical lead statuses aligned with the dashboard status RPC contract", () => {
    const migration = readFileSync(join(process.cwd(), "supabase/migrations/011_pass_6_contract_closure.sql"), "utf8");
    const leadStatusBlock = migration.match(/if v_next_status not in \(([\s\S]*?)\)\s+then/);

    expect(leadStatusBlock).not.toBeNull();
    expectSameSet(LEAD_STATUSES, quotedValues(leadStatusBlock?.[1] ?? ""));
  });

  it("keeps queue, draft approval, and manual review states canonical", () => {
    expectSameSet(QUEUE_STATUSES, ["queued", "drafted", "paused", "blocked", "replied", "completed"]);
    expectSameSet(DRAFT_APPROVAL_STATUSES, ["pending", "approved", "auto_approved", "rejected", "blocked", "regeneration_requested"]);
    expectSameSet(MANUAL_REVIEW_STATUSES, ["pending", "approved", "rejected"]);
  });

  it("has display labels for every canonical lead status", () => {
    expectSameSet(Object.keys(LEAD_STATUS_LABELS), LEAD_STATUSES);
  });
});
