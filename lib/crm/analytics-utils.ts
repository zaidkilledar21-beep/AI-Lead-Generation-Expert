export type AnalyticsDateRange = {
  since: string;
  until: string;
  nextDay: string;
  previousSince: string;
  previousUntil: string;
  label: string;
  timezoneLabel: string;
};

const DAY_MS = 86_400_000;
const FALLBACK_TIMEZONE_LABEL = "UTC date boundaries";

function toIsoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function parseDateOrToday(value?: string) {
  if (!value) return new Date();
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return new Date();
  return parsed;
}

export function resolveAnalyticsDateRange(rangeDays = 30, from?: string, to?: string): AnalyticsDateRange {
  const end = parseDateOrToday(to);
  const start = from ? parseDateOrToday(from) : new Date(end.getTime() - (Math.max(1, rangeDays) - 1) * DAY_MS);
  const diff = Math.max(0, end.getTime() - start.getTime());
  const previousEnd = new Date(start.getTime() - DAY_MS);
  const previousStart = new Date(previousEnd.getTime() - diff);
  const nextDay = new Date(end.getTime() + DAY_MS);
  const since = toIsoDate(start);
  const until = toIsoDate(end);

  return {
    since,
    until,
    nextDay: toIsoDate(nextDay),
    previousSince: toIsoDate(previousStart),
    previousUntil: toIsoDate(previousEnd),
    label: `${since} to ${until}`,
    timezoneLabel: FALLBACK_TIMEZONE_LABEL
  };
}
