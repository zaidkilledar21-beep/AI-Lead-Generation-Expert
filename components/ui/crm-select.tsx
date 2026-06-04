"use client";

import { Check, ChevronDown } from "lucide-react";
import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";

export type CrmSelectOption = {
  value: string;
  label: string;
  description?: string;
  disabled?: boolean;
};

export function CrmSelect({
  name,
  defaultValue = "",
  placeholder = "Select an option",
  disabled = false,
  emptyState = "No options available.",
  options,
  onValueChange,
  fallbackLabel,
  className = ""
}: Readonly<{
  name: string;
  defaultValue?: string;
  placeholder?: string;
  disabled?: boolean;
  emptyState?: string;
  options: CrmSelectOption[];
  onValueChange?: (value: string) => void;
  fallbackLabel?: string;
  className?: string;
}>) {
  const listboxId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedValue, setSelectedValue] = useState(defaultValue);
  const enabledOptions = options.filter((option) => !option.disabled);
  const [activeIndex, setActiveIndex] = useState(() => {
    const matchedIndex = enabledOptions.findIndex((option) => option.value === defaultValue);
    return matchedIndex >= 0 ? matchedIndex : 0;
  });

  const selectedOption = options.find((option) => option.value === selectedValue);
  const buttonLabel = selectedOption?.label ?? fallbackLabel ?? (selectedValue ? selectedValue : placeholder);

  useEffect(() => {
    setSelectedValue(defaultValue);
  }, [defaultValue]);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    window.addEventListener("mousedown", handlePointerDown);
    return () => window.removeEventListener("mousedown", handlePointerDown);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const matchedIndex = enabledOptions.findIndex((option) => option.value === selectedValue);
    setActiveIndex(matchedIndex >= 0 ? matchedIndex : 0);
  }, [enabledOptions, isOpen, selectedValue]);

  const commitValue = (value: string) => {
    setSelectedValue(value);
    onValueChange?.(value);
    setIsOpen(false);
  };

  const onTriggerKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (disabled) return;
    if (event.key === "ArrowDown" || event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      setIsOpen(true);
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setIsOpen(true);
      setActiveIndex(Math.max(enabledOptions.length - 1, 0));
    }
  };

  const onListboxKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!enabledOptions.length) {
      if (event.key === "Escape") setIsOpen(false);
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((current) => Math.min(current + 1, enabledOptions.length - 1));
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((current) => Math.max(current - 1, 0));
      return;
    }

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      const option = enabledOptions[activeIndex];
      if (option) commitValue(option.value);
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      setIsOpen(false);
    }
  };

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <input name={name} type="hidden" value={selectedValue} />
      <button
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={listboxId}
        onClick={() => setIsOpen((current) => !current)}
        onKeyDown={onTriggerKeyDown}
        className={`field flex min-h-[44px] items-center justify-between gap-3 text-left ${
          disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer hover:border-brand/40"
        }`}
      >
        <span className={selectedOption || fallbackLabel || selectedValue ? "text-white" : "text-white/35"}>
          {buttonLabel}
        </span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-white/35 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen ? (
        <div
          id={listboxId}
          role="listbox"
          tabIndex={-1}
          onKeyDown={onListboxKeyDown}
          className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-50 overflow-hidden rounded-xl border border-white/10 bg-neutral-bg2/95 shadow-[0_18px_48px_rgba(0,0,0,0.45)] backdrop-blur-xl"
        >
          {options.length === 0 ? (
            <div className="px-4 py-3 text-sm text-white/45">{emptyState}</div>
          ) : (
            <div className="max-h-72 overflow-y-auto p-2">
              {options.map((option) => {
                const optionIndex = enabledOptions.findIndex((item) => item.value === option.value);
                const isActive = optionIndex >= 0 && optionIndex === activeIndex;
                const isSelected = option.value === selectedValue;

                return (
                  <button
                    key={option.value}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    disabled={option.disabled}
                    onClick={() => {
                      if (!option.disabled) commitValue(option.value);
                    }}
                    onMouseEnter={() => {
                      if (optionIndex >= 0) setActiveIndex(optionIndex);
                    }}
                    className={`flex w-full items-start justify-between gap-3 rounded-lg px-3 py-2.5 text-left transition-colors ${
                      option.disabled
                        ? "cursor-not-allowed opacity-40"
                        : isActive
                          ? "bg-white/10"
                          : "hover:bg-white/5"
                    }`}
                  >
                    <span className="min-w-0">
                      <span className="block text-sm text-white">{option.label}</span>
                      {option.description ? (
                        <span className="mt-0.5 block text-xs text-white/45">{option.description}</span>
                      ) : null}
                    </span>
                    <span className="pt-0.5">
                      {isSelected ? <Check className="h-4 w-4 text-brand-light" /> : null}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
