import { NextResponse, type NextRequest } from "next/server";
import { requireWorkflowAuth } from "@/lib/api/auth";
import { processRecoveredDiscoveryLeads } from "@/lib/workflows/recovered-discovery";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(request: NextRequest) {
  const unauthorized = requireWorkflowAuth(request);
  if (unauthorized) return unauthorized;

  try {
    const body = (await request.json().catch(() => ({}))) as {
      discovery_run_id?: string;
      limit?: number;
      dry_run?: boolean;
    };
    const result = await processRecoveredDiscoveryLeads(body);

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Recovered discovery processing failed" },
      { status: 500 }
    );
  }
}
