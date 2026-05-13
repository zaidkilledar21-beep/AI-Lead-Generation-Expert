"use client";

import type { ChangeEvent, FormEvent } from "react";
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

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
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

  const handleAutoSubmit = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const form = e.target.form;
    if (form) {
      // Preset changes should not keep stale custom date inputs.
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
    <form
      className="flex w-full flex-col gap-3 rounded-lg border border-white/10 bg-black/20 p-3 md:w-auto md:flex-row md:items-end"
      onSubmit={handleSubmit}
    >
      <div className="grid gap-2">
        <span className="field-label">Custom range</span>
        <div className="flex flex-wrap items-center gap-2">
          <CrmDateField
            name="from"
            defaultValue={from}
            placeholder="Start date"
            className="w-full sm:w-40"
            onChange={handleAutoSubmit}
          />
          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-white/25">to</span>
          <CrmDateField
            name="to"
            defaultValue={to}
            placeholder="End date"
            className="w-full sm:w-40"
            onChange={handleAutoSubmit}
          />
        </div>
      </div>
      <div className="hidden h-14 w-px bg-white/10 md:block" />
      <div className="grid gap-2">
        <span className="field-label">Preset</span>
        <CrmSelect
          name="days"
          defaultValue={days > 90 ? "all" : String(days)}
          className="w-full sm:w-40"
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
