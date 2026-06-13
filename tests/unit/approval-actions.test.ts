import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  approveLead: vi.fn(),
  revalidatePath: vi.fn()
}));

vi.mock("next/cache", () => ({
  revalidatePath: mocks.revalidatePath
}));

vi.mock("@/lib/app/leads", () => ({
  approveCrmLeadForOutreach: mocks.approveLead,
  updateCrmLeadStatus: vi.fn()
}));

vi.mock("@/lib/app/auth", () => ({
  requireAppActor: vi.fn()
}));

vi.mock("@/lib/app/audit", () => ({
  logCrmAction: vi.fn()
}));

vi.mock("@/lib/app/settings", () => ({
  updateGlobalOutreachSettings: vi.fn()
}));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServiceClient: vi.fn()
}));

describe("approveLeadWithFeedbackAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns a structured error when approval is rejected by the RPC wrapper", async () => {
    mocks.approveLead.mockRejectedValueOnce(new Error("Global outreach is paused"));
    const { approveLeadWithFeedbackAction } = await import("@/lib/crm/actions");
    const formData = new FormData();
    formData.set("leadId", "lead-1");

    await expect(approveLeadWithFeedbackAction(formData)).resolves.toEqual({
      ok: false,
      error: "Global outreach is paused"
    });
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  it("revalidates pipeline surfaces after successful approval", async () => {
    mocks.approveLead.mockResolvedValueOnce(undefined);
    const { approveLeadWithFeedbackAction } = await import("@/lib/crm/actions");
    const formData = new FormData();
    formData.set("leadId", "lead-1");

    await expect(approveLeadWithFeedbackAction(formData)).resolves.toEqual({ ok: true });
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/pipeline");
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/pipeline/lead-1");
  });
});
