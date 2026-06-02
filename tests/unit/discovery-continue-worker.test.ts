import { beforeEach, describe, expect, it, vi } from "vitest";

const mockState = vi.hoisted(() => ({
  client: null as any,
  enrichLead: null as any,
  scoreLead: null as any,
  safeFinalizeDiscoveryRun: null as any
}));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServiceClient: () => mockState.client
}));
vi.mock("@/lib/workflows/enrichment", () => ({
  enrichLead: (leadId: string) => mockState.enrichLead(leadId)
}));
vi.mock("@/lib/workflows/scoring", () => ({
  scoreLead: (leadId: string) => mockState.scoreLead(leadId)
}));
vi.mock("@/lib/workflows/lead-discovery", () => ({
  safeFinalizeDiscoveryRun: (...args: any[]) => mockState.safeFinalizeDiscoveryRun(...args)
}));

type Row = Record<string, any>;
type Db = Record<string, Row[]>;

// Thenable Supabase mock supporting the query chains the worker uses: select(+head count),
// eq/in/is/gt filters, multi-key order, limit, maybeSingle, insert, and rpc.
class MockQuery {
  private action: "select" | "insert" = "select";
  private headCount = false;
  private readonly eqs: Array<{ column: string; value: any }> = [];
  private inFilter: { column: string; values: any[] } | null = null;
  private readonly isNullColumns = new Set<string>();
  private readonly gts: Array<{ column: string; value: any }> = [];
  private readonly orderSpecs: Array<{ column: string; ascending: boolean }> = [];
  private limitN: number | null = null;
  private payload: Row | null = null;

  constructor(private readonly table: string, private readonly db: Db) {}

  select(_columns = "*", options?: { count?: "exact"; head?: boolean }) {
    this.action = "select";
    this.headCount = options?.head === true;
    return this;
  }

  insert(payload: Row) {
    this.action = "insert";
    this.payload = payload;
    return this;
  }

  eq(column: string, value: any) {
    this.eqs.push({ column, value });
    return this;
  }

  in(column: string, values: any[]) {
    this.inFilter = { column, values };
    return this;
  }

  is(column: string, value: null) {
    if (value === null) this.isNullColumns.add(column);
    return this;
  }

  gt(column: string, value: any) {
    this.gts.push({ column, value });
    return this;
  }

  order(column: string, options?: { ascending?: boolean }) {
    this.orderSpecs.push({ column, ascending: options?.ascending ?? true });
    return this;
  }

  limit(count: number) {
    this.limitN = count;
    return this;
  }

  maybeSingle() {
    const rows = this.computeRows();
    return Promise.resolve({ data: rows[0] ?? null, error: null });
  }

  private rowHasScore(row: Row) {
    return (this.db.lead_scores ?? []).some((score) => score.lead_id === row.id);
  }

  private computeRows() {
    let rows = [...(this.db[this.table] ?? [])];
    rows = rows.filter((row) => this.eqs.every((f) => row[f.column] === f.value));
    if (this.inFilter) rows = rows.filter((row) => this.inFilter!.values.includes(row[this.inFilter!.column]));
    for (const col of this.isNullColumns) {
      // Emulates PostgREST embedded `lead_scores()` + `.is("lead_scores", null)`.
      if (col === "lead_scores") rows = rows.filter((row) => !this.rowHasScore(row));
    }
    rows = rows.filter((row) => this.gts.every((f) => new Date(row[f.column]).getTime() > new Date(f.value).getTime()));
    if (this.orderSpecs.length > 0) {
      rows.sort((left, right) => {
        for (const spec of this.orderSpecs) {
          const l = String(left[spec.column] ?? "");
          const r = String(right[spec.column] ?? "");
          if (l !== r) return spec.ascending ? l.localeCompare(r) : r.localeCompare(l);
        }
        return 0;
      });
    }
    return this.limitN == null ? rows : rows.slice(0, this.limitN);
  }

  private resolve() {
    if (this.action === "insert") {
      this.db[this.table] = this.db[this.table] ?? [];
      this.db[this.table].push({ id: `${this.table}-${this.db[this.table].length + 1}`, ...this.payload });
      return { data: null, error: null };
    }
    const rows = this.computeRows();
    if (this.headCount) return { data: null, count: rows.length, error: null };
    return { data: rows, count: rows.length, error: null };
  }

  then(onFulfilled: (value: any) => any, onRejected?: (reason: any) => any) {
    return Promise.resolve(this.resolve()).then(onFulfilled, onRejected);
  }
}

function createMockClient(db: Db, rpcResponses: Record<string, (args: any) => any>) {
  return {
    from(table: string) {
      if (!db[table]) db[table] = [];
      return new MockQuery(table, db);
    },
    rpc(name: string, args: any) {
      const handler = rpcResponses[name];
      const data = handler ? handler(args) : null;
      return Promise.resolve({ data, error: null });
    }
  };
}

function baseRpcResponses() {
  return {
    acquire_discovery_recovery_lease: () => true,
    release_discovery_recovery_lease: () => true,
    sync_run_review_pending: () => 0
  };
}

describe("continueDiscoveryProcessing", () => {
  beforeEach(() => {
    vi.resetModules();
    mockState.enrichLead = vi.fn(async (_leadId: string) => ({ status: "completed" }));
    mockState.safeFinalizeDiscoveryRun = vi.fn(async () => ({ status: "completed", stats: {}, finalized: true }));
  });

  it("skips already-scored leads, processes unscored, and finalizes when no work remains", async () => {
    const db: Db = {
      discovery_runs: [{ id: "run-1", campaign_id: "camp-1", status: "running", started_at: "2026-01-01" }],
      leads: [
        { id: "lead-scored", business_name: "Scored Co", status: "scored", campaign_id: "camp-1", discovery_run_id: "run-1", updated_at: "2026-01-01", created_at: "2026-01-01" },
        { id: "lead-new", business_name: "New Co", status: "new", campaign_id: "camp-1", discovery_run_id: "run-1", updated_at: "2026-01-02", created_at: "2026-01-02" }
      ],
      lead_scores: [{ id: "score-1", lead_id: "lead-scored" }],
      lead_enrichment: [],
      wf04_scored_leads: [{ id: "lead-new", discovery_run_id: "run-1" }],
      workflow_events: []
    };
    // scoreLead persists a score so the lead is excluded from the remaining-work recheck.
    mockState.scoreLead = vi.fn(async (leadId: string) => {
      db.lead_scores.push({ id: `score-${leadId}`, lead_id: leadId });
    });
    mockState.client = createMockClient(db, baseRpcResponses());

    const { continueDiscoveryProcessing } = await import("@/lib/workflows/recovered-discovery");
    const result = await continueDiscoveryProcessing({});

    expect(mockState.scoreLead).toHaveBeenCalledTimes(1);
    expect(mockState.scoreLead).toHaveBeenCalledWith("lead-new");
    expect(result.runs_seen).toBe(1);
    expect(result.runs_processed).toBe(1);
    expect(result.leads_processed).toBe(1);
    expect(result.scored).toBe(1);
    expect(result.finalized).toBe(1);
    expect(mockState.safeFinalizeDiscoveryRun).toHaveBeenCalledTimes(1);
    expect(result.per_run[0]).toMatchObject({ run_id: "run-1", finalized: true, awaiting_wf04: true });
  });

  it("does not finalize while processable work remains beyond the batch limit", async () => {
    const db: Db = {
      discovery_runs: [{ id: "run-1", campaign_id: "camp-1", status: "running", started_at: "2026-01-01" }],
      leads: [
        { id: "lead-a", business_name: "A", status: "new", campaign_id: "camp-1", discovery_run_id: "run-1", updated_at: "2026-01-01", created_at: "2026-01-01" },
        { id: "lead-b", business_name: "B", status: "new", campaign_id: "camp-1", discovery_run_id: "run-1", updated_at: "2026-01-02", created_at: "2026-01-02" }
      ],
      lead_scores: [],
      lead_enrichment: [],
      wf04_scored_leads: [],
      workflow_events: []
    };
    mockState.scoreLead = vi.fn(async (leadId: string) => {
      db.lead_scores.push({ id: `score-${leadId}`, lead_id: leadId });
    });
    mockState.client = createMockClient(db, baseRpcResponses());

    const { continueDiscoveryProcessing } = await import("@/lib/workflows/recovered-discovery");
    const result = await continueDiscoveryProcessing({ limit: 1 });

    expect(mockState.scoreLead).toHaveBeenCalledTimes(1);
    expect(result.leads_processed).toBe(1);
    expect(result.finalized).toBe(0);
    expect(mockState.safeFinalizeDiscoveryRun).not.toHaveBeenCalled();
    expect(result.per_run[0]).toMatchObject({ run_id: "run-1", finalized: false });
  });

  it("skips runs whose recovery lease is already held", async () => {
    const db: Db = {
      discovery_runs: [{ id: "run-1", campaign_id: "camp-1", status: "running", started_at: "2026-01-01" }],
      leads: [],
      lead_scores: [],
      lead_enrichment: [],
      wf04_scored_leads: [],
      workflow_events: []
    };
    mockState.scoreLead = vi.fn();
    const rpc = { ...baseRpcResponses(), acquire_discovery_recovery_lease: () => false };
    mockState.client = createMockClient(db, rpc);

    const { continueDiscoveryProcessing } = await import("@/lib/workflows/recovered-discovery");
    const result = await continueDiscoveryProcessing({});

    expect(result.runs_seen).toBe(1);
    expect(result.runs_processed).toBe(0);
    expect(mockState.scoreLead).not.toHaveBeenCalled();
    expect(result.per_run[0]).toMatchObject({ run_id: "run-1", result: "lease_unavailable" });
  });
});
