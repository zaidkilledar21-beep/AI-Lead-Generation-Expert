"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

type CopyState = "idle" | "copied" | "failed";

export function CopyButton({
  value,
  label,
  unavailableLabel = "Unavailable",
  className = ""
}: Readonly<{
  value?: string | null;
  label: string;
  unavailableLabel?: string;
  className?: string;
}>) {
  const [state, setState] = useState<CopyState>("idle");
  const normalized = typeof value === "string" ? value.trim() : "";
  const canCopy = normalized.length > 0;

  return (
    <Button
      type="button"
      variant="secondary"
      disabled={!canCopy}
      className={className}
      title={!canCopy ? unavailableLabel : undefined}
      onClick={async () => {
        if (!canCopy) return;
        try {
          await navigator.clipboard.writeText(normalized);
          setState("copied");
        } catch {
          setState("failed");
        }
        window.setTimeout(() => setState("idle"), 1800);
      }}
    >
      {state === "copied" ? "Copied" : state === "failed" ? "Copy failed" : label}
    </Button>
  );
}
