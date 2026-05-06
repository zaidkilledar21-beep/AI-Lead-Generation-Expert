import { afterEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";
import { requireWorkflowAuth } from "@/lib/api/auth";

function requestWithHeaders(headers: HeadersInit = {}) {
  return { headers: new Headers(headers) } as NextRequest;
}

describe("requireWorkflowAuth", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns 500 when no workflow API key is configured", async () => {
    vi.stubEnv("N8N_API_KEY", "");
    vi.stubEnv("N8N_WORKFLOW_API_KEY", "");

    const response = requireWorkflowAuth(requestWithHeaders());

    expect(response?.status).toBe(500);
    await expect(response?.json()).resolves.toEqual({ error: "N8N_API_KEY is not configured" });
  });

  it("accepts the x-n8n-api-key header", () => {
    vi.stubEnv("N8N_API_KEY", "secret");

    expect(requireWorkflowAuth(requestWithHeaders({ "x-n8n-api-key": "secret" }))).toBeNull();
  });

  it("accepts a bearer token as a compatibility path", () => {
    vi.stubEnv("N8N_WORKFLOW_API_KEY", "legacy-secret");

    expect(requireWorkflowAuth(requestWithHeaders({ authorization: "Bearer legacy-secret" }))).toBeNull();
  });

  it("rejects missing or incorrect credentials", async () => {
    vi.stubEnv("N8N_API_KEY", "secret");

    const response = requireWorkflowAuth(requestWithHeaders({ "x-n8n-api-key": "wrong" }));

    expect(response?.status).toBe(401);
    await expect(response?.json()).resolves.toEqual({ error: "Unauthorized" });
  });
});
