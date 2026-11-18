// satellite.js 7 also hands out a WebAssembly build through its front door,
// and webpack, which Next builds with, cannot read the node: imports in
// that build. The orbit code itself is plain JavaScript in files of its
// own, so those are named here by their path.
import { json2satrec } from "../../node_modules/satellite.js/dist/io.js";
import { gstime, propagate } from "../../node_modules/satellite.js/dist/propagation.js";
import {
  degreesLat,
  degreesLong,
  eciToGeodetic,
} from "../../node_modules/satellite.js/dist/transforms.js";
import type { GpRecord } from "./types";

const satellite = { json2satrec, gstime, propagate, degreesLat, degreesLong, eciToGeodetic };

export type SatRec = ReturnType<typeof satellite.json2satrec>;

const DEG = 180 / Math.PI;
const RAD = Math.PI / 180;

export function toSatrec(record: GpRecord): SatRec | null {
  try {
    const satrec = satellite.json2satrec(record as never);
    if (satrec.error) return null;
    return satrec;
  } catch {
    return null;
  }
}

/** Place as a unit ECEF vector (approx, zero height). */
export function placeEcef(latDeg: number, lonDeg: number): { x: number; y: number; z: number } {
  const lat = latDeg * RAD;
  const lon = lonDeg * RAD;
  const cosLat = Math.cos(lat);
  return {
    x: cosLat * Math.cos(lon),
    y: cosLat * Math.sin(lon),
    z: Math.sin(lat),
  };
}

export interface Look {
  /** Earth-central angle between satellite and place, degrees. */
  angleDeg: number;
  lat: number;
  lon: number;
  altitudeKm: number;
  /** Unit ECI direction of the satellite (for tracks). */
  eci: { x: number; y: number; z: number };
}

/**
 * Propagate and measure earth-central angle from the place (ECEF unit)
 * to the satellite. Returns null if propagation fails.
 */
export function lookAt(
  satrec: SatRec,
  date: Date,
  place: { x: number; y: number; z: number },
): Look | null {
  const pv = satellite.propagate(satrec, date);
  if (!pv || !pv.position || typeof pv.position === "boolean") return null;
  const pos = pv.position;

  const r = Math.hypot(pos.x, pos.y, pos.z);
  if (!(r > 0)) return null;
  const ux = pos.x / r;
  const uy = pos.y / r;
  const uz = pos.z / r;

  const gmst = satellite.gstime(date);
  // Rotate place ECEF → TEME/ECI (same as satellite.js ecfToEci).
  const cos = Math.cos(gmst);
  const sin = Math.sin(gmst);
  const px = cos * place.x - sin * place.y;
  const py = sin * place.x + cos * place.y;
  const pz = place.z;

  const dot = Math.min(1, Math.max(-1, ux * px + uy * py + uz * pz));
  const angleDeg = Math.acos(dot) * DEG;

  const gd = satellite.eciToGeodetic(pos, gmst);
  return {
    angleDeg,
    lat: satellite.degreesLat(gd.latitude),
    lon: satellite.degreesLong(gd.longitude),
    altitudeKm: gd.height,
    eci: { x: ux, y: uy, z: uz },
  };
}

/** Rough peak earth-central angular rate (deg/s) for adaptive stepping. */
export function peakRateDegPerSec(meanMotionRevPerDay: number): number {
  // Mean motion in rad/s of the orbit; earth-central rate is similar order.
  const omega = (meanMotionRevPerDay * 2 * Math.PI) / 86400;
  return (omega * DEG) * 1.15 + 0.0042; // + Earth rotation margin
}
