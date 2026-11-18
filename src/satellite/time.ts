// Times on the satellite pages. Orbits and archives run on UTC; a visitor
// thinks in Zimbabwe time (CAT, UTC+2), so that is what is shown.

export const ZONE = "Africa/Harare";

const whenFormat = new Intl.DateTimeFormat("en-GB", {
  timeZone: ZONE,
  hourCycle: "h23",
  weekday: "short",
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});
const clockFormat = new Intl.DateTimeFormat("en-GB", {
  timeZone: ZONE,
  hourCycle: "h23",
  weekday: "short",
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

/** "Sat 14 Nov, 11:46", in Zimbabwe time. */
export function formatWhen(time: string | Date): string {
  const date = new Date(time);
  return Number.isNaN(date.getTime()) ? String(time) : whenFormat.format(date);
}

/** "Sat 14 Nov, 11:46:05", in Zimbabwe time. */
export function formatClock(date: Date): string {
  return clockFormat.format(date);
}

/** "in 3 h", "25 min ago", "2 days ago". */
export function formatAway(time: string | Date, now = Date.now()): string {
  const minutes = Math.round((new Date(time).getTime() - now) / 60_000);
  const size = Math.abs(minutes);
  const text =
    size < 1
      ? "now"
      : size < 90
        ? `${size} min`
        : size < 36 * 60
          ? `${Math.round(size / 60)} h`
          : `${Math.round(size / 1440)} days`;
  return size < 1 ? text : minutes > 0 ? `in ${text}` : `${text} ago`;
}

/** The UTC day of a moment, "2026-11-14". Archives file their pictures by it. */
export function utcDay(time: string | Date): string {
  return new Date(time).toISOString().slice(0, 10);
}
