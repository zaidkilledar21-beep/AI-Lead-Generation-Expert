import type { ReactNode } from "react";

type BadgeTone = "default" | "success" | "info" | "warning" | "danger" | "muted" | "band-a" | "band-b" | "band-c" | "band-d";

export function Badge({ children, tone = "default" }: { children: ReactNode; tone?: BadgeTone }) {
  return <span className={`ui-badge ui-badge-${tone}`}>{children}</span>;
}

export function bandTone(band?: string | null): BadgeTone {
  if (band === "A") return "band-a";
  if (band === "B") return "band-b";
  if (band === "C") return "band-c";
  if (band === "D") return "band-d";
  return "muted";
}
