// The path of one pass over a place, as a 3D city map draws it.

import type { GroundPoint, StoredPassTrack } from "./pass-track";
import { lookAt, placeEcef, toSatrec, type Look } from "./sgp4";
import type { GpRecord, Pass } from "./types";

const EARTH_KM = 6371;
/** The path is drawn for as long as the satellite stands this high in the sky. */
const MIN_EL_DEG = 15;
const STEP_MS = 25_000;
/** No pass in low orbit lasts longer than this either side of its closest approach. */
const MAX_STEPS = 30;

/** How high over the horizon a satellite stands, from the angle at the centre of the Earth. */
function elevationDeg(look: Look): number {
  const angle = (look.angleDeg * Math.PI) / 180;
  const ratio = EARTH_KM / (EARTH_KM + look.altitudeKm);
  return (Math.atan2(Math.cos(angle) - ratio, Math.sin(angle)) * 180) / Math.PI;
}

/** The path of a pass over a place, ready to store. Null if the orbit cannot be worked out. */
export function trackOfPass(
  record: GpRecord,
  pass: Pass,
  place: { lat: number; lon: number; label: string },
): StoredPassTrack | null {
  const satrec = toSatrec(record);
  if (!satrec) return null;
  const spot = placeEcef(place.lat, place.lon);
  const tca = Date.parse(pass.time);
  const at = (t: number) => {
    const look = lookAt(satrec, new Date(t), spot);
    return look && { look, point: { t, lat: look.lat, lon: look.lon, altKm: look.altitudeKm } };
  };
  const closest = at(tca);
  if (!closest) return null;

  // Outwards from the closest approach, both ways, while it stands high
  // enough. A pass that never does still gets two minutes either side.
  const track: GroundPoint[] = [closest.point];
  for (const way of [-1, 1]) {
    for (let step = 1; step <= MAX_STEPS; step++) {
      const found = at(tca + way * step * STEP_MS);
      if (!found || (step > 5 && elevationDeg(found.look) < MIN_EL_DEG)) break;
      if (way < 0) track.unshift(found.point);
      else track.push(found.point);
    }
  }

  return {
    name: pass.name,
    noradId: String(pass.noradId),
    aos: track[0].t,
    los: track[track.length - 1].t,
    tca,
    maxElDeg: Math.round(elevationDeg(closest.look) * 10) / 10,
    track,
    placeLabel: place.label,
    placeLat: place.lat,
    placeLon: place.lon,
  };
}
