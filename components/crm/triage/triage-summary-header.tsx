type TriageStatTone = "default" | "warning" | "danger" | "success";

type TriageStat = {
  label: string;
  value: number | string;
  note: string;
  tone: TriageStatTone;
};

type TriageSummaryHeaderProps = {
  eyebrow: string;
  title: string;
  description: string;
  stats: readonly TriageStat[];
  className?: string;
};

export function TriageSummaryHeader({
  eyebrow,
  title,
  description,
  stats,
  className
}: Readonly<TriageSummaryHeaderProps>) {
  return (
    <div className={className}>
      <div className="border-b border-white/8 bg-white/[0.03] p-6 lg:p-7">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-white/40">{eyebrow}</p>
            <h2 className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-white sm:text-[2rem]">{title}</h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/58">{description}</p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:min-w-[620px]">
            {stats.map((stat) => (
              <div key={stat.label} className="rounded-2xl border border-white/8 bg-black/20 px-4 py-3 shadow-[0_12px_30px_rgba(0,0,0,0.18)]">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/40">{stat.label}</span>
                  <span
                    className={`h-2.5 w-2.5 rounded-full ${
                      stat.tone === "warning"
                        ? "bg-amber-400"
                        : stat.tone === "danger"
                          ? "bg-rose-400"
                          : stat.tone === "success"
                            ? "bg-emerald-400"
                            : "bg-brand-light"
                    }`}
                  />
                </div>
                <div className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-white">{stat.value}</div>
                <div className="mt-1 text-xs text-white/45">{stat.note}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
