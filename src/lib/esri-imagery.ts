/** Esri World Imagery (no API key) — tile maths, tile fetching and still previews. */

const SERVICE = "https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer";

export const IMAGERY_CREDIT = "Imagery © Esri, Maxar, Earthstar Geographics";
export const TILE_PX = 256;
/** Deepest level Esri serves over Zimbabwe's cities; rural areas stop around 17. */
export const MAX_IMAGERY_ZOOM = 19;

/**
 * Past its deepest level Esri answers 200 with a "Map data not yet available"
 * JPEG that is always exactly this many bytes.
 */
const PLACEHOLDER_BYTES = 2521;

export function lonToTileX(lon: number, zoom: number): number {
  return ((lon + 180) / 360) * 2 ** zoom;
}

export function latToTileY(lat: number, zoom: number): number {
  const rad = (lat * Math.PI) / 180;
  return ((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) * 2 ** zoom;
}

export function tileXToLon(x: number, zoom: number): number {
  return (x / 2 ** zoom) * 360 - 180;
}

export function tileYToLat(y: number, zoom: number): number {
  const n = Math.PI * (1 - (2 * y) / 2 ** zoom);
  return (180 / Math.PI) * Math.atan(Math.sinh(n));
}

/** Zoom whose ground resolution is at least as fine as `metersPerPixel`. */
export function zoomForResolution(metersPerPixel: number, lat: number): number {
  const equatorRes = 156543.03 * Math.cos((lat * Math.PI) / 180);
  return Math.ceil(Math.log2(equatorRes / Math.max(0.01, metersPerPixel)));
}

/** Resolves null when the tile is missing, unreachable, or the Esri placeholder. */
export async function fetchImageryTile(
  zoom: number,
  x: number,
  y: number,
  signal?: AbortSignal
): Promise<ImageBitmap | null> {
  try {
    const res = await fetch(`${SERVICE}/tile/${zoom}/${y}/${x}`, { signal });
    if (!res.ok) return null;
    const blob = await res.blob();
    if (blob.size === PLACEHOLDER_BYTES) return null;
    return await createImageBitmap(blob);
  } catch {
    return null;
  }
}

/** "west,south,east,north" of a box `spanM` metres wide centred on a point. */
export function bboxAround(lat: number, lon: number, spanM: number, heightOverWidth: number): string {
  const halfLon = spanM / 2 / (111320 * Math.cos((lat * Math.PI) / 180));
  const halfLat = ((spanM / 2) * heightOverWidth) / 110574;
  return [lon - halfLon, lat - halfLat, lon + halfLon, lat + halfLat]
    .map((n) => n.toFixed(6))
    .join(",");
}

/** URL of a still image centred on a point, `spanM` metres wide. */
export function imageryPreviewUrl(
  lat: number,
  lon: number,
  spanM: number,
  widthPx: number,
  heightPx: number
): string {
  const bbox = bboxAround(lat, lon, spanM, heightPx / widthPx);
  return `${SERVICE}/export?bbox=${bbox}&bboxSR=4326&imageSR=3857&size=${widthPx},${heightPx}&format=jpg&f=image`;
}
