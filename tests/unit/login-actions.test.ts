import { afterEach, describe, expect, it, vi } from "vitest";

const dashboardClientMock = vi.hoisted(() => ({
  signInWithPassword: vi.fn(),
  signOut: vi.fn()
}));

const roleMock = vi.hoisted(() => ({
  getActiveDashboardUserRole: vi.fn()
}));

const redirectMock = vi.hoisted(() => vi.fn((path: string) => {
  throw new Error(`NEXT_REDIRECT:${path}`);
}));

vi.mock("@/lib/supabase/dashboard", () => ({
  createSupabaseDashboardClient: vi.fn(async () => ({
    auth: dashboardClientMock
  }))
}));

vi.mock("@/lib/app/auth", () => {
  class DashboardAuthError extends Error {
    constructor(
      message: string,
      readonly code: "auth_required" | "inactive" | "forbidden" | "misconfigured" | "lookup_failed"
    ) {
      super(message);
      this.name = "DashboardAuthError";
    }
  }

  return {
    DASHBOARD_READ_ROLES: ["founder", "admin", "operator", "viewer"],
    DashboardAuthError,
    getActiveDashboardUserRole: roleMock.getActiveDashboardUserRole
  };
});

vi.mock("next/navigation", () => ({
  redirect: redirectMock
}));

import { DashboardAuthError } from "@/lib/app/auth";
import { signIn } from "@/app/login/actions";

function loginFormData(next = "/pipeline") {
  const formData = new FormData();
  formData.set("email", "operator@example.test");
  formData.set("password", "password");
  formData.set("next", next);
  return formData;
}

describe("login action", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("accepts an active dashboard user", async () => {
    dashboardClientMock.signInWithPassword.mockResolvedValue({
      data: { user: { id: "user-1" } },
      error: null
    });
    roleMock.getActiveDashboardUserRole.mockResolvedValue("operator");

    await expect(signIn({ error: "" }, loginFormData("/analytics"))).rejects.toThrow("NEXT_REDIRECT:/analytics");

    expect(dashboardClientMock.signOut).not.toHaveBeenCalled();
    expect(roleMock.getActiveDashboardUserRole).toHaveBeenCalledWith("user-1");
  });

  it("rejects and signs out an inactive dashboard user", async () => {
    dashboardClientMock.signInWithPassword.mockResolvedValue({
      data: { user: { id: "user-2" } },
      error: null
    });
    roleMock.getActiveDashboardUserRole.mockRejectedValue(new DashboardAuthError("inactive", "inactive"));

    const result = await signIn({ error: "" }, loginFormData());

    expect(result.error).toBe("Dashboard access is inactive for this account");
    expect(dashboardClientMock.signOut).toHaveBeenCalledTimes(1);
  });

  it("returns auth failures without dashboard access masking", async () => {
    dashboardClientMock.signInWithPassword.mockResolvedValue({
      data: { user: null },
      error: { message: "Invalid login credentials" }
    });

    const result = await signIn({ error: "" }, loginFormData());

    expect(result.error).toBe("Invalid login credentials");
    expect(roleMock.getActiveDashboardUserRole).not.toHaveBeenCalled();
    expect(dashboardClientMock.signOut).not.toHaveBeenCalled();
  });
});
