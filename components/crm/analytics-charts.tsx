"use client";

import { memo, useMemo } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { GlassTooltip } from "@/components/ui/glass-tooltip";
import type { AnalyticsDaily, AnalyticsSequenceStep, CountryData, IntentData, NicheData } from "@/lib/crm/types";

const COLORS = ["#8B5CF6", "#10B981", "#F59E0B", "#EF4444", "#3B82F6", "#EC4899"];

function LegendLabel(value: string) {
  return <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/60">{value}</span>;
}

interface AggregatedDailyData {
  metric_date: string;
  emails_sent: number;
  replies: number;
  positive_replies: number;
}

export const DailyRollupChart = memo(function DailyRollupChart({ data }: Readonly<{ data: AnalyticsDaily[] }>) {
  const aggregatedData = useMemo(() => {
    const rollup = data.reduce<Map<string, AggregatedDailyData>>((acc, curr) => {
      const existing = acc.get(curr.metric_date);
      const next = {
        metric_date: curr.metric_date,
        emails_sent: (existing?.emails_sent ?? 0) + Number(curr.emails_sent || 0),
        replies: (existing?.replies ?? 0) + Number(curr.replies || 0),
        positive_replies: (existing?.positive_replies ?? 0) + Number(curr.positive_replies || 0)
      };
      acc.set(curr.metric_date, next);
      return acc;
    }, new Map<string, AggregatedDailyData>());

    return [...rollup.values()].sort((a, b) => new Date(a.metric_date).getTime() - new Date(b.metric_date).getTime());
  }, [data]);

  if (aggregatedData.length === 0) return <EmptyChart label="No emails were sent in this date range." />;

  return (
    <div className="h-[320px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={aggregatedData} margin={{ top: 14, right: 16, left: -16, bottom: 0 }}>
          <defs>
            <linearGradient id="colorEmails" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="colorReplies" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" vertical={false} />
          <XAxis
            dataKey="metric_date"
            stroke="#A1A1AA"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => {
              const date = new Date(value);
              return `${date.getMonth() + 1}/${date.getDate()}`;
            }}
          />
          <YAxis stroke="#A1A1AA" fontSize={12} tickLine={false} axisLine={false} />
          <Tooltip content={<GlassTooltip />} />
          <Area
            type="monotone"
            dataKey="emails_sent"
            name="Emails Sent"
            stroke="#8B5CF6"
            strokeWidth={3}
            fillOpacity={1}
            fill="url(#colorEmails)"
            animationDuration={1200}
          />
          <Area
            type="monotone"
            dataKey="replies"
            name="Replies"
            stroke="#10B981"
            strokeWidth={3}
            fillOpacity={1}
            fill="url(#colorReplies)"
            animationDuration={1200}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
});

export const SequenceFunnelChart = memo(function SequenceFunnelChart({ data }: Readonly<{ data: AnalyticsSequenceStep[] }>) {
  const chartData = useMemo(
    () =>
      data.map((d) => ({
        name: `Step ${d.step_number}`,
        sent: Number(d.sent || 0),
        replies: Number(d.replies || 0),
        sequence_name: d.sequence_name
      })),
    [data]
  );

  if (chartData.length === 0) return <EmptyChart label="No sequence funnel events are available yet." />;

  return (
    <div className="h-[320px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 14, right: 16, left: -16, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" vertical={false} />
          <XAxis dataKey="name" stroke="#A1A1AA" fontSize={12} tickLine={false} axisLine={false} />
          <YAxis stroke="#A1A1AA" fontSize={12} tickLine={false} axisLine={false} />
          <Tooltip content={<GlassTooltip />} cursor={{ fill: "rgba(255,255,255,0.06)" }} />
          <Bar dataKey="sent" name="Sent" fill="#8B5CF6" radius={[4, 4, 0, 0]} animationDuration={1200} />
          <Bar dataKey="replies" name="Replies" fill="#10B981" radius={[4, 4, 0, 0]} animationDuration={1200} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
});

export const ReplyBreakdownDonut = memo(function ReplyBreakdownDonut({ data }: Readonly<{ data: IntentData[] }>) {
  const coloredData = useMemo(() => data.map((entry, i) => ({ ...entry, fill: COLORS[i % COLORS.length] })), [data]);

  if (coloredData.length === 0) return <EmptyChart label="No replies have been detected yet." />;

  return (
    <div className="h-[320px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={coloredData}
            cx="50%"
            cy="48%"
            innerRadius={62}
            outerRadius={88}
            paddingAngle={5}
            dataKey="value"
            animationDuration={1200}
            stroke="rgba(0,0,0,0.24)"
          />
          <Tooltip content={<GlassTooltip />} />
          <Legend verticalAlign="bottom" height={40} formatter={LegendLabel} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
});

export const NichePerformanceBar = memo(function NichePerformanceBar({ data }: Readonly<{ data: NicheData[] }>) {
  const chartData = useMemo(
    () =>
      data.slice(0, 8).map((d) => ({
        name: d.niche,
        replies: d.replies,
        positive: d.positive
      })),
    [data]
  );

  if (chartData.length === 0) return <EmptyChart label="No active campaigns have lead activity in this range." />;

  return (
    <div className="h-[320px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart layout="vertical" data={chartData} margin={{ top: 14, right: 28, left: 42, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" horizontal={true} vertical={false} />
          <XAxis type="number" stroke="#A1A1AA" fontSize={10} tickLine={false} axisLine={false} />
          <YAxis type="category" dataKey="name" stroke="#A1A1AA" fontSize={10} tickLine={false} axisLine={false} width={80} />
          <Tooltip content={<GlassTooltip />} cursor={{ fill: "rgba(255,255,255,0.06)" }} />
          <Bar dataKey="replies" name="Total Replies" fill="#8B5CF6" radius={[0, 4, 4, 0]} animationDuration={1200} barSize={12} />
          <Bar dataKey="positive" name="Positive" fill="#10B981" radius={[0, 4, 4, 0]} animationDuration={1200} barSize={12} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
});

export const CountryPerformanceBar = memo(function CountryPerformanceBar({ data }: Readonly<{ data: CountryData[] }>) {
  const chartData = useMemo(
    () =>
      data.slice(0, 8).map((item) => ({
        name: item.country,
        leads: item.leads,
        replies: item.replies,
        positive: item.positive
      })),
    [data]
  );

  if (chartData.length === 0) return <EmptyChart label="No active campaigns have lead activity in this range." />;

  return (
    <div className="h-[320px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart layout="vertical" data={chartData} margin={{ top: 14, right: 28, left: 42, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" horizontal={true} vertical={false} />
          <XAxis type="number" stroke="#A1A1AA" fontSize={10} tickLine={false} axisLine={false} />
          <YAxis type="category" dataKey="name" stroke="#A1A1AA" fontSize={10} tickLine={false} axisLine={false} width={80} />
          <Tooltip content={<GlassTooltip />} cursor={{ fill: "rgba(255,255,255,0.06)" }} />
          <Bar dataKey="leads" name="Leads" fill="#3B82F6" radius={[0, 4, 4, 0]} animationDuration={1200} barSize={12} />
          <Bar dataKey="replies" name="Replies" fill="#10B981" radius={[0, 4, 4, 0]} animationDuration={1200} barSize={12} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
});

function EmptyChart({ label }: Readonly<{ label: string }>) {
  return (
    <div className="flex h-[320px] w-full items-center justify-center rounded-lg border border-dashed border-white/12 bg-black/20 px-6 text-center">
      <div>
        <div className="text-xs font-bold uppercase tracking-[0.16em] text-white/30">No chart data</div>
        <p className="mt-2 max-w-sm text-sm leading-6 text-white/50">{label}</p>
      </div>
    </div>
  );
}
