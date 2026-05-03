"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { GlassTooltip } from "@/components/ui/glass-tooltip";

interface DailyData {
  metric_date: string;
  campaign_name?: string;
  leads_discovered: number;
  leads_scored: number;
  emails_sent: number;
  replies: number;
  positive_replies: number;
}

interface SequenceData {
  sequence_name: string;
  step_number: number;
  sent: number;
  replies: number;
  positive_replies: number;
  reply_rate: number;
}

export function DailyRollupChart({ data }: Readonly<{ data: any[] }>) {
  // Aggregate data by date
  const aggregatedData = data.reduce((acc: any[], curr) => {
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
  }, []).reverse(); // Assuming descending from query, we want chronological for chart

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
}

export function SequenceFunnelChart({ data }: Readonly<{ data: any[] }>) {
  // Map step_number to step name for display
  const chartData = data.map(d => ({
    name: `Step ${d.step_number}`,
    sent: Number(d.sent || 0),
    replies: Number(d.replies || 0),
    sequence_name: d.sequence_name,
  }));

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
}
