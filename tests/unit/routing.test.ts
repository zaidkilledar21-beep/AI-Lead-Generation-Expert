import { beforeEach, describe, expect, it, vi } from "vitest";

const mockState = vi.hoisted(() => ({
  client: null as any
}));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServiceClient: () => mockState.client
}));

type Row = Record<string, any>;
type Db = Record<string, Row[]>;

class MockQuery {
  private action: "select" | "update" | "insert" = "select";
  private readonly filters: Array<{ column: string; value: any }> = [];
  private payload: Row | null = null;
  private single = false;
  private countHead = false;
  private limitCount: number | null = null;
  private orderSpec: { column: string; ascending: boolean } | null = null;

  constructor(
    private readonly table: string,
    private readonly db: Db,
    private readonly options: { manualReviewInsertConflict?: boolean; outreachQueueInsertConflict?: boolean }
  ) {}

  select(_columns = "*", options?: { count?: "exact"; head?: boolean }) {
    this.action = "select";
    this.countHead = options?.count === "exact" && options?.head === true;
    return this;
  }

  update(payload: Row) {
    this.action = "update";
    this.payload = payload;
    return this;
  }

  insert(payload: Row) {
    this.action = "insert";
    this.payload = payload;
    return this.execute();
  }

  eq(column: string, value: any) {
    this.filters.push({ column, value });
    return this.isTerminalEq() ? this.execute() : this;
  }

  order(column: string, options?: { ascending?: boolean }) {
    this.orderSpec = { column, ascending: options?.ascending ?? true };
    return this;
  }

  limit(count: number) {
    this.limitCount = count;
    return this;
  }

  maybeSingle() {
    this.single = true;
    return this.execute();
  }

  private matches(row: Row) {
    return this.filters.every((filter) => row[filter.column] === filter.value);
  }

  private isTerminalEq() {
    if (this.countHead) return true;
    if (this.action !== "update") return false;
    const latestFilter = this.filters[this.filters.length - 1];
    if (this.table === "manual_review_queue") return latestFilter?.column === "id" || this.filters.length >= 2;
    return this.filters.length >= 1;
  }

  private filteredRows() {
    let rows = [...(this.db[this.table] ?? [])].filter((row) => this.matches(row));
    if (this.orderSpec) {
      const { column, ascending } = this.orderSpec;
      rows = rows.sort((left, right) => {
        const leftValue = String(left[column] ?? "");
        const rightValue = String(right[column] ?? "");
        return ascending ? leftValue.localeCompare(rightValue) : rightValue.localeCompare(leftValue);
      });
    }
    return this.limitCount == null ? rows : rows.slice(0, this.limitCount);
  }

  private async execute() {
    if (this.action === "update") return this.executeUpdate();
    if (this.action === "insert") return this.executeInsert();

    const rows = this.filteredRows();
    if (this.countHead) return { data: null, count: rows.length, error: null };
    return { data: this.single ? rows[0] ?? null : rows, count: rows.length, error: null };
  }

  private executeUpdate() {
    const rows = this.filteredRows();
    rows.forEach((row) => Object.assign(row, this.payload));
    return { data: null, error: null };
  }

  private executeInsert() {
    if (this.table === "manual_review_queue" && this.options.manualReviewInsertConflict) {
      this.options.manualReviewInsertConflict = false;
      this.db.manual_review_queue.push({
        id: "review-race",
        lead_id: this.payload?.lead_id,
        reason: "old_reason",
        priority: "low",
        review_status: "pending"
      });
      return { data: null, error: { code: "23505", message: "duplicate key value violates unique constraint" } };
    }

    if (this.table === "outreach_queue" && this.options.outreachQueueInsertConflict) {
      this.options.outreachQueueInsertConflict = false;
      this.db.outreach_queue.push({
        id: "queue-race",
        lead_id: this.payload?.lead_id,
        sequence_id: this.payload?.sequence_id,
        status: "queued"
      });
      return { data: null, error: { code: "23505", message: "duplicate key value violates unique constraint" } };
    }

    this.db[this.table].push({ id: `${this.table}-${this.db[this.table].length + 1}`, ...this.payload });
    return { data: null, error: null };
  }
}

function createMockClient(db: Db, options: { manualReviewInsertConflict?: boolean; outreachQueueInsertConflict?: boolean } = {}) {
  return {
    from(table: string) {
      if (!db[table]) db[table] = [];
      return new MockQuery(table, db, options);
    }
  };
}

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
