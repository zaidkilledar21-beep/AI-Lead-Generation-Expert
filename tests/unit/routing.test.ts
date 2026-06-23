import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMockClient, type Db } from "./mock-supabase-client";

const mockState = vi.hoisted(() => ({
  client: null as any
}));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServiceClient: () => mockState.client
}));

function baseDb(overrides: Partial<Db> = {}): Db {
  return {
    leads: [],
    lead_scores: [],
    automation_hypotheses: [],
    reply_events: [],
    suppression_list: [],
    app_settings: [{ key: "global_outreach", value: { paused: false } }],
    campaigns: [],
    outreach_sequences: [],
    outreach_queue: [],
    manual_review_queue: [],
    ...overrides
  };
}

describe("routing idempotency", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("recovers from duplicate pending manual review insert conflicts", async () => {
    const db = baseDb();
    mockState.client = createMockClient(db, { manualReviewInsertConflict: true });
    const { createOrUpdateManualReview } = await import("@/lib/workflows/routing");

    await createOrUpdateManualReview("lead-1", "blocked_missing_sequence_B", "high");

    expect(db.manual_review_queue).toHaveLength(1);
    expect(db.manual_review_queue[0]).toMatchObject({
      lead_id: "lead-1",
      reason: "blocked_missing_sequence_B",
      priority: "high",
      review_status: "pending"
    });
  });

  it("queues a reachable B-band lead idempotently", async () => {
    const db = baseDb({
      leads: [{ id: "lead-1", email: "owner@acmeautomation.io", website: "https://acmeautomation.io", status: "scored", campaign_id: "campaign-1" }],
      lead_scores: [{ lead_id: "lead-1", band: "B", confidence: "high", manual_review_required: false, created_at: "2026-01-01" }],
      automation_hypotheses: [{ lead_id: "lead-1", outreach_hook: "Automate intake", created_at: "2026-01-01" }],
      campaigns: [{ id: "campaign-1", status: "active", assigned_inbox_id: "inbox-1" }],
      outreach_sequences: [{ id: "sequence-1", band: "B", active: true, archived: false }]
    });
    mockState.client = createMockClient(db);
    const { routeLead } = await import("@/lib/workflows/routing");

    await expect(routeLead("lead-1")).resolves.toEqual({ status: "queued", reasons: [] });
    await expect(routeLead("lead-1")).resolves.toEqual({ status: "queued", reasons: [] });

    expect(db.outreach_queue).toHaveLength(1);
    expect(db.outreach_queue[0]).toMatchObject({
      lead_id: "lead-1",
      sequence_id: "sequence-1",
      status: "queued",
      assigned_inbox: "inbox-1"
    });
    expect(db.leads[0].status).toBe("queued");
  });

  it.each([
    { label: "missing", email: null },
    { label: "invalid", email: "logo@2x.png" }
  ])("archives a $label-email lead before score-based routing", async ({ email }) => {
    const db = baseDb({
      leads: [{
        id: "lead-1",
        email,
        phone: "+971501234567",
        whatsapp: "visible",
        website: "https://acmeautomation.io",
        status: "scored",
        campaign_id: "campaign-1"
      }],
      lead_scores: [{
        lead_id: "lead-1",
        band: "A",
        confidence: "low",
        manual_review_required: true,
        created_at: "2026-01-01"
      }],
      automation_hypotheses: [{ lead_id: "lead-1", outreach_hook: "", created_at: "2026-01-01" }]
    });
    mockState.client = createMockClient(db);
    const { routeLead } = await import("@/lib/workflows/routing");

    await expect(routeLead("lead-1")).resolves.toEqual({
      status: "rejected_missing_email",
      reasons: ["missing_valid_email"]
    });

    expect(db.leads[0]).toMatchObject({
      status: "archived",
      closed_by: "system:missing_email_gate",
      email: null
    });
    expect(db.outreach_queue).toHaveLength(0);
    expect(db.manual_review_queue).toHaveLength(0);
    expect(db.workflow_events).toEqual([
      expect.objectContaining({
        workflow_name: "Email Qualification Gate",
        event_type: "lead_rejected_missing_email"
      })
    ]);
  });

  it("blocks reachable B-band leads with no sequence using an idempotent manual review", async () => {
    const db = baseDb({
      leads: [{ id: "lead-1", email: "owner@acmeautomation.io", website: "https://acmeautomation.io", status: "scored", campaign_id: "campaign-1" }],
      lead_scores: [{ lead_id: "lead-1", band: "B", confidence: "high", manual_review_required: false, created_at: "2026-01-01" }],
      automation_hypotheses: [{ lead_id: "lead-1", outreach_hook: "Automate intake", created_at: "2026-01-01" }],
      campaigns: [{ id: "campaign-1", status: "active", assigned_inbox_id: "inbox-1" }]
    });
    mockState.client = createMockClient(db);
    const { routeLead } = await import("@/lib/workflows/routing");

    await expect(routeLead("lead-1")).resolves.toEqual({
      status: "blocked_missing_sequence",
      reasons: ["missing_outreach_sequence_B"]
    });
    await expect(routeLead("lead-1")).resolves.toEqual({
      status: "blocked_missing_sequence",
      reasons: ["missing_outreach_sequence_B"]
    });

    expect(db.manual_review_queue).toHaveLength(1);
    expect(db.manual_review_queue[0]).toMatchObject({
      lead_id: "lead-1",
      reason: "blocked_missing_sequence_B",
      priority: "high",
      review_status: "pending"
    });
    expect(db.leads[0].status).toBe("blocked");
  });
});
