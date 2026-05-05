"use client";

import { useRouter } from "next/navigation";
import { CrmDateField } from "@/components/ui/crm-date-field";
import { CrmSelect } from "@/components/ui/crm-select";

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
    <form className="flex flex-wrap items-end gap-4" onSubmit={handleSubmit}>
      <div className="flex flex-wrap items-end gap-3">
        <span className="field-label mb-3">Custom Range</span>
        <CrmDateField
          name="from"
          defaultValue={from}
          placeholder="Start date"
          className="w-48"
          onChange={handleAutoSubmit}
        />
        <span className="text-white/20">to</span>
        <CrmDateField
          name="to"
          defaultValue={to}
          placeholder="End date"
          className="w-48"
          onChange={handleAutoSubmit}
        />
      </div>
      <div className="hidden h-10 w-px bg-white/10 md:block" />
      <div className="flex flex-wrap items-end gap-3">
        <span className="field-label mb-3">Presets</span>
        <CrmSelect
          name="days" 
          defaultValue={days > 90 ? "all" : String(days)}
          className="w-40"
          options={[
            ...[7, 14, 30, 60, 90].map((value) => ({ value: String(value), label: `${value} days` })),
            { value: "all", label: "All time" }
          ]}
          onValueChange={(value) => {
            const params = new URLSearchParams();
            params.set("days", value);
            router.push(`/analytics?${params.toString()}`);
          }}
        />
      </div>
    </form>
  );
}
