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

// Factory-function Supabase mock (no class, so S6958 "Do not add then to a class" cannot fire).
// limit() returns a Promise enriched with .maybeSingle() so both `await query.limit(n)` and
// `await query.limit(n).maybeSingle()` work correctly.
function buildMockQuery(table: string, db: Db) {
  let action: "select" | "insert" = "select";
  let headCount = false;
  const eqs: Array<{ column: string; value: any }> = [];
  let inFilter: { column: string; values: any[] } | null = null;
  const isNullColumns = new Set<string>();
  const gts: Array<{ column: string; value: any }> = [];
  const orderSpecs: Array<{ column: string; ascending: boolean }> = [];
  let limitN: number | null = null;
  let insertPayload: Row | null = null;

  function rowHasScore(row: Row) {
    return (db.lead_scores ?? []).some((s) => s.lead_id === row.id);
  }

  function computeRows() {
    let rows = [...(db[table] ?? [])];
    rows = rows.filter((row) => eqs.every((f) => row[f.column] === f.value));
    if (inFilter) rows = rows.filter((row) => inFilter!.values.includes(row[inFilter!.column]));
    for (const col of isNullColumns) {
      if (col === "lead_scores") rows = rows.filter((row) => !rowHasScore(row));
    }
    rows = rows.filter((row) => gts.every((f) => new Date(row[f.column]).getTime() > new Date(f.value).getTime()));
    if (orderSpecs.length > 0) {
      rows.sort((left, right) => {
        for (const spec of orderSpecs) {
          const l = String(left[spec.column] ?? "");
          const r = String(right[spec.column] ?? "");
          if (l !== r) return spec.ascending ? l.localeCompare(r) : r.localeCompare(l);
        }
        return 0;
      });
    }
    return limitN == null ? rows : rows.slice(0, limitN);
  }

  function buildResult() {
    if (action === "insert") {
      db[table] = db[table] ?? [];
      db[table].push({ id: `${table}-${db[table].length + 1}`, ...insertPayload });
      return { data: null, error: null };
    }
    const rows = computeRows();
    if (headCount) return { data: null, count: rows.length, error: null };
    return { data: rows, count: rows.length, error: null };
  }

  // Returns a Promise that also exposes .maybeSingle() so `limit(n).maybeSingle()` chains work.
  // The `then` here is a plain object property, not a class method — S6958 does not apply.
  function limitResult() {
    const result = buildResult();
    const rows = Array.isArray((result as any).data) ? (result as any).data as Row[] : [];
    return Object.assign(Promise.resolve(result), {
      maybeSingle: () => Promise.resolve({ data: rows[0] ?? null, error: null })
    });
  }

  const query = {
    select(_columns = "*", options?: { count?: "exact"; head?: boolean }) {
      action = "select";
      headCount = options?.head === true;
      return query;
    },
    insert(payload: Row) {
      action = "insert";
      insertPayload = payload;
      return Promise.resolve(buildResult());
    },
    eq(column: string, value: any) {
      eqs.push({ column, value });
      // head-count queries are terminal after eq (PostgREST behaviour).
      return headCount ? Promise.resolve(buildResult()) : query;
    },
    in(column: string, values: any[]) { inFilter = { column, values }; return query; },
    is(column: string, value: null) { if (value === null) isNullColumns.add(column); return query; },
    gt(column: string, value: any) { gts.push({ column, value }); return query; },
    order(column: string, options?: { ascending?: boolean }) {
      orderSpecs.push({ column, ascending: options?.ascending ?? true });
      return query;
    },
    limit(count: number) { limitN = count; return limitResult(); },
    maybeSingle() { return Promise.resolve({ data: computeRows()[0] ?? null, error: null }); }
  };

  return query;
}

function createMockClient(db: Db, rpcResponses: Record<string, (args: any) => any>) {
  return {
    from(table: string) {
      if (!db[table]) db[table] = [];
      return buildMockQuery(table, db);
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
