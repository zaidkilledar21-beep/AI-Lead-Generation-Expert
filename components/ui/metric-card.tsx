import type { ReactNode } from "react";

export function MetricCard({
  label,
  value,
  delta,
  children
}: {
  label: string;
  value: ReactNode;
  delta?: string;
  children?: ReactNode;
}) {
  return (
    <div className="metric-card">
      <div className="metric-label">{label}</div>
      <div className="metric-value">{value}</div>
      {delta ? <div className="metric-delta">{delta}</div> : null}
      {children}
    </div>
  );
}
