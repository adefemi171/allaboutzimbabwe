import { labelFor, profileOf } from "./profile";
import { lookAt, peakRateDegPerSec, placeEcef, toSatrec } from "./sgp4";
import type { GpRecord, Pass, SatProfile } from "./types";

const MIN_STEP_MS = 5_000;
const MAX_STEP_MS = 30 * 60_000;
const REFINE_MS = 100;

export interface SearchWindow {
  startMs: number;
  endMs: number;
  /** Mark passes with time >= now as upcoming. */
  nowMs: number;
}

function clampStep(ms: number): number {
  return Math.min(MAX_STEP_MS, Math.max(MIN_STEP_MS, ms));
}

/** Golden-section style refine for minimum angle in [lo, hi]. */
function refineClosest(
  satrec: NonNullable<ReturnType<typeof toSatrec>>,
  place: { x: number; y: number; z: number },
  lo: number,
  hi: number,
): { timeMs: number; look: NonNullable<ReturnType<typeof lookAt>> } | null {
  let a = lo;
  let b = hi;
  const phi = (1 + Math.sqrt(5)) / 2;
  let c = b - (b - a) / phi;
  let d = a + (b - a) / phi;
  let lookC = lookAt(satrec, new Date(c), place);
  let lookD = lookAt(satrec, new Date(d), place);
  for (let i = 0; i < 28 && b - a > REFINE_MS; i++) {
    if (!lookC || !lookD) break;
    if (lookC.angleDeg < lookD.angleDeg) {
      b = d;
      d = c;
      lookD = lookC;
      c = b - (b - a) / phi;
      lookC = lookAt(satrec, new Date(c), place);
    } else {
      a = c;
      c = d;
      lookC = lookD;
      d = a + (b - a) / phi;
      lookD = lookAt(satrec, new Date(d), place);
    }
  }
  const mid = (a + b) / 2;
  const look = lookAt(satrec, new Date(mid), place);
  if (!look) return null;
  return { timeMs: mid, look };
}

function findPassesForSat(
  record: GpRecord,
  profile: SatProfile,
  place: { x: number; y: number; z: number },
  window: SearchWindow,
): Pass[] {
  if (profile.geo) return []; // Listed separately as continuous watchers.
  const satrec = toSatrec(record);
  if (!satrec) return [];

  const field = profile.halfAngleDeg;
  const rate = peakRateDegPerSec(Number(record.MEAN_MOTION) || 15);
  const found: Pass[] = [];

  let t = window.startMs;
  let prev = lookAt(satrec, new Date(t), place);
  let inside = !!(prev && prev.angleDeg <= field);
  let enterMs = inside ? t : -1;
  let bestMs = t;
  let bestAngle = prev?.angleDeg ?? 999;

  while (t < window.endMs) {
    const gapDeg = prev ? Math.max(0.05, prev.angleDeg - field) : field;
    const step = clampStep((gapDeg / rate) * 1000);
    t = Math.min(window.endMs, t + step);
    const look = lookAt(satrec, new Date(t), place);
    if (!look) {
      prev = null;
      continue;
    }

    const nowInside = look.angleDeg <= field;
    if (nowInside && look.angleDeg < bestAngle) {
      bestAngle = look.angleDeg;
      bestMs = t;
    }

    if (!inside && nowInside) {
      enterMs = t - step;
      bestMs = t;
      bestAngle = look.angleDeg;
    }

    if (inside && !nowInside && enterMs >= 0) {
      const refined = refineClosest(satrec, place, enterMs, t);
      if (refined && refined.look.angleDeg <= field + 0.05) {
        found.push(makePass(profile, refined.timeMs, refined.look, window.nowMs));
      }
      enterMs = -1;
      bestAngle = 999;
    }

    inside = nowInside;
    prev = look;
  }

  if (inside && enterMs >= 0) {
    const refined = refineClosest(satrec, place, enterMs, window.endMs);
    if (refined && refined.look.angleDeg <= field + 0.05) {
      found.push(makePass(profile, refined.timeMs, refined.look, window.nowMs));
    }
  } else if (bestAngle <= field && found.length === 0) {
    const pad = stepGuess(rate);
    const refined = refineClosest(
      satrec,
      place,
      Math.max(window.startMs, bestMs - pad),
      Math.min(window.endMs, bestMs + pad),
    );
    if (refined && refined.look.angleDeg <= field + 0.05) {
      found.push(makePass(profile, refined.timeMs, refined.look, window.nowMs));
    }
  }

  return found;
}

function stepGuess(rate: number): number {
  return clampStep((2 / rate) * 1000);
}

function makePass(
  profile: SatProfile,
  timeMs: number,
  look: NonNullable<ReturnType<typeof lookAt>>,
  nowMs: number,
): Pass {
  return {
    id: `${profile.noradId}-${Math.round(timeMs / 1000)}`,
    noradId: profile.noradId,
    name: profile.name,
    kind: profile.kind,
    time: new Date(timeMs).toISOString(),
    angleDeg: look.angleDeg,
    lat: look.lat,
    lon: look.lon,
    altitudeKm: look.altitudeKm,
    upcoming: timeMs >= nowMs,
    label: labelFor(profile, false),
    publishes: profile.publishes,
  };
}

/** Every pass over a place in the window, in order of time. */
export function searchAll(
  records: GpRecord[],
  lat: number,
  lon: number,
  window: SearchWindow,
  onProgress?: (done: number, total: number) => void,
): Pass[] {
  const place = placeEcef(lat, lon);
  const out: Pass[] = [];
  records.forEach((record, i) => {
    out.push(...findPassesForSat(record, profileOf(record), place, window));
    onProgress?.(i + 1, records.length);
  });
  return out.sort((a, b) => a.time.localeCompare(b.time));
}

/**
 * The geostationary satellites that have a place in view. They do not
 * pass: they hang over the equator and watch all day.
 */
export function watchers(records: GpRecord[], lat: number, lon: number): SatProfile[] {
  const place = placeEcef(lat, lon);
  const now = new Date();
  return records.map(profileOf).filter((profile, i) => {
    if (!profile.geo || profile.kind !== "weather") return false;
    const satrec = toSatrec(records[i]);
    const look = satrec && lookAt(satrec, now, place);
    return !!look && look.angleDeg <= profile.halfAngleDeg;
  });
}

export function defaultWindow(now = Date.now()): SearchWindow {
  const day = 24 * 60 * 60 * 1000;
  return {
    startMs: now - 7 * day,
    endMs: now + 2 * day,
    nowMs: now,
  };
}
