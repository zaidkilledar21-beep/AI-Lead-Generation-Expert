import { bandTone } from "./badge";

export function ScoreBar({ value, max = 100, band }: Readonly<{ value?: number | null; max?: number; band?: string | null }>) {
  const bounded = Math.max(0, Math.min(value ?? 0, max));
  const percent = max > 0 ? (bounded / max) * 100 : 0;

  return (
    <div
      className="score-bar"
      role="progressbar"
      aria-label={`Score ${bounded} of ${max}`}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={bounded}
    >
      <span className={`score-bar-fill ${bandTone(band)}`} style={{ width: `${percent}%` }} />
    </div>
  );
}
