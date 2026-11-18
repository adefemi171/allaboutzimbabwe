export type MapSearchKind = "street" | "building" | "place" | "address";

export interface MapSearchPlace {
  id: string;
  name: string;
  kind: MapSearchKind;
  detail: string;
  lat: number;
  lon: number;
}

/** Bias (not restrict) results toward a box around a point, e.g. the open city. */
export interface GeoBias {
  lat: number;
  lon: number;
  halfDeg?: number;
}

/** A street's centre line as [lat, lon] pairs. */
export type LatLonPath = [number, number][];

type NominatimHit = {
  place_id: number;
  lat: string;
  lon: string;
  display_name: string;
  type?: string;
  class?: string;
  name?: string;
  geojson?: { type: string; coordinates: unknown };
};

const DEFAULT_HALF_DEG = 0.18;
const cache = new Map<string, NominatimHit[]>();

/** Calls the app's Nominatim proxy (Zimbabwe only, proper User-Agent). */
async function geocode(
  query: string,
  opts: { bias?: GeoBias; limit: number; geometry?: boolean; bounded?: boolean; signal?: AbortSignal }
): Promise<NominatimHit[]> {
  const params = new URLSearchParams({ q: query, limit: String(opts.limit) });
  if (opts.bias) {
    const half = opts.bias.halfDeg ?? DEFAULT_HALF_DEG;
    const { lat, lon } = opts.bias;
    // Nominatim viewbox: left, top, right, bottom
    params.set("viewbox", `${lon - half},${lat + half},${lon + half},${lat - half}`);
    if (opts.bounded) params.set("bounded", "1");
  }
  if (opts.geometry) params.set("geometry", "1");

  const key = params.toString().toLowerCase();
  const cached = cache.get(key);
  if (cached) return cached;

  const res = await fetch(`/api/geocode?${params}`, { signal: opts.signal });
  if (!res.ok) return [];
  const data = (await res.json()) as { results?: NominatimHit[] };
  const hits = data.results ?? [];

  cache.set(key, hits);
  if (cache.size > 80) cache.delete(cache.keys().next().value!);
  return hits;
}

function toPlace(hit: NominatimHit): MapSearchPlace | null {
  const lat = Number(hit.lat);
  const lon = Number(hit.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  const parts = hit.display_name.split(",").map((part) => part.trim());
  const name = (hit.name || parts[0] || "").trim();
  if (name.length < 2) return null;
  const kind: MapSearchKind =
    hit.class === "highway"
      ? "street"
      : /\d/.test(name) || hit.type === "house"
      ? "address"
      : hit.class === "building"
      ? "building"
      : "place";
  return {
    id: `nominatim-${hit.place_id}`,
    name,
    kind,
    detail: parts.slice(1, 3).join(", ") || "Zimbabwe",
    lat: Math.round(lat * 1e5) / 1e5,
    lon: Math.round(lon * 1e5) / 1e5,
  };
}

/** Live street / address / place lookup anywhere in Zimbabwe. */
export async function searchPlaces(
  query: string,
  opts: { bias?: GeoBias; signal?: AbortSignal } = {}
): Promise<MapSearchPlace[]> {
  const q = query.trim();
  if (q.length < 3) return [];
  const hits = await geocode(q, { ...opts, limit: 6 });
  const seen = new Set<string>();
  const places: MapSearchPlace[] = [];
  for (const hit of hits) {
    const place = toPlace(hit);
    if (!place) continue;
    // OSM splits one street into many ways; keep a single row per name + area.
    const key = `${place.name}|${place.detail}`.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    places.push(place);
  }
  return places;
}

/** Centre lines of every mapped piece of a named street inside the bias box. */
export async function fetchStreetPaths(
  name: string,
  bias: GeoBias,
  signal?: AbortSignal
): Promise<LatLonPath[]> {
  const hits = await geocode(name, { bias, bounded: true, geometry: true, limit: 12, signal });
  const wanted = name.trim().toLowerCase();
  const paths: LatLonPath[] = [];
  for (const hit of hits) {
    if (hit.class !== "highway" || (hit.name || "").toLowerCase() !== wanted) continue;
    const geo = hit.geojson;
    if (!geo) continue;
    const lines =
      geo.type === "LineString"
        ? [geo.coordinates as [number, number][]]
        : geo.type === "MultiLineString"
        ? (geo.coordinates as [number, number][][])
        : [];
    for (const line of lines) {
      if (line.length >= 2) paths.push(line.map(([lon, lat]) => [lat, lon]));
    }
  }
  return paths;
}
