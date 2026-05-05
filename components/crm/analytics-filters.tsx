"use client";

import { useRouter } from "next/navigation";

export function AnalyticsFilters({
  from,
  to,
  days
}: Readonly<{
  from?: string;
  to?: string;
  days: number;
}>) {
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const params = new URLSearchParams();
    
    const f = formData.get("from");
    const t = formData.get("to");
    const d = formData.get("days");

    if (typeof f === "string" && f) params.set("from", f);
    if (typeof t === "string" && t) params.set("to", t);
    if (typeof d === "string" && d) params.set("days", d);

    router.push(`/analytics?${params.toString()}`);
  };

  const handleAutoSubmit = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const form = e.target.form;
    if (form) {
      // If it's the 'days' preset, clear custom dates
      if (e.target.name === "days") {
        const fromInput = form.querySelector('input[name="from"]') as HTMLInputElement;
        const toInput = form.querySelector('input[name="to"]') as HTMLInputElement;
        if (fromInput) fromInput.value = "";
        if (toInput) toInput.value = "";
      }
      form.requestSubmit();
    }
  };

  return (
    <form className="flex items-center gap-4" onSubmit={handleSubmit}>
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Custom Range</span>
        <input 
          type="date" 
          name="from" 
          defaultValue={from} 
          className="field text-xs py-1 px-2 h-8 w-32"
          onChange={handleAutoSubmit}
        />
        <span className="text-white/20">to</span>
        <input 
          type="date" 
          name="to" 
          defaultValue={to} 
          className="field text-xs py-1 px-2 h-8 w-32"
          onChange={handleAutoSubmit}
        />
      </div>
      <div className="w-[1px] h-4 bg-white/10" />
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Presets</span>
        <select 
          className="field text-xs py-1 px-2 h-8" 
          name="days" 
          defaultValue={days > 90 ? "all" : String(days)}
          onChange={handleAutoSubmit}
        >
          {[7, 14, 30, 60, 90].map((value) => <option key={value} value={value}>{value} days</option>)}
          <option value="all">All time</option>
        </select>
      </div>
    </form>
  );
}
