/** One Celestrak GP record (subset of fields we use). */
export interface GpRecord {
  OBJECT_NAME: string;
  NORAD_CAT_ID: number;
  EPOCH: string;
  MEAN_MOTION: number;
  ECCENTRICITY: number;
  INCLINATION: number;
  RA_OF_ASC_NODE: number;
  ARG_OF_PERICENTER: number;
  MEAN_ANOMALY: number;
  BSTAR?: number;
  MEAN_MOTION_DOT?: number;
  MEAN_MOTION_DDOT?: number;
  EPHEMERIS_TYPE?: number;
  CLASSIFICATION_TYPE?: string;
  ELEMENT_SET_NO?: number;
  REV_AT_EPOCH?: number;
  [key: string]: unknown;
}

export type SatKind = "imaging" | "radar" | "weather" | "crew" | "other";

export type PassLabel = "watched" | "likely" | "could" | "overhead";

export interface SatProfile {
  noradId: number;
  name: string;
  kind: SatKind;
  /** Earth-central half-angle of the field of view, degrees. */
  halfAngleDeg: number;
  /** Always-on public imagers (Sentinel-2, Landsat, …). */
  publishes: boolean;
  /** Geostationary: watches continuously when in view. */
  geo: boolean;
}

export interface Pass {
  id: string;
  noradId: number;
  name: string;
  kind: SatKind;
  /** Closest approach, UTC ISO. */
  time: string;
  /** Closest earth-central angle, degrees. */
  angleDeg: number;
  /** Ground-track lat at closest approach. */
  lat: number;
  lon: number;
  altitudeKm: number;
  /** True when the pass is still in the future. */
  upcoming: boolean;
  label: PassLabel;
  publishes: boolean;
}

/** A picture in an open archive. */
export interface Scene {
  id: string;
  /** When it was taken, UTC ISO. */
  datetime: string;
  /** "Sentinel-2A" */
  platform: string;
  cloudCover: number | null;
  /** A small preview of the whole frame, about a hundred kilometres across. */
  thumbnail: string | null;
  /** The full 10 m picture as a cloud-optimised GeoTIFF, where there is one. */
  visual: string | null;
  /** The archive's record of the scene. */
  href: string;
  /** The satellite that took it, if it is one we know. */
  noradId: number | null;
  /** The size of a pixel on the ground, metres. */
  metres: number;
  /** A cut from the day's mosaic of a weather satellite, centred on the place. */
  daily: boolean;
}

export interface MatchedPass extends Pass {
  scene: Scene | null;
}
