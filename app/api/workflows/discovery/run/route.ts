import { NextResponse, type NextRequest } from "next/server";
import { requireWorkflowAuth } from "@/lib/api/auth";
import { claimDueDiscoveryCampaigns, runLeadDiscovery } from "@/lib/workflows/lead-discovery";

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
      max_campaigns?: number;
      batch_dispatch?: boolean;
    };
    if (!body.campaign_id && body.trigger_type === "schedule") {
      const campaigns = await claimDueDiscoveryCampaigns(body.batch_dispatch ? body.max_campaigns : 1);
      if (body.batch_dispatch) {
        return NextResponse.json({
          status: "scheduled_batch",
          claimed: campaigns.length,
          campaigns
        });
      }
      const campaign = campaigns[0];
      if (!campaign) return NextResponse.json({ status: "paused", reason: "no_due_campaigns" });
      const result = await runLeadDiscovery({
        campaign_id: campaign.campaign_id,
        dry_run: body.dry_run,
        trigger_type: "schedule"
      });
      return NextResponse.json(result);
    }
    if (!body.campaign_id) {
      return NextResponse.json({ error: "campaign_id is required for non-scheduled discovery runs" }, { status: 400 });
    }
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
