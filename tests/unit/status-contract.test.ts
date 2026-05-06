import { describe, expect, it } from "vitest";
import { normalizeReplyIntent, normalizeReplyReviewReason } from "@/lib/crm/status-contract";

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
