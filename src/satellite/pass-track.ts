// A pass handed over to a 3D city map, which draws its path across the
// sky. The satellite page works the path out (track.ts), stores it here and
// sends the visitor to the map with "?satTrack=1", where
// components/voxel/CityVoxelScene.tsx reads it. Nothing here needs the
// orbit code, so the map does not load it.

export const TRACK_STORAGE_KEY = "zim-sat-pass-track";

export interface GroundPoint {
  /** Unix ms. */
  t: number;
  lat: number;
  lon: number;
  altKm: number;
}

export interface StoredPassTrack {
  name: string;
  noradId: string;
  /** Where the drawn path starts and ends, and the closest approach. Unix ms. */
  aos: number;
  los: number;
  tca: number;
  maxElDeg: number;
  track: GroundPoint[];
  placeLabel: string;
  placeLat: number;
  placeLon: number;
}

export function storePassTrack(payload: StoredPassTrack): void {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.setItem(TRACK_STORAGE_KEY, JSON.stringify(payload));
}

export function readPassTrack(): StoredPassTrack | null {
  if (typeof sessionStorage === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(TRACK_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as StoredPassTrack;
  } catch {
    return null;
  }
}
