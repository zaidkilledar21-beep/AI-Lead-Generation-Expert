import { NextResponse, type NextRequest } from "next/server";
import { requireWorkflowAuth } from "@/lib/api/auth";
import { importDiscoveredLeads } from "@/lib/workflows/discovery";
import { discoveryLimits } from "@/lib/contracts";
import type { GooglePlacesLeadInput } from "@/lib/contracts";

type LeadIntakePayload = {
  campaign_id?: string;
  discovery_run_id?: string;
  niche: string;
  location: string;
  max_results?: number;
  leads: GooglePlacesLeadInput[];
};

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const unauthorized = requireWorkflowAuth(request);
  if (unauthorized) return unauthorized;

  try {
    const body = (await request.json()) as LeadIntakePayload;
    const leads = (body.leads ?? []).map((lead) => ({
      ...lead,
      campaign_id: lead.campaign_id ?? body.campaign_id ?? null,
      discovery_run_id: lead.discovery_run_id ?? body.discovery_run_id ?? null,
      source: lead.source ?? "google_places"
    }));

    const result = await importDiscoveredLeads(
      {
        niche: body.niche,
        location: body.location,
        max_results: Math.min(body.max_results ?? leads.length, leads.length, discoveryLimits.maxFinalLeadsPerDay)
      },
      leads
    );

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Lead intake failed" },
      { status: 500 }
    );
  }
}
