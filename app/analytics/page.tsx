import type { ReactNode } from "react";
import { AnalyticsDiagnosticsPanel } from "@/components/crm/analytics-diagnostics-panel";
import { AnalyticsFilters } from "@/components/crm/analytics-filters";
import {
  CountryPerformanceBar,
  DailyRollupChart,
  NichePerformanceBar,
  ReplyBreakdownDonut,
  SequenceFunnelChart
} from "@/components/crm/analytics-charts";
import { PageHeader } from "@/components/crm/page-header";
import { LinkButton } from "@/components/ui/button";
import { getAnalyticsData, getAnalyticsDiagnostics, type AnalyticsExportKind } from "@/lib/crm/queries";
import type { AnalyticsCampaign } from "@/lib/crm/types";

type AnalyticsSearchParams = {
  days?: string;
  from?: string;
  to?: string;
};

const EXPORTS: Array<{ kind: AnalyticsExportKind; label: string }> = [
  { kind: "campaign-performance", label: "Campaign CSV" },
  { kind: "daily-rollup", label: "Daily CSV" },
  { kind: "sequence-funnel", label: "Sequence CSV" },
  { kind: "reply-intent-breakdown", label: "Replies CSV" }
];

function analyticsExportHref(kind: AnalyticsExportKind, days: number, from?: string, to?: string) {
  const params = new URLSearchParams({ kind, days: days > 90 ? "all" : String(days) });
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  return `/analytics/export?${params.toString()}`;
}

function formatNumber(value: number) {
  return value.toLocaleString();
}

function formatPercent(value: number) {
  return `${value.toFixed(value >= 10 ? 1 : 2)}%`;
}

function formatChange(value: number) {
  return `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;
}

function changeTone(value: number) {
  if (value > 0) return "text-emerald-300";
  if (value < 0) return "text-rose-300";
  return "text-white/45";
}

function statusTone(status: string) {
  return status === "active"
    ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-200"
    : "border-white/10 bg-white/[0.04] text-white/45";
}

function getTopCampaign(campaigns: AnalyticsCampaign[]) {
  return campaigns.find((campaign) => campaign.replies > 0 || campaign.positive_replies > 0) ?? campaigns[0] ?? null;
}

function resolveAnalyticsRange(params: AnalyticsSearchParams) {
  return {
    days: params.days === "all" ? 3650 : Math.max(7, Math.min(90, Number(params.days ?? "30") || 30)),
    from: params.from,
    to: params.to
  };
}

export default async function AnalyticsPage({
  searchParams
}: Readonly<{
  searchParams?: Promise<AnalyticsSearchParams>;
}>) {
  const params: AnalyticsSearchParams = (await searchParams) ?? {};
  const { days, from, to } = resolveAnalyticsRange(params);

  const [analytics, diagnostics] = await Promise.all([
    getAnalyticsData(days, from, to),
    getAnalyticsDiagnostics(days, from, to)
  ]);

  const { comparison } = analytics;
  const emailVolume = comparison?.emails.current ?? analytics.daily.reduce((sum, row) => sum + row.emails_sent, 0);
  const replyVolume = comparison?.replies.current ?? analytics.daily.reduce((sum, row) => sum + row.replies, 0);
  const positiveVolume = comparison?.positive.current ?? analytics.daily.reduce((sum, row) => sum + row.positive_replies, 0);
  const leadsDiscovered = analytics.weeklySnapshot.reduce((sum, week) => sum + week.leads, 0);
  const replyRate = emailVolume > 0 ? (replyVolume / emailVolume) * 100 : 0;
  const positiveRate = replyVolume > 0 ? (positiveVolume / replyVolume) * 100 : 0;
  const totalSequenceSent = analytics.sequenceFunnel.reduce((sum, step) => sum + step.sent, 0);
  const topCampaign = getTopCampaign(analytics.campaigns);
  const topNiche = [...analytics.performanceByNiche].sort((a, b) => b.positive - a.positive || b.replies - a.replies)[0];
  const hasAnalyticsActivity = emailVolume > 0 || replyVolume > 0 || analytics.campaigns.length > 0;

  const kpis = [
    {
      label: "Emails sent",
      value: formatNumber(emailVolume),
      context: comparison ? `${formatChange(comparison.emails.change)} vs prior` : "Current range",
      tone: comparison ? changeTone(comparison.emails.change) : "text-white/45"
    },
    {
      label: "Replies",
      value: formatNumber(replyVolume),
      context: comparison ? `${formatChange(comparison.replies.change)} vs prior` : "Current range",
      tone: comparison ? changeTone(comparison.replies.change) : "text-white/45"
    },
    {
      label: "Positive intent",
      value: formatNumber(positiveVolume),
      context: comparison ? `${formatChange(comparison.positive.change)} vs prior` : "Current range",
      tone: comparison ? changeTone(comparison.positive.change) : "text-white/45"
    },
    {
      label: "Reply rate",
      value: formatPercent(replyRate),
      context: `${formatPercent(positiveRate)} positive of replies`,
      tone: replyRate > 0 ? "text-sky-200" : "text-white/45"
    }
  ];

  return (
    <>
      <PageHeader
        title="Analytics"
        description="Founder-level intelligence for outreach volume, reply quality, campaign performance, and sequence funnel health."
        actions={
          <div className="flex w-full flex-col items-stretch gap-3 lg:w-auto lg:items-end">
            <AnalyticsFilters from={from} to={to} days={days} />
            <div className="flex flex-wrap justify-start gap-2 lg:justify-end" aria-label="Analytics exports">
              {EXPORTS.map((item) => (
                <LinkButton key={item.kind} href={analyticsExportHref(item.kind, days, from, to)} variant="secondary">
                  {item.label}
                </LinkButton>
              ))}
            </div>
          </div>
        }
      />

      <section className="overflow-hidden rounded-lg border border-white/10 bg-white/[0.025] shadow-[0_18px_50px_rgba(0,0,0,0.22)]">
        <div className="flex flex-col gap-4 border-b border-white/10 bg-white/[0.025] p-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/35">Executive range</div>
            <div className="mt-1 text-sm font-semibold text-white/85">{analytics.dateRange.label}</div>
          </div>
          <div className="flex flex-wrap gap-2 text-xs text-white/50">
            <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1.5">
              Timezone: <span className="text-white/75">{analytics.dateRange.timezoneLabel}</span>
            </span>
            <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1.5">
              Campaigns: <span className="text-white/75">{formatNumber(analytics.campaigns.length)}</span>
            </span>
            <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1.5">
              Sequence rows: <span className="text-white/75">{formatNumber(analytics.sequenceFunnel.length)}</span>
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 divide-y divide-white/10 md:grid-cols-2 md:divide-x md:divide-y-0 xl:grid-cols-4">
          {kpis.map((kpi) => (
            <div key={kpi.label} className="min-h-[132px] p-5">
              <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/40">{kpi.label}</div>
              <div className="mt-4 font-mono text-3xl font-bold leading-none text-white md:text-[2.15rem]">{kpi.value}</div>
              <div className={`mt-3 text-xs font-semibold ${kpi.tone}`}>{kpi.context}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3" aria-label="Founder decision support">
        <InsightCard
          label="Best current campaign"
          value={topCampaign?.name ?? "No campaign signal"}
          detail={
            topCampaign
              ? `${formatPercent(topCampaign.reply_rate)} reply rate, ${formatNumber(topCampaign.positive_replies)} positive replies`
              : "Campaign performance will appear once activity is available."
          }
        />
        <InsightCard
          label="Strongest niche signal"
          value={topNiche?.niche ?? "No niche signal"}
          detail={
            topNiche
              ? `${formatNumber(topNiche.replies)} replies, ${formatNumber(topNiche.positive)} positive`
              : "Niche performance needs campaign activity in the selected range."
          }
        />
        <InsightCard
          label="Coverage snapshot"
          value={`${formatNumber(leadsDiscovered)} leads`}
          detail={`${formatNumber(totalSequenceSent)} sequence sends represented across ${formatNumber(analytics.weeklySnapshot.length)} weekly buckets`}
        />
      </section>

      {!hasAnalyticsActivity ? (
        <section className="crm-state-card mt-6 border-dashed border-white/15 bg-white/[0.018] p-6">
          <div className="text-xs font-bold uppercase tracking-[0.18em] text-white/35">Sparse analytics</div>
          <h2 className="mt-3 text-lg font-semibold text-white">No measurable outreach activity in this range yet.</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-white/55">
            Once campaigns send email or replies arrive, this dashboard will populate the KPI strip, charts, and performance tables.
          </p>
        </section>
      ) : null}

      <AnalyticsDiagnosticsPanel diagnostics={diagnostics} />

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[1.08fr_0.92fr]">
        <ChartPanel title="Outreach volume" description="Daily email and reply trend across the selected range.">
          <DailyRollupChart data={analytics.daily} />
        </ChartPanel>
        <ChartPanel title="Reply intent breakdown" description="Detected intent mix from replies received in this range.">
          <ReplyBreakdownDonut data={analytics.replyIntentBreakdown} />
        </ChartPanel>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
        <ChartPanel title="Performance by niche" description="Reply and positive-intent distribution by campaign niche.">
          <NichePerformanceBar data={analytics.performanceByNiche} />
        </ChartPanel>
        <ChartPanel title="Performance by country" description="Lead coverage and reply signal by geography.">
          <CountryPerformanceBar data={analytics.performanceByCountry} />
        </ChartPanel>
      </div>

      <section className="panel glass-panel mt-6">
        <div className="panel-header items-start">
          <div>
            <h2>Campaign performance</h2>
            <p>Ranked by reply rate for quick scan of which campaigns deserve founder attention.</p>
          </div>
          <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs font-semibold text-white/55">
            {formatNumber(analytics.campaigns.length)} campaigns
          </span>
        </div>
        <div className="table-wrap">
          <table className="data-table min-w-[1060px]">
            <thead>
              <tr>
                <th>Campaign</th>
                <th>Status</th>
                <th>Lead coverage</th>
                <th>Reply signal</th>
                <th>Reply rate</th>
              </tr>
            </thead>
            <tbody>
              {analytics.campaigns.map((campaign) => (
                <tr key={campaign.campaign_id}>
                  <td>
                    <div className="max-w-[320px] font-semibold text-white/90">{campaign.name}</div>
                    <div className="mt-1 text-[11px] font-medium uppercase tracking-[0.12em] text-white/35">
                      {campaign.primary_niche ?? "Unclassified niche"}
                    </div>
                  </td>
                  <td>
                    <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] ${statusTone(campaign.status)}`}>
                      {campaign.status}
                    </span>
                  </td>
                  <td>
                    <div className="font-mono text-sm text-white/85">{formatNumber(campaign.total_leads ?? 0)} leads</div>
                    <div className="mt-1 text-xs text-white/40">{formatNumber(campaign.scored_leads ?? 0)} scored</div>
                  </td>
                  <td>
                    <div className="font-mono text-sm text-white/85">{formatNumber(campaign.replies ?? 0)} replies</div>
                    <div className="mt-1 text-xs text-emerald-300/80">{formatNumber(campaign.positive_replies ?? 0)} positive</div>
                  </td>
                  <td className="font-mono text-base font-bold text-emerald-300">{formatPercent(campaign.reply_rate ?? 0)}</td>
                </tr>
              ))}
              {analytics.campaigns.length === 0 ? (
                <tr>
                  <td colSpan={5} className="muted text-center">
                    No campaigns have lead activity in this range.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <section className="panel glass-panel">
          <div className="panel-header items-start">
            <div>
              <h2>Weekly snapshot</h2>
              <p>Compact period view for leads, sends, replies, and positive intent.</p>
            </div>
          </div>
          <div className="table-wrap">
            <table className="data-table min-w-[720px]">
              <thead>
                <tr>
                  <th>Week</th>
                  <th>Leads</th>
                  <th>Emails</th>
                  <th>Replies</th>
                  <th>Positive</th>
                </tr>
              </thead>
              <tbody>
                {analytics.weeklySnapshot.map((week) => (
                  <tr key={week.week}>
                    <td className="mono">{week.week}</td>
                    <td className="mono">{formatNumber(week.leads)}</td>
                    <td className="mono text-sky-200">{formatNumber(week.emails)}</td>
                    <td className="mono">{formatNumber(week.replies)}</td>
                    <td className="mono text-emerald-300">{formatNumber(week.positive)}</td>
                  </tr>
                ))}
                {analytics.weeklySnapshot.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="muted text-center">
                      No weekly activity is available for this date range.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>

        <ChartPanel title="Sequence funnel" description="Step-level sequence sends and replies.">
          <SequenceFunnelChart data={analytics.sequenceFunnel} />
        </ChartPanel>
      </div>

      <section className="panel glass-panel mt-6">
        <div className="panel-header items-start">
          <div>
            <h2>Daily rollup ledger</h2>
            <p>Raw daily rows preserved for auditability and export reconciliation.</p>
          </div>
        </div>
        <div className="table-wrap max-h-[420px] overflow-y-auto">
          <table className="data-table min-w-[920px]">
            <thead>
              <tr>
                <th>Date</th>
                <th>Campaign</th>
                <th>Leads</th>
                <th>Emails</th>
                <th>Replies</th>
                <th>Positive</th>
              </tr>
            </thead>
            <tbody>
              {analytics.daily.map((row, index) => (
                <tr key={`${row.metric_date}-${row.campaign_id ?? "all"}-${index}`}>
                  <td className="mono">{row.metric_date}</td>
                  <td className="text-xs text-white/75">{row.campaign_name ?? "All campaigns"}</td>
                  <td className="mono text-xs">{formatNumber(row.leads_discovered ?? 0)}</td>
                  <td className="mono text-xs font-bold text-sky-200">{formatNumber(row.emails_sent ?? 0)}</td>
                  <td className="mono text-xs">{formatNumber(row.replies ?? 0)}</td>
                  <td className="mono text-xs text-emerald-300">{formatNumber(row.positive_replies ?? 0)}</td>
                </tr>
              ))}
              {analytics.daily.length === 0 ? (
                <tr>
                  <td colSpan={6} className="muted text-center">
                    No daily analytics rows are available for this date range.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

function InsightCard({
  label,
  value,
  detail
}: Readonly<{
  label: string;
  value: string;
  detail: string;
}>) {
  return (
    <article className="crm-state-card min-h-[132px] border-white/10 bg-white/[0.024] p-5">
      <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/35">{label}</div>
      <div className="mt-3 text-base font-semibold leading-6 text-white/90">{value}</div>
      <p className="mt-2 text-sm leading-6 text-white/50">{detail}</p>
    </article>
  );
}

function ChartPanel({
  title,
  description,
  children
}: Readonly<{
  title: string;
  description: string;
  children: ReactNode;
}>) {
  return (
    <section className="panel glass-panel">
      <div className="panel-header items-start">
        <div>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}
