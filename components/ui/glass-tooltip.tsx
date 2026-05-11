"use client";

interface TooltipEntry {
  color?: string;
  name: string;
  value: number | string;
}

export function GlassTooltip({
  active,
  payload,
  label,
}: Readonly<{
  active?: boolean;
  payload?: TooltipEntry[];
  label?: string;
}>) {
  if (active && payload?.length) {
    return (
      <div className="glass-panel p-4 rounded-2xl border border-white/10 bg-zinc-950/80 z-50">
        <p className="font-semibold text-white mb-2">{label}</p>
        <div className="flex flex-col gap-1.5">
          {payload.map((entry) => (
            <div key={entry.name} className="flex items-center gap-2 text-sm">
              <div 
                className="w-2 h-2 rounded-full" 
                style={{ backgroundColor: entry.color || "var(--brand)" }} 
              />
              <span className="text-white/55">{entry.name}:</span>
              <span className="font-mono text-white">{entry.value}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return null;
}
