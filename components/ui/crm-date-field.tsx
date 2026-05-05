"use client";

import { CalendarDays } from "lucide-react";
import { useEffect, useId, useState, type ChangeEvent } from "react";

function formatDisplayValue(type: "date" | "datetime-local", value: string) {
  if (!value) return "";
  const date = new Date(type === "date" ? `${value}T00:00:00` : value);
  if (Number.isNaN(date.getTime())) return value;

  if (type === "datetime-local") {
    return date.toLocaleString([], {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  }

  return date.toLocaleDateString([], {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}

export function CrmDateField({
  name,
  type = "date",
  defaultValue = "",
  placeholder,
  disabled = false,
  className = "",
  onChange
}: Readonly<{
  name: string;
  type?: "date" | "datetime-local";
  defaultValue?: string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  onChange?: (event: ChangeEvent<HTMLInputElement>) => void;
}>) {
  const inputId = useId();
  const [value, setValue] = useState(defaultValue);

  useEffect(() => {
    setValue(defaultValue);
  }, [defaultValue]);

  const displayValue = formatDisplayValue(type, value);

  return (
    <label
      htmlFor={inputId}
      className={`field relative flex min-h-[44px] cursor-pointer items-center justify-between gap-3 overflow-hidden ${
        disabled ? "cursor-not-allowed opacity-50" : "hover:border-brand/40"
      } ${className}`.trim()}
    >
      <span className={displayValue ? "text-white" : "text-white/35"}>
        {displayValue || placeholder || (type === "datetime-local" ? "Select date and time" : "Select date")}
      </span>
      <CalendarDays className="h-4 w-4 shrink-0 text-white/35" />
      <input
        id={inputId}
        name={name}
        type={type}
        value={value}
        disabled={disabled}
        onChange={(event) => {
          setValue(event.target.value);
          onChange?.(event);
        }}
        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
      />
    </label>
  );
}
