import { NextResponse, type NextRequest } from "next/server";
import { requireWorkflowAuth } from "@/lib/api/auth";
import { runLeadDiscovery } from "@/lib/workflows/lead-discovery";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(request: NextRequest) {
  const unauthorized = requireWorkflowAuth(request);
  if (unauthorized) return unauthorized;

  try {
    const body = (await request.json().catch(() => ({}))) as {
      campaign_id?: string;
      dry_run?: boolean;
      trigger_type?: "manual" | "schedule" | "webhook";
    };
    const result = await runLeadDiscovery({
      campaign_id: body.campaign_id,
      dry_run: body.dry_run,
      trigger_type: body.trigger_type
    });

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Discovery run failed" },
      { status: 500 }
    );
  }
}
