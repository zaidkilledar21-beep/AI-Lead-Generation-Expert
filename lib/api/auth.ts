import { NextResponse, type NextRequest } from "next/server";

const textEncoder = new TextEncoder();

export function constantTimeEqual(left: string, right: string) {
  const leftBytes = textEncoder.encode(left);
  const rightBytes = textEncoder.encode(right);
  const maxLength = Math.max(leftBytes.length, rightBytes.length);
  let diff = leftBytes.length ^ rightBytes.length;

  for (let index = 0; index < maxLength; index += 1) {
    diff |= (leftBytes[index] ?? 0) ^ (rightBytes[index] ?? 0);
  }

  return diff === 0;
}

export function requireWorkflowAuth(request: NextRequest) {
  const expected = process.env.N8N_API_KEY ?? process.env.N8N_WORKFLOW_API_KEY;

  if (!expected) {
    return NextResponse.json({ error: "N8N_API_KEY is not configured" }, { status: 500 });
  }

  const provided = request.headers.get("x-n8n-api-key") ?? request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");

  if (!provided || !constantTimeEqual(provided, expected)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return null;
}
