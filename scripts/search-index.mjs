import fs from "node:fs";
import path from "node:path";

// SEARCH_INDEX_DIR redirects the output, so a rebuild can be checked before it replaces live files.
const SEARCH_DIR =
  process.env.SEARCH_INDEX_DIR || path.join(process.cwd(), "public", "data", "search");

const HIGHWAY_DETAIL = {
  motorway: "highway",
  motorway_link: "highway",
  trunk: "highway",
  trunk_link: "highway",
  primary: "main road",
  primary_link: "main road",
  secondary: "main road",
  secondary_link: "main road",
  tertiary: "street",
  residential: "residential street",
  unclassified: "street",
  service: "service road",
  bridge: "bridge",
  ferry: "river route",
};

function usableName(name) {
  if (!name || typeof name !== "string") return false;
  const trimmed = name.trim();
  if (trimmed.length < 3) return false;
  if (/^\d+$/.test(trimmed)) return false;
  // Fallback labels written when OSM had no name, e.g. "Gweru secondary".
  if (/ (motorway|trunk|primary|secondary|tertiary|residential|unclassified|highway)$/i.test(trimmed)) {
    return false;
  }
  return true;
}

function lineMidpoint(coords, lengthOf) {
  if (!coords || coords.length === 0) return null;
  if (coords.length === 1) return coords[0];
  let total = 0;
  const lengths = [];
  for (let i = 0; i < coords.length - 1; i++) {
    const len = lengthOf(coords[i], coords[i + 1]);
    lengths.push(len);
    total += len;
  }
  if (total <= 0) return coords[Math.floor(coords.length / 2)];
  let remain = total / 2;
  for (let i = 0; i < lengths.length; i++) {
    if (remain <= lengths[i] || i === lengths.length - 1) {
      const t = lengths[i] === 0 ? 0 : Math.min(1, remain / lengths[i]);
      const a = coords[i];
      const b = coords[i + 1];
      return a.map((value, axis) => value + (b[axis] - value) * t);
    }
    remain -= lengths[i];
  }
  return coords[Math.floor(coords.length / 2)];
}

function latLonLength(a, b) {
  const mPerLat = 110574;
  const mPerLon = 111320 * Math.cos((((a[0] + b[0]) / 2) * Math.PI) / 180);
  return Math.hypot((b[0] - a[0]) * mPerLat, (b[1] - a[1]) * mPerLon);
}

function xzLength(a, b) {
  return Math.hypot(b[0] - a[0], b[2] - a[2]);
}

function centroid(coords) {
  if (!coords || coords.length === 0) return null;
  let lat = 0;
  let lon = 0;
  let n = 0;
  const last = coords.length - 1;
  const closed =
    coords.length > 2 &&
    coords[0][0] === coords[last][0] &&
    coords[0][1] === coords[last][1];
  const limit = closed ? last : coords.length;
  for (let i = 0; i < limit; i++) {
    lat += coords[i][0];
    lon += coords[i][1];
    n++;
  }
  if (!n) return null;
  return [lat / n, lon / n];
}

function round5(n) {
  return Math.round(n * 1e5) / 1e5;
}

function slugId(prefix, name) {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
  return `${prefix}-${slug || "unnamed"}`;
}

/**
 * Streets, named buildings, and house addresses from a cleaned OSM extract.
 * House numbers are included only when the extract kept addr:* tags.
 */
export function placesFromOsm({ roads = [], buildings = [], pois = [] } = {}) {
  const places = [];
  const seen = new Set();

  const streets = new Map();
  for (const road of roads) {
    if (!usableName(road.name) || !road.coords || road.coords.length < 2) continue;
    const key = road.name.trim().toLowerCase();
    let length = 0;
    for (let i = 0; i < road.coords.length - 1; i++) {
      length += latLonLength(road.coords[i], road.coords[i + 1]);
    }
    const prev = streets.get(key);
    if (!prev || length > prev.length) {
      streets.set(key, { road, length });
    }
  }

  for (const { road } of streets.values()) {
    const mid = lineMidpoint(road.coords, latLonLength);
    if (!mid) continue;
    const name = road.name.trim();
    const id = slugId("street", name);
    if (seen.has(id)) continue;
    seen.add(id);
    places.push({
      id,
      name,
      kind: "street",
      detail: HIGHWAY_DETAIL[road.highway] || "street",
      lat: round5(mid[0]),
      lon: round5(mid[1]),
    });
  }

  for (const building of buildings) {
    const center = centroid(building.coords);
    if (!center) continue;
    const number = building.housenumber && String(building.housenumber).trim();
    const street = building.street && String(building.street).trim();
    if (number && street && usableName(street)) {
      const name = `${number} ${street}`;
      const id = `address-${building.id}`;
      if (!seen.has(id)) {
        seen.add(id);
        places.push({
          id,
          name,
          kind: "address",
          detail: usableName(building.name) ? building.name.trim() : "house",
          lat: round5(center[0]),
          lon: round5(center[1]),
        });
      }
    }
    if (!usableName(building.name)) continue;
    const name = building.name.trim();
    const id = `building-${building.id}`;
    const near = `${name.toLowerCase()}|${center[0].toFixed(3)}|${center[1].toFixed(3)}`;
    if (seen.has(near)) continue;
    seen.add(near);
    places.push({
      id,
      name,
      kind: "building",
      detail: "named building",
      lat: round5(center[0]),
      lon: round5(center[1]),
    });
  }

  for (const poi of pois) {
    if (!usableName(poi.name) || typeof poi.lat !== "number" || typeof poi.lon !== "number") continue;
    const name = poi.name.trim();
    const near = `${name.toLowerCase()}|${poi.lat.toFixed(3)}|${poi.lon.toFixed(3)}`;
    if (seen.has(near)) continue;
    seen.add(near);
    places.push({
      id: `place-${poi.id}`,
      name,
      kind: "place",
      detail: poi.kind || "place",
      lat: round5(poi.lat),
      lon: round5(poi.lon),
    });
  }

  places.sort((a, b) => a.name.localeCompare(b.name) || a.kind.localeCompare(b.kind));
  return places;
}

/** Named roads and places already stored on a voxel meta file. */
export function placesFromMeta(meta) {
  const centerLat = meta.centerLat;
  const centerLon = meta.centerLon;
  const mPerLat = 110574;
  const mPerLon = 111320 * Math.cos((centerLat * Math.PI) / 180);
  const best = new Map();

  for (const route of meta.routes || []) {
    if (!usableName(route.name) || !route.pts || route.pts.length < 2) continue;
    const key = route.name.trim().toLowerCase();
    const length = route.len || 0;
    const prev = best.get(key);
    if (!prev || length > prev.length) best.set(key, { route, length });
  }

  const roads = [];
  for (const { route } of best.values()) {
    const mid = lineMidpoint(route.pts, xzLength);
    if (!mid) continue;
    const lat = centerLat - mid[2] / mPerLat;
    const lon = centerLon + mid[0] / mPerLon;
    roads.push({
      name: route.name.trim(),
      highway: route.kind,
      coords: [
        [lat, lon],
        [lat + 0.00001, lon],
      ],
    });
  }

  return placesFromOsm({
    roads,
    pois: meta.pois || [],
  });
}

export function searchIndexPath(slug) {
  return path.join(SEARCH_DIR, `${slug}.json`);
}

export function writeSearchIndex(slug, places) {
  fs.mkdirSync(SEARCH_DIR, { recursive: true });
  const file = searchIndexPath(slug);
  fs.writeFileSync(file, JSON.stringify({ places }));
  return file;
}
