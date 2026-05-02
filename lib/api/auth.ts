import { NextResponse, type NextRequest } from "next/server";

export function requireWorkflowAuth(request: NextRequest) {
  const expected = process.env.N8N_API_KEY ?? process.env.N8N_WORKFLOW_API_KEY;

  if (!expected) {
    return NextResponse.json({ error: "N8N_API_KEY is not configured" }, { status: 500 });
  }

  const provided = request.headers.get("x-n8n-api-key") ?? request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");

  if (provided !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return null;
}
