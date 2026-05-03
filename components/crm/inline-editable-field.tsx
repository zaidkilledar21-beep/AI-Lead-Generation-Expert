"use client";

import { useOptimistic, useState, useTransition, useRef, useEffect } from "react";
import { updateLeadFieldAction } from "@/lib/crm/actions";
import { Check, X, Edit2 } from "lucide-react";

interface Props {
  readonly leadId: string;
  readonly field: string;
  readonly initialValue: string | null;
  readonly label: string;
}

export function InlineEditableField({ leadId, field, initialValue, label }: Props) {
  const [isEditing, setIsEditing] = useState(false);
  const [optimisticValue, setOptimisticValue] = useOptimistic(
    initialValue,
    (state, newValue: string) => newValue
  );
  const [, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  const handleSave = async (formData: FormData) => {
    const newValue = formData.get("value") as string;
    if (newValue === optimisticValue) {
      setIsEditing(false);
      return;
    }

    startTransition(async () => {
      setOptimisticValue(newValue);
      setIsEditing(false);
      await updateLeadFieldAction(leadId, field, newValue);
    });
  };

  if (isEditing) {
    return (
      <div>
        <span className="metric-label block mb-1">{label}</span>
        <form action={handleSave} className="flex items-center gap-2">
          <input
            ref={inputRef}
            name="value"
            defaultValue={optimisticValue || ""}
            className="bg-black/40 border border-brand/30 rounded px-2 py-1 text-white text-sm focus:outline-none focus:ring-1 focus:ring-brand w-full"
            onKeyDown={(e) => {
              if (e.key === "Escape") setIsEditing(false);
            }}
          />
          <button type="submit" className="text-green-400 hover:text-green-300 transition-colors p-1 bg-green-400/10 rounded">
            <Check className="w-3 h-3" />
          </button>
          <button type="button" onClick={() => setIsEditing(false)} className="text-white/40 hover:text-white/60 transition-colors p-1 bg-white/5 rounded">
            <X className="w-3 h-3" />
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="group relative">
      <span className="metric-label block mb-1">{label}</span>
      <div className="flex items-center gap-2">
        <strong className={`truncate ${optimisticValue ? "" : "text-white/30"}`}>
          {optimisticValue || "Unknown"}
        </strong>
        <button 
          onClick={() => setIsEditing(true)}
          className="opacity-0 group-hover:opacity-100 transition-opacity text-white/40 hover:text-white transition-colors p-1 bg-white/5 rounded"
        >
          <Edit2 className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}
