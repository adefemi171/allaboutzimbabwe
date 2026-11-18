import { NextResponse } from "next/server";

/**
 * Fixed-window rate limiter held in memory. It is per server instance: counts
 * are not shared between instances and reset on restart, so it slows abuse
 * down rather than guaranteeing a global limit.
 */
const WINDOW_MS = 10 * 60 * 1000;
const MAX_REQUESTS = 5;
const MAX_KEYS = 10_000;

const windows = new Map<string, { count: number; resetAt: number }>();

function clientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || req.headers.get("x-real-ip")?.trim() || "unknown";
}

function prune(now: number): void {
  for (const [key, entry] of windows) {
    if (entry.resetAt <= now) windows.delete(key);
  }
  // Still full of live windows: drop the oldest (Map keeps insertion order).
  for (const key of windows.keys()) {
    if (windows.size < MAX_KEYS) break;
    windows.delete(key);
  }
}

/**
 * Counts this request against `route` for the caller's IP. Returns a 429
 * response once the limit is passed, otherwise null.
 */
export function rateLimit(req: Request, route: string): NextResponse | null {
  const now = Date.now();
  const key = `${route}:${clientIp(req)}`;
  const entry = windows.get(key);

  if (!entry || entry.resetAt <= now) {
    if (windows.size >= MAX_KEYS) prune(now);
    windows.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return null;
  }

  entry.count += 1;
  if (entry.count <= MAX_REQUESTS) return null;

  const retryAfterS = Math.ceil((entry.resetAt - now) / 1000);
  return NextResponse.json(
    { error: "Too many requests. Please try again in a few minutes." },
    { status: 429, headers: { "Retry-After": String(retryAfterS) } }
  );
}
