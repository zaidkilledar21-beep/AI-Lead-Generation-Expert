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
      <div className="glass-panel p-4 rounded-xl border border-white/10 shadow-2xl backdrop-blur-md bg-zinc-900/60 z-50">
        <p className="font-semibold text-zinc-100 mb-2">{label}</p>
        <div className="flex flex-col gap-1.5">
          {payload.map((entry) => (
            <div key={entry.name} className="flex items-center gap-2 text-sm">
              <div 
                className="w-2 h-2 rounded-full" 
                style={{ backgroundColor: entry.color || "var(--brand)" }} 
              />
              <span className="text-zinc-400">{entry.name}:</span>
              <span className="font-mono text-zinc-100">{entry.value}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return null;
}
