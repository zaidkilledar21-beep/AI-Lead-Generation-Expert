import type { ReactNode } from "react";

export function MetricCard({
  label,
  value,
  delta,
  children,
  href,
  ariaLabel
}: Readonly<{
  label: string;
  value: ReactNode;
  delta?: string;
  children?: ReactNode;
  href?: string;
  ariaLabel?: string;
}>) {
  const content = (
    <>
      <div className="metric-label">{label}</div>
      <div className="metric-value">{value}</div>
      {delta ? <div className="metric-delta">{delta}</div> : null}
      {children}
    </>
  );

  if (href) {
    return (
      <a className="metric-card metric-card-clickable" href={href} aria-label={ariaLabel ?? `${label}: ${value}`}>
        {content}
      </a>
    );
  }

  return (
    <div className="metric-card">
      {content}
    </div>
  );
}
