// Pictures in the open archives: recent Sentinel-2 and Landsat scenes over
// a place, found through Element84's Earth Search (a STAC catalogue).

import type { Scene } from "./types";

const SEARCH_URL = "https://earth-search.aws.element84.com/v1/search";

/** How far back the satellite pages look. */
export const SCENE_DAYS = 7;

export const SENTINEL_2 = "sentinel-2-l2a";
const LANDSAT = "landsat-c2-l2";

/** The satellites behind the scenes, by the name the archive gives them. */
const PLATFORM_NORAD: Record<string, number> = {
  "sentinel-2a": 40697,
  "sentinel-2b": 42063,
  "sentinel-2c": 60990,
  "landsat-8": 39084,
  "landsat-9": 49260,
};

interface StacItem {
  id?: string;
  collection?: string;
  links?: { rel?: string; href?: string }[];
  properties?: {
    datetime?: string;
    platform?: string;
    "eo:cloud_cover"?: number;
  };
  assets?: Record<string, { href?: string } | undefined>;
}

/** "sentinel-2a" reads better as "Sentinel-2A". */
function platformName(platform: string): string {
  return platform.replace(
    /^(sentinel|landsat)-(\w+)$/i,
    (_, family: string, unit: string) =>
      `${family[0].toUpperCase()}${family.slice(1).toLowerCase()}-${unit.toUpperCase()}`,
  );
}

/** Only links a browser can open. Landsat's previews sit behind a login. */
function web(href: string | undefined): string | null {
  return href?.startsWith("https://") ? href : null;
}

function toScene(item: StacItem): Scene | null {
  const datetime = item.properties?.datetime;
  if (!datetime) return null;
  const collection = item.collection ?? "";
  const platform = (item.properties?.platform ?? "").toLowerCase();
  const cloud = item.properties?.["eo:cloud_cover"];
  const assets = item.assets ?? {};
  return {
    id: item.id ?? datetime,
    datetime,
    platform: platformName(platform || collection),
    cloudCover: typeof cloud === "number" ? cloud : null,
    thumbnail: web(assets.thumbnail?.href) ?? web(assets.overview?.href),
    // The full picture as a cloud-optimised GeoTIFF, which closeup.ts reads.
    visual: collection === SENTINEL_2 ? web(assets.visual?.href) : null,
    href:
      item.links?.find((link) => link.rel === "self")?.href ??
      `https://earth-search.aws.element84.com/v1/collections/${collection}/items/${encodeURIComponent(item.id ?? "")}`,
    noradId: PLATFORM_NORAD[platform] ?? null,
    metres: collection === SENTINEL_2 ? 10 : 30,
    daily: false,
  };
}

/**
 * Scenes that cover a point: those of the last week, newest first, or with
 * `maxCloud` the clearest of any stretch of time, clearest first.
 * @param reach Half the side of the square searched around the point, degrees.
 */
export async function searchScenes(
  lat: number,
  lon: number,
  options: {
    signal?: AbortSignal;
    collections?: string[];
    reach?: number;
    limit?: number;
    from?: Date;
    to?: Date;
    /** Only scenes with less cloud than this, in percent of the frame. */
    maxCloud?: number;
  } = {},
): Promise<Scene[]> {
  // A small square: only scenes whose footprint really covers the point.
  const { signal, collections = [SENTINEL_2, LANDSAT], reach = 0.002, limit = 80, maxCloud } = options;
  const end = options.to ?? new Date();
  const start = options.from ?? new Date(end.getTime() - SCENE_DAYS * 24 * 60 * 60 * 1000);
  const response = await fetch(SEARCH_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/geo+json" },
    body: JSON.stringify({
      collections,
      bbox: [lon - reach, lat - reach, lon + reach, lat + reach],
      datetime: `${start.toISOString()}/${end.toISOString()}`,
      limit,
      ...(maxCloud !== undefined && {
        query: { "eo:cloud_cover": { lt: maxCloud } },
        sortby: [{ field: "properties.eo:cloud_cover", direction: "asc" }],
      }),
    }),
    signal,
  });
  if (!response.ok) throw new Error(`Earth Search returned ${response.status}`);
  const data = (await response.json()) as { features?: StacItem[] };
  // Earth Search rejects sorting on datetime, so it is done here.
  const scenes = (data.features ?? [])
    .map(toScene)
    .filter((scene): scene is Scene => scene !== null);
  return maxCloud === undefined
    ? scenes.sort((a, b) => b.datetime.localeCompare(a.datetime))
    : scenes;
}

/** "Sentinel-2A · 10 m · 19% cloud" */
export function describeScene(scene: Scene): string {
  const cloud = scene.daily
    ? "daily mosaic"
    : scene.cloudCover === null
      ? "cloud cover unknown"
      : `${Math.round(scene.cloudCover)}% cloud`;
  return `${scene.platform} · ${scene.metres} m · ${cloud}`;
}
