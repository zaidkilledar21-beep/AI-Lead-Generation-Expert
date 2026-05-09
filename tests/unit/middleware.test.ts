import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const supabaseMock = vi.hoisted(() => ({
  getUser: vi.fn()
}));

vi.mock("@supabase/ssr", () => ({
  createServerClient: vi.fn(() => ({
    auth: {
      getUser: supabaseMock.getUser
    }
  }))
}));

import { createServerClient } from "@supabase/ssr";
import { middleware } from "@/middleware";

function nextRequest(pathname: string) {
  return new NextRequest(new URL(pathname, "https://crm.example.test"));
}

describe("middleware route protection", () => {
  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
  });

  it("does not require dashboard auth for API routes", async () => {
    const response = await middleware(nextRequest("/api/workflows/lead-intake"));

    expect(response.status).toBe(200);
    expect(createServerClient).not.toHaveBeenCalled();
  });

  it("fails closed in production when Supabase auth config is missing", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "");

    const response = await middleware(nextRequest("/pipeline"));

    expect(response.status).toBe(500);
    await expect(response.text()).resolves.toBe("Supabase Auth is not configured");
  });

  it("redirects unauthenticated protected routes to login with next path", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://supabase.example.test");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon");
    supabaseMock.getUser.mockResolvedValue({ data: { user: null } });

    const response = await middleware(nextRequest("/pipeline?stage=scored"));

    const location = new URL(response.headers.get("location") ?? "");
    expect(response.status).toBe(307);
    expect(location.origin).toBe("https://crm.example.test");
    expect(location.pathname).toBe("/login");
    expect(location.searchParams.get("next")).toBe("/pipeline?stage=scored");
  });

  it("keeps authenticated users on protected routes", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://supabase.example.test");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon");
    supabaseMock.getUser.mockResolvedValue({ data: { user: { id: "user-1" } } });

    const response = await middleware(nextRequest("/pipeline"));

    expect(response.status).toBe(200);
    expect(response.headers.get("location")).toBeNull();
  });

  it("redirects authenticated users away from login", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://supabase.example.test");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon");
    supabaseMock.getUser.mockResolvedValue({ data: { user: { id: "user-1" } } });

    const response = await middleware(nextRequest("/login"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("https://crm.example.test/");
  });
});
