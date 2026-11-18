import type { GpRecord, SatKind, SatProfile } from "./types";

/** Classify a Celestrak object for pass search and labelling. */
export function profileOf(record: GpRecord): SatProfile {
  const name = (record.OBJECT_NAME || "").trim();
  const upper = name.toUpperCase();
  const noradId = Number(record.NORAD_CAT_ID);
  const geo = Number(record.MEAN_MOTION) > 0.9 && Number(record.MEAN_MOTION) < 1.15;

  let kind: SatKind = "other";
  let halfAngleDeg = 0.75;
  let publishes = false;

  if (/SENTINEL[- ]?2/.test(upper)) {
    kind = "imaging";
    halfAngleDeg = 1.35;
    publishes = true;
  } else if (/LANDSAT/.test(upper)) {
    kind = "imaging";
    halfAngleDeg = 1.4;
    publishes = true;
  } else if (/SENTINEL[- ]?1|RADARSAT|ALOS|TERRASAR|COSMO/.test(upper)) {
    kind = "radar";
    halfAngleDeg = 1.8;
    publishes = /SENTINEL[- ]?1/.test(upper);
  } else if (/NOAA|METOP|SUOMI|NPP|JPSS|GOES|METEOSAT|HIMAWARI|FENGYUN|GMS|^(TERRA|AQUA)$/.test(upper)) {
    kind = "weather";
    // In low orbit these scan a strip some 2,500 km wide, every pass.
    halfAngleDeg = geo ? 55 : 11;
    publishes = true;
  } else if (/ISS|ZARYA|TIANGONG|CSS|CREW|DRAGON|SOYUZ|PROGRESS/.test(upper)) {
    kind = "crew";
    halfAngleDeg = 0.85;
  } else if (/SENTINEL|SPOT|PLEIADES|SKYSAT|WORLDVIEW|GEOEYE|IKONOS|RAPIDEYE|PLANETSCOPE|CBERS|GAOFEN|KANOPUS/.test(upper)) {
    kind = "imaging";
    halfAngleDeg = 1.15;
    publishes = /SENTINEL/.test(upper);
  }

  return { noradId, name, kind, halfAngleDeg, publishes, geo };
}

export function labelFor(
  profile: SatProfile,
  hasScene: boolean,
): "watched" | "likely" | "could" | "overhead" {
  if (hasScene) return "watched";
  if (profile.publishes && (profile.kind === "imaging" || profile.kind === "weather" || profile.kind === "radar")) {
    return "likely";
  }
  if (profile.kind === "imaging" || profile.kind === "radar") return "could";
  return "overhead";
}

export const LABEL_COPY = {
  watched: "Watched",
  likely: "Likely watched",
  could: "Could have pointed here",
  overhead: "Passed overhead",
} as const;
