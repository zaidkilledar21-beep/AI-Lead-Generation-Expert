import { beforeEach, describe, expect, it, vi } from "vitest";

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

type Row = Record<string, any>;
type Db = Record<string, Row[]>;

class MockQuery {
  private action: "select" | "update" = "select";
  private readonly filters: Array<{ column: string; value: any }> = [];
  private payload: Row | null = null;
  private limitCount: number | null = null;
  private orderSpec: { column: string; ascending: boolean } | null = null;

  constructor(private readonly table: string, private readonly db: Db) {}

  select() {
    this.action = "select";
    return this;
  }

  update(payload: Row) {
    this.action = "update";
    this.payload = payload;
    return this;
  }

  eq(column: string, value: any) {
    this.filters.push({ column, value });
    return this.action === "update" ? this.executeUpdate() : this;
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
    const rows = this.filteredRows();
    return Promise.resolve({ data: rows[0] ?? null, error: null });
  }

  private matches(row: Row) {
    return this.filters.every((filter) => row[filter.column] === filter.value);
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

  private executeUpdate() {
    this.filteredRows().forEach((row) => Object.assign(row, this.payload));
    return Promise.resolve({ data: null, error: null });
  }
}

function createMockClient(db: Db) {
  return {
    from(table: string) {
      if (!db[table]) db[table] = [];
      return new MockQuery(table, db);
    }
  };
}

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
