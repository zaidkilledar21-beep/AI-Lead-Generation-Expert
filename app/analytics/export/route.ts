import { NextResponse } from "next/server";
import { requireDashboardActor } from "@/lib/app/auth";
import { serializeCsv, type CsvColumn } from "@/lib/crm/csv";
import { getAnalyticsExport, type AnalyticsExportKind } from "@/lib/crm/queries";

const EXPORT_KINDS: AnalyticsExportKind[] = [
  "campaign-performance",
  "daily-rollup",
  "sequence-funnel",
  "reply-intent-breakdown"
];

function parseDays(value: string | null) {
  if (value === "all") return 3650;
  return Math.max(7, Math.min(90, Number(value ?? "30") || 30));
}

function parseKind(value: string | null): AnalyticsExportKind {
  return EXPORT_KINDS.includes(value as AnalyticsExportKind) ? value as AnalyticsExportKind : "campaign-performance";
}

export async function GET(request: Request) {
  await requireDashboardActor();

  const url = new URL(request.url);
  const kind = parseKind(url.searchParams.get("kind"));
  const days = parseDays(url.searchParams.get("days"));
  const from = url.searchParams.get("from") ?? undefined;
  const to = url.searchParams.get("to") ?? undefined;
  const exportData = await getAnalyticsExport(kind, days, from, to);
  const body = serializeCsv(
    exportData.columns as unknown as CsvColumn<unknown>[],
    exportData.rows as unknown[],
    exportData.metadata
  );

  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${exportData.filename}"`,
      "Cache-Control": "no-store"
    }
  });
}
