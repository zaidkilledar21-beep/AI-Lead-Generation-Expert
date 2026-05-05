"use client";

import React, { memo, useMemo } from "react";
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
  YAxis,
} from "recharts";
import { GlassTooltip } from "@/components/ui/glass-tooltip";
import type { CountryData, IntentData, NicheData, AnalyticsDaily, AnalyticsSequenceStep } from "@/lib/crm/types";

const COLORS = ["#8251EE", "#10B981", "#F59E0B", "#EF4444", "#3B82F6", "#EC4899"];

/** Stable Legend label renderer — defined outside components to avoid ESLint inline-component warning */
function LegendLabel(value: string) {
  return <span className="text-[10px] uppercase tracking-widest text-white/60">{value}</span>;
}

interface AggregatedDailyData {
  metric_date: string;
  emails_sent: number;
  replies: number;
  positive_replies: number;
}

export const DailyRollupChart = memo(function DailyRollupChart({ data }: Readonly<{ data: AnalyticsDaily[] }>) {
  const aggregatedData = useMemo(() => {
    const rollup = data.reduce<AggregatedDailyData[]>((acc, curr) => {
      const existing = acc.find(item => item.metric_date === curr.metric_date);
      if (existing) {
        existing.emails_sent += Number(curr.emails_sent || 0);
        existing.replies += Number(curr.replies || 0);
        existing.positive_replies += Number(curr.positive_replies || 0);
      } else {
        acc.push({
          metric_date: curr.metric_date,
          emails_sent: Number(curr.emails_sent || 0),
          replies: Number(curr.replies || 0),
          positive_replies: Number(curr.positive_replies || 0),
        });
      }
      return acc;
    }, []);
    
    // Sort chronologically and return
    return [...rollup].sort((a, b) => new Date(a.metric_date).getTime() - new Date(b.metric_date).getTime());
  }, [data]);

  if (aggregatedData.length === 0) return <EmptyChart label="No daily rollup data for this range." />;

  return (
    <div className="h-[300px] w-full mt-4">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={aggregatedData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="colorEmails" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#8251EE" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#8251EE" stopOpacity={0}/>
            </linearGradient>
            <linearGradient id="colorReplies" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#27272A" vertical={false} />
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
            stroke="#8251EE" 
            strokeWidth={3}
            fillOpacity={1} 
            fill="url(#colorEmails)" 
            animationDuration={1500}
          />
          <Area 
            type="monotone" 
            dataKey="replies" 
            name="Replies"
            stroke="#10B981" 
            strokeWidth={3}
            fillOpacity={1} 
            fill="url(#colorReplies)" 
            animationDuration={1500}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
});

export const SequenceFunnelChart = memo(function SequenceFunnelChart({ data }: Readonly<{ data: AnalyticsSequenceStep[] }>) {
  const chartData = useMemo(() => data.map(d => ({
    name: `Step ${d.step_number}`,
    sent: Number(d.sent || 0),
    replies: Number(d.replies || 0),
    sequence_name: d.sequence_name,
  })), [data]);

  if (chartData.length === 0) return <EmptyChart label="No sequence funnel data yet." />;

  return (
    <div className="h-[300px] w-full mt-4">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#27272A" vertical={false} />
          <XAxis dataKey="name" stroke="#A1A1AA" fontSize={12} tickLine={false} axisLine={false} />
          <YAxis stroke="#A1A1AA" fontSize={12} tickLine={false} axisLine={false} />
          <Tooltip content={<GlassTooltip />} cursor={{ fill: '#27272A', opacity: 0.4 }} />
          <Bar dataKey="sent" name="Sent" fill="#8251EE" radius={[4, 4, 0, 0]} animationDuration={1500} />
          <Bar dataKey="replies" name="Replies" fill="#10B981" radius={[4, 4, 0, 0]} animationDuration={1500} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
});

export const ReplyBreakdownDonut = memo(function ReplyBreakdownDonut({ data }: Readonly<{ data: IntentData[] }>) {
  // Map data to include fill colour so we don't need the deprecated Cell component
  const coloredData = useMemo(
    () => data.map((entry, i) => ({ ...entry, fill: COLORS[i % COLORS.length] })),
    [data]
  );

  if (coloredData.length === 0) return <EmptyChart label="No replies in this range." />;

  return (
    <div className="h-[300px] w-full mt-4">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={coloredData}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={80}
            paddingAngle={5}
            dataKey="value"
            animationDuration={1500}
            stroke="rgba(0,0,0,0.2)"
          />
          <Tooltip content={<GlassTooltip />} />
          <Legend
            verticalAlign="bottom"
            height={36}
            formatter={LegendLabel}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
});

export const NichePerformanceBar = memo(function NichePerformanceBar({ data }: Readonly<{ data: NicheData[] }>) {
  const chartData = useMemo(() => data.slice(0, 8).map(d => ({
    name: d.niche,
    replies: d.replies,
    positive: d.positive,
  })), [data]);

  if (chartData.length === 0) return <EmptyChart label="No niche performance data yet." />;

  return (
    <div className="h-[300px] w-full mt-4">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart layout="vertical" data={chartData} margin={{ top: 10, right: 30, left: 40, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#27272A" horizontal={true} vertical={false} />
          <XAxis type="number" stroke="#A1A1AA" fontSize={10} tickLine={false} axisLine={false} />
          <YAxis 
            type="category" 
            dataKey="name" 
            stroke="#A1A1AA" 
            fontSize={10} 
            tickLine={false} 
            axisLine={false}
            width={80}
          />
          <Tooltip content={<GlassTooltip />} cursor={{ fill: '#27272A', opacity: 0.4 }} />
          <Bar dataKey="replies" name="Total Replies" fill="#8251EE" radius={[0, 4, 4, 0]} animationDuration={1500} barSize={12} />
          <Bar dataKey="positive" name="Positive" fill="#10B981" radius={[0, 4, 4, 0]} animationDuration={1500} barSize={12} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
});

function EmptyChart({ label }: Readonly<{ label: string }>) {
  return (
    <div className="h-[300px] w-full mt-4 rounded-xl border border-dashed border-white/10 flex items-center justify-center text-sm text-white/35">
      {label}
    </div>
  );
}

export const CountryPerformanceBar = memo(function CountryPerformanceBar({ data }: Readonly<{ data: CountryData[] }>) {
  const chartData = useMemo(() => data.slice(0, 8).map((item) => ({
    name: item.country,
    leads: item.leads,
    replies: item.replies,
    positive: item.positive
  })), [data]);

  if (chartData.length === 0) return <EmptyChart label="No country performance data yet." />;

  return (
    <div className="h-[300px] w-full mt-4">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart layout="vertical" data={chartData} margin={{ top: 10, right: 30, left: 40, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#27272A" horizontal={true} vertical={false} />
          <XAxis type="number" stroke="#A1A1AA" fontSize={10} tickLine={false} axisLine={false} />
          <YAxis type="category" dataKey="name" stroke="#A1A1AA" fontSize={10} tickLine={false} axisLine={false} width={80} />
          <Tooltip content={<GlassTooltip />} cursor={{ fill: '#27272A', opacity: 0.4 }} />
          <Bar dataKey="leads" name="Leads" fill="#3B82F6" radius={[0, 4, 4, 0]} animationDuration={1500} barSize={12} />
          <Bar dataKey="replies" name="Replies" fill="#10B981" radius={[0, 4, 4, 0]} animationDuration={1500} barSize={12} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
});

