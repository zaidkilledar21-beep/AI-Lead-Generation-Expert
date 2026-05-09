import { afterEach, describe, expect, it, vi } from "vitest";

const exchangeMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/supabase/dashboard", () => ({
  createSupabaseDashboardClient: vi.fn(async () => ({
    auth: {
      exchangeCodeForSession: exchangeMock
    }
  }))
}));

import { GET } from "@/app/auth/callback/route";

function callbackRequest(search: string) {
  return new Request(`https://crm.example.test/auth/callback${search}`);
}

describe("auth callback route", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("exchanges code and redirects to a safe next path", async () => {
    exchangeMock.mockResolvedValue({ error: null });

    const response = await GET(callbackRequest("?code=auth-code&next=/pipeline"));

    expect(exchangeMock).toHaveBeenCalledWith("auth-code");
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("https://crm.example.test/pipeline");
  });

  it("normalizes unsafe next paths to root", async () => {
    exchangeMock.mockResolvedValue({ error: null });

    const response = await GET(callbackRequest("?code=auth-code&next=https://evil.example.test"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("https://crm.example.test/");
  });

  it("redirects to login when code is missing", async () => {
    const response = await GET(callbackRequest("?next=/pipeline"));
    const location = new URL(response.headers.get("location") ?? "");

    expect(exchangeMock).not.toHaveBeenCalled();
    expect(location.pathname).toBe("/login");
    expect(location.searchParams.get("error")).toBe("missing_auth_code");
  });
});
