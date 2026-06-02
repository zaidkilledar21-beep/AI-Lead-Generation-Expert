import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMockClient, type Db } from "./mock-supabase-client";

const mockState = vi.hoisted(() => ({
  client: null as any
}));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServiceClient: () => mockState.client
}));

// scoreLead returns early on the existing-score path, before any DeepSeek call. Mocks keep that
// path isolated and avoid pulling live config/network dependencies at import time.
vi.mock("@/lib/deepseek", () => ({ callDeepSeekJson: vi.fn() }));
vi.mock("@/lib/contracts", () => ({ assertScoringOutput: vi.fn() }));
vi.mock("@/lib/config/icp", () => ({ icpConfig: {} }));
vi.mock("@/lib/workflows/routing", () => ({ createOrUpdateManualReview: vi.fn() }));

function dbWithLeadStatus(status: string): Db {
  return {
    leads: [{ id: "lead-1", status, campaign_id: "campaign-1" }],
    lead_enrichment: [],
    lead_scores: [
      {
        id: "score-1",
        lead_id: "lead-1",
        total_score: 60,
        band: "B",
        confidence: "high",
        prompt_version: "icp_scoring_v2",
        model: "deepseek-chat",
        created_at: "2026-01-01"
      }
    ]
  };
}

describe("scoreLead existing-score status guard", () => {
  beforeEach(() => {
    vi.resetModules();
    delete process.env.DEEPSEEK_MODEL;
  });

  it("does not regress routed/drafted/replied/closed leads back to scored", async () => {
    for (const status of ["queued", "drafted", "pending_approval", "in_sequence", "replied_interested", "closed_won", "unsubscribed"]) {
      const db = dbWithLeadStatus(status);
      mockState.client = createMockClient(db);
      const { scoreLead } = await import("@/lib/workflows/scoring");

      const result = await scoreLead("lead-1");

      expect((result as any).status).toBe("skipped_existing_score");
      expect(db.leads[0].status).toBe(status);
      vi.resetModules();
    }
  });

  it("re-asserts scored for a pre-routing lead with an existing score", async () => {
    const db = dbWithLeadStatus("enriched");
    mockState.client = createMockClient(db);
    const { scoreLead } = await import("@/lib/workflows/scoring");

    const result = await scoreLead("lead-1");

    expect((result as any).status).toBe("skipped_existing_score");
    expect(db.leads[0].status).toBe("scored");
  });
});
