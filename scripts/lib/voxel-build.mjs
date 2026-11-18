/** Shared pieces of the OSM -> voxel world build scripts. */
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import ts from "typescript";

export const CELL_M = 6;
export const V_STEP_M = 3;

const M_PER_LAT = 110574;
const M_PER_LON_EQUATOR = 111320;

/** Building colours; index 0 is "no building". The index is stored per cell in the world file. */
export const PALETTE = [
  "#000000",
  "#e7e1d5", // 1 cream stucco
  "#d5cbb8", // 2 sand concrete
  "#c6b79f", // 3 warm beige
  "#b5a38b", // 4 muted ochre
  "#c96d49", // 5 terracotta brick
  "#a95338", // 6 deep clay / rust brick
  "#8e96a0", // 7 cool concrete
  "#6e7a88", // 8 slate
  "#5a7c94", // 9 glass blue
  "#4c6c84", // 10 deep glass
  "#7399ac", // 11 light cyan glass
  "#d8a45c", // 12 golden sandstone
  "#cbb48c", // 13 limestone
  "#7f867b", // 14 olive concrete
  "#b87956", // 15 burnt sienna
  "#e2d9ca", // 16 bright stone
  "#525963", // 17 charcoal steel
  "#89a399", // 18 seafoam
  "#6d6b68", // 19 granite
];
export const GRANITE = 19;

const NAMED_COLOURS = {
  white: "#e8e6e0",
  beige: "#dfd3be",
  cream: "#ede5d2",
  yellow: "#e5c158",
  brown: "#8f694b",
  red: "#b85d43",
  terracotta: "#c66b49",
  grey: "#9ba0a8",
  gray: "#9ba0a8",
  blue: "#638ea8",
  green: "#628b74",
  black: "#3d424b",
  orange: "#d27d46",
};

export function parseColorHex(str) {
  if (!str) return null;
  const clean = str.trim().toLowerCase();
  if (/^#[0-9a-f]{6}$/.test(clean)) return clean;
  return NAMED_COLOURS[clean] || null;
}

/** Nearest palette entry to a #rrggbb colour, or null when there is no colour. */
export function hexToPaletteIndex(hex) {
  if (!hex) return null;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  let best = 1;
  let bestDist = Infinity;
  for (let i = 1; i < PALETTE.length; i++) {
    const pr = parseInt(PALETTE[i].slice(1, 3), 16);
    const pg = parseInt(PALETTE[i].slice(3, 5), 16);
    const pb = parseInt(PALETTE[i].slice(5, 7), 16);
    const d = (r - pr) ** 2 + (g - pg) ** 2 + (b - pb) ** 2;
    if (d < bestDist) {
      bestDist = d;
      best = i;
    }
  }
  return best;
}

/** Stable pseudo-random 0..1 from an integer id. */
export function hashId(id) {
  const h = (Math.abs(id) * 2654435761) >>> 0;
  return (h % 1000) / 1000;
}

/**
 * Loads one export of a TypeScript data file, so the scripts share the app's
 * data. The file is transpiled and run on its own: its imports resolve to empty
 * modules, which is fine as long as it only uses them inside functions.
 */
export function loadTsExport(relativePath, exportName) {
  const src = fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
  const { outputText } = ts.transpileModule(src, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  const exports = {};
  new Function("exports", "require", outputText)(exports, () => ({}));
  if (!(exportName in exports)) throw new Error(`"${exportName}" not exported by ${relativePath}`);
  return exports[exportName];
}

export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** The OSM API asked us to back off. Callers stop instead of retrying. */
export class RateLimitedError extends Error {}

/** Splits script arguments into --flags and plain values (world slugs). */
export function parseArgs(argv = process.argv.slice(2)) {
  return {
    flags: new Set(argv.filter((a) => a.startsWith("--"))),
    slugs: argv.filter((a) => !a.startsWith("--")),
  };
}

/**
 * Returns fetchTile(south, west, north, east) for the OSM API 0.6 map call.
 * A tile the API rejects as too large is split in four (twice at most). A tile
 * that still fails after three attempts throws, so a world is never built
 * from partial data. HTTP 429/509 throws RateLimitedError at once.
 */
export function createTileFetcher({ userAgent, timeoutMs, rateLimitWaitMs, retryDelayMs }) {
  return async function fetchTile(south, west, north, east, depth = 0) {
    const url = `https://api.openstreetmap.org/api/0.6/map.json?bbox=${west.toFixed(5)},${south.toFixed(5)},${east.toFixed(5)},${north.toFixed(5)}`;
    let lastError = "";
    for (let attempt = 0; attempt < 3; attempt++) {
      let tooLarge = false;
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeoutMs);
        const res = await fetch(url, {
          headers: { "User-Agent": userAgent },
          signal: controller.signal,
        });
        clearTimeout(timer);

        if (res.status === 429 || res.status === 509) {
          throw new RateLimitedError(`OSM API rate limit (HTTP ${res.status})`);
        }
        if (res.status === 400 && depth < 2) {
          tooLarge = true;
        } else if (res.status >= 500) {
          lastError = `HTTP ${res.status}`;
          await sleep(rateLimitWaitMs);
          continue;
        } else {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const text = await res.text();
          if (!text.startsWith("{")) {
            lastError = "non-JSON response";
            await sleep(rateLimitWaitMs);
            continue;
          }
          return JSON.parse(text).elements || [];
        }
      } catch (err) {
        if (err instanceof RateLimitedError) throw err;
        lastError = err.message;
        if (attempt < 2) await sleep(retryDelayMs(attempt));
        continue;
      }

      if (tooLarge) {
        const midLat = (south + north) / 2;
        const midLon = (west + east) / 2;
        return [
          ...(await fetchTile(south, west, midLat, midLon, depth + 1)),
          ...(await fetchTile(south, midLon, midLat, east, depth + 1)),
          ...(await fetchTile(midLat, west, north, midLon, depth + 1)),
          ...(await fetchTile(midLat, midLon, north, east, depth + 1)),
        ];
      }
    }
    throw new Error(
      `OSM tile (${south.toFixed(3)},${west.toFixed(3)}) failed after 3 attempts: ${lastError}`
    );
  };
}

/** Adds one tile's elements to the node and way maps. Nodes become [lat, lon, tags|null]. */
export function collectElements(elements, nodes, ways) {
  for (const el of elements) {
    if (el.type === "node") nodes.set(el.id, [el.lat, el.lon, el.tags || null]);
    else if (el.type === "way") ways.set(el.id, el);
  }
}

/** [lat, lon] pairs for a way, or null when a node is missing from the extract. */
export function wayCoords(way, nodes) {
  if (!way.nodes || way.nodes.length < 2) return null;
  const coords = [];
  for (const nid of way.nodes) {
    const n = nodes.get(nid);
    if (!n) return null;
    coords.push([Number(n[0].toFixed(6)), Number(n[1].toFixed(6))]);
  }
  return coords;
}

const CITY_HIGHWAYS = [
  "motorway",
  "motorway_link",
  "trunk",
  "trunk_link",
  "primary",
  "primary_link",
  "secondary",
  "secondary_link",
  "tertiary",
  "residential",
  "unclassified",
];

/** Sorts a city extract's ways into buildings, roads, parks and waters. */
export function classifyCityWays(nodes, ways) {
  const buildings = [];
  const roads = [];
  const parks = [];
  const waters = [];

  for (const way of ways.values()) {
    const tags = way.tags || {};
    const coords = wayCoords(way, nodes);
    if (!coords) continue;

    if (tags.building) {
      buildings.push({
        id: way.id,
        name: tags.name || null,
        levels: tags["building:levels"] ? Number(tags["building:levels"]) : null,
        height: tags.height ? parseFloat(tags.height) : null,
        colour: tags["building:colour"] || null,
        housenumber: tags["addr:housenumber"] || null,
        street: tags["addr:street"] || null,
        coords,
      });
    } else if (tags.highway) {
      if (CITY_HIGHWAYS.includes(tags.highway)) {
        roads.push({
          id: way.id,
          name: tags.name || null,
          highway: tags.highway,
          bridge: Boolean(tags.bridge && tags.bridge !== "no"),
          coords,
        });
      }
    } else if (tags.natural === "water" || tags.waterway || tags.landuse === "reservoir") {
      waters.push({
        id: way.id,
        name: tags.name || null,
        waterway: tags.waterway || null,
        coords,
      });
    } else if (
      tags.leisure === "park" ||
      tags.leisure === "garden" ||
      tags.leisure === "golf_course" ||
      tags.leisure === "recreation_ground" ||
      tags.landuse === "forest" ||
      tags.landuse === "grass" ||
      tags.natural === "wood"
    ) {
      parks.push({ id: way.id, name: tags.name || null, coords });
    }
  }

  return { buildings, roads, parks, waters };
}

/**
 * An empty world grid centred on a lat/lon, with the projection and the
 * rasterising helpers bound to it.
 * surface: 0 water, 1 land, 2 grass, 3 road, 4 major road.
 */
export function createGrid({ centerLat, centerLon, halfWM, halfHM }) {
  const gridW = Math.floor((halfWM * 2) / CELL_M);
  const gridH = Math.floor((halfHM * 2) / CELL_M);
  const totalCells = gridW * gridH;
  const mPerLon = M_PER_LON_EQUATOR * Math.cos((centerLat * Math.PI) / 180);

  const surface = new Uint8Array(totalCells).fill(1);
  const bHeight = new Uint8Array(totalCells);
  const bColor = new Uint8Array(totalCells);
  const bridgeH = new Uint8Array(totalCells);
  const treeH = new Uint8Array(totalCells);

  const latLonToMeters = (lat, lon) => [
    (lon - centerLon) * mPerLon,
    -(lat - centerLat) * M_PER_LAT,
  ];
  const metersToGrid = (x, z) => [
    Math.floor((x + halfWM) / CELL_M),
    Math.floor((z + halfHM) / CELL_M),
  ];
  const idx = (gx, gz) => gz * gridW + gx;
  const inBounds = (gx, gz) => gx >= 0 && gx < gridW && gz >= 0 && gz < gridH;

  function drawDisc(arr, cx, cz, radius, val, cond = null) {
    const r2 = radius * radius;
    const rc = Math.ceil(radius);
    for (let dz = -rc; dz <= rc; dz++) {
      const gz = cz + dz;
      if (gz < 0 || gz >= gridH) continue;
      for (let dx = -rc; dx <= rc; dx++) {
        if (dx * dx + dz * dz > r2) continue;
        const gx = cx + dx;
        if (gx < 0 || gx >= gridW) continue;
        const i = idx(gx, gz);
        if (!cond || cond(arr[i], i)) arr[i] = val;
      }
    }
  }

  /** Calls cb(gx, gz, radius) for every cell step along a lat/lon polyline. */
  function drawPolyline(coords, radius, cb) {
    for (let i = 0; i < coords.length - 1; i++) {
      const [x0, z0] = latLonToMeters(coords[i][0], coords[i][1]);
      const [x1, z1] = latLonToMeters(coords[i + 1][0], coords[i + 1][1]);
      const [gx0, gz0] = metersToGrid(x0, z0);
      const [gx1, gz1] = metersToGrid(x1, z1);
      const steps = Math.max(Math.abs(gx1 - gx0), Math.abs(gz1 - gz0), 1);
      for (let s = 0; s <= steps; s++) {
        const t = s / steps;
        cb(Math.round(gx0 + (gx1 - gx0) * t), Math.round(gz0 + (gz1 - gz0) * t), radius);
      }
    }
  }

  /** Scanline fill: calls cb(gx, gz) for every in-bounds cell inside a lat/lon polygon. */
  function fillPolygon(coords, cb) {
    if (coords.length < 3) return;
    const pts = coords.map(([lat, lon]) => {
      const [mx, mz] = latLonToMeters(lat, lon);
      return [(mx + halfWM) / CELL_M, (mz + halfHM) / CELL_M];
    });
    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
    for (const [px, pz] of pts) {
      if (px < minX) minX = px;
      if (px > maxX) maxX = px;
      if (pz < minZ) minZ = pz;
      if (pz > maxZ) maxZ = pz;
    }
    const x0 = Math.max(0, Math.floor(minX));
    const x1 = Math.min(gridW - 1, Math.ceil(maxX));
    const z0 = Math.max(0, Math.floor(minZ));
    const z1 = Math.min(gridH - 1, Math.ceil(maxZ));

    for (let gz = z0; gz <= z1; gz++) {
      const py = gz + 0.5;
      const crossings = [];
      for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
        const [xi, yi] = pts[i];
        const [xj, yj] = pts[j];
        if ((yi > py) !== (yj > py)) {
          crossings.push(((xj - xi) * (py - yi)) / (yj - yi) + xi);
        }
      }
      crossings.sort((a, b) => a - b);
      for (let k = 0; k < crossings.length - 1; k += 2) {
        const startX = Math.max(x0, Math.floor(crossings[k]));
        const endX = Math.min(x1, Math.floor(crossings[k + 1]));
        for (let gx = startX; gx <= endX; gx++) cb(gx, gz);
      }
    }
  }

  /** Fills a building footprint; the tallest building wins a shared cell. */
  function fillBuilding(coords, voxH, palIdx) {
    fillPolygon(coords, (gx, gz) => {
      const i = idx(gx, gz);
      if (surface[i] === 0) surface[i] = 1;
      if (voxH > bHeight[i]) {
        bHeight[i] = voxH;
        bColor[i] = palIdx;
        treeH[i] = 0;
      }
    });
  }

  /** Stamps a rounded granite hill. */
  function stampDome({ lat, lon, radiusM, heightM }) {
    const [rx, rz] = latLonToMeters(lat, lon);
    const [cx, cz] = metersToGrid(rx, rz);
    const radCells = Math.round(radiusM / CELL_M);
    const maxVox = Math.round(heightM / V_STEP_M);
    for (let dz = -radCells; dz <= radCells; dz++) {
      for (let dx = -radCells; dx <= radCells; dx++) {
        const dist = Math.hypot(dx, dz) / radCells;
        if (dist > 1) continue;
        const gx = cx + dx;
        const gz = cz + dz;
        if (!inBounds(gx, gz)) continue;
        const vh = Math.max(2, Math.round(maxVox * Math.pow(1 - dist * dist, 0.7)));
        const i = idx(gx, gz);
        if (vh > bHeight[i]) {
          bHeight[i] = vh;
          bColor[i] = GRANITE;
        }
      }
    }
  }

  return {
    centerLat,
    centerLon,
    halfWM,
    halfHM,
    gridW,
    gridH,
    totalCells,
    surface,
    bHeight,
    bColor,
    bridgeH,
    treeH,
    latLonToMeters,
    metersToGrid,
    idx,
    inBounds,
    drawDisc,
    drawPolyline,
    fillPolygon,
    fillBuilding,
    stampDome,
  };
}

/**
 * Roads as world-space polylines for moving traffic, longest first.
 * include(road) picks the roads, fallbackName(road) names unnamed ones.
 */
export function routesFromRoads(grid, roads, { minCoords, include, bridgeY, minLen, fallbackName }) {
  const routes = [];
  for (const r of roads) {
    if (r.coords.length < minCoords || !include(r)) continue;
    const pts = r.coords.map(([lat, lon]) => {
      const [mx, mz] = grid.latLonToMeters(lat, lon);
      return [Number(mx.toFixed(1)), r.bridge ? bridgeY : 3.2, Number(mz.toFixed(1))];
    });
    let len = 0;
    for (let k = 0; k < pts.length - 1; k++) {
      len += Math.hypot(pts[k + 1][0] - pts[k][0], pts[k + 1][2] - pts[k][2]);
    }
    if (len > minLen) {
      routes.push({
        name: r.name || fallbackName(r),
        kind: r.bridge ? "bridge" : r.highway,
        len: Math.round(len),
        pts,
      });
    }
  }
  routes.sort((a, b) => b.len - a.len);
  return routes;
}

/**
 * Writes <binFile> (gzipped: 16-byte "ZIMV" header, then 4 bytes per cell)
 * and <metaFile>. Returns the uncompressed byte length.
 */
export function writeWorld({ outDir, binFile, metaFile, grid, stats, pois, routes }) {
  const headerSize = 16;
  const buf = Buffer.alloc(headerSize + grid.totalCells * 4);
  buf.write("ZIMV", 0, "ascii");
  buf.writeUInt16LE(grid.gridW, 4);
  buf.writeUInt16LE(grid.gridH, 6);
  buf.writeUInt16LE(CELL_M, 8);
  buf.writeUInt16LE(V_STEP_M, 10);
  buf.writeUInt32LE(PALETTE.length, 12);

  for (let i = 0; i < grid.totalCells; i++) {
    const off = headerSize + i * 4;
    buf[off] = grid.surface[i];
    buf[off + 1] = grid.bHeight[i];
    buf[off + 2] = grid.bColor[i];
    buf[off + 3] = ((grid.bridgeH[i] & 0x0f) << 4) | (grid.treeH[i] & 0x0f);
  }

  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, binFile), zlib.gzipSync(buf));
  fs.writeFileSync(
    path.join(outDir, metaFile),
    JSON.stringify({
      gridW: grid.gridW,
      gridH: grid.gridH,
      cellM: CELL_M,
      vStepM: V_STEP_M,
      halfWM: grid.halfWM,
      halfHM: grid.halfHM,
      centerLat: grid.centerLat,
      centerLon: grid.centerLon,
      palette: PALETTE,
      stats,
      ...(pois ? { pois } : {}),
      routes,
    })
  );
  return buf.length;
}
