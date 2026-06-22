import { beforeEach, describe, expect, it, vi } from "vitest";

const mockState = vi.hoisted(() => ({
  rpc: vi.fn()
}));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServiceClient: () => ({
    rpc: mockState.rpc
  })
}));

describe("scheduled discovery campaign claims", () => {
  beforeEach(() => {
    vi.resetModules();
    mockState.rpc.mockReset();
  });

  it("uses the bounded atomic due-campaign claim RPC", async () => {
    mockState.rpc.mockResolvedValue({
      data: [{
        campaign_id: "campaign-2",
        due_at: "2026-06-22T04:00:00.000Z",
        next_run_at: "2026-06-23T04:00:00.000Z"
      }],
      error: null
    });

    const { claimDueDiscoveryCampaigns } = await import("@/lib/workflows/lead-discovery");
    await expect(claimDueDiscoveryCampaigns(500)).resolves.toEqual([
      expect.objectContaining({ campaign_id: "campaign-2" })
    ]);
    expect(mockState.rpc).toHaveBeenCalledWith("claim_due_discovery_campaigns", {
      p_limit: 50,
      p_now: expect.any(String)
    });
  });

  it("surfaces claim errors without starting an implicit first campaign", async () => {
    mockState.rpc.mockResolvedValue({ data: null, error: { message: "claim failed" } });

    const { claimDueDiscoveryCampaigns } = await import("@/lib/workflows/lead-discovery");
    await expect(claimDueDiscoveryCampaigns()).rejects.toThrow("claim failed");
  });
});
