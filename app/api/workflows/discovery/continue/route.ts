import { NextResponse, type NextRequest } from "next/server";
import { requireWorkflowAuth } from "@/lib/api/auth";
import { continueDiscoveryProcessing } from "@/lib/workflows/recovered-discovery";

export const runtime = "nodejs";
export const maxDuration = 300;

// Bounded, resumable WF-02/WF-03 worker. Safe to call repeatedly by Vercel Cron or a lightweight
// n8n scheduler. Finds `running` discovery runs, processes a small bounded batch per run under a
// runtime guard, and finalizes any run whose enrichment/scoring work is complete. Backend stops
// after WF-03/finalization; it does not trigger WF-04.
export async function POST(request: NextRequest) {
  const unauthorized = requireWorkflowAuth(request);
  if (unauthorized) return unauthorized;

  try {
    const body = (await request.json().catch(() => ({}))) as {
      limit?: number;
      max_runs?: number;
      max_runtime_ms?: number;
      dry_run?: boolean;
      include_review_pending?: boolean;
    };
    const result = await continueDiscoveryProcessing(body);

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Discovery continue worker failed" },
      { status: 500 }
    );
  }
}
