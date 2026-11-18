import fs from "node:fs";
import path from "node:path";
import { placesFromOsm, writeSearchIndex } from "./search-index.mjs";
import {
  GRANITE,
  V_STEP_M,
  collectElements,
  createGrid,
  createTileFetcher,
  hashId,
  loadTsExport,
  parseArgs,
  routesFromRoads,
  sleep,
  wayCoords,
  writeWorld,
} from "./lib/voxel-build.mjs";

const WORLDS = loadTsExport("src/data/zimbabwe-places.ts", "ZIMBABWE_PLACES").filter((p) => p.has3DCampus && p.campusSlug);

const HALF_W_M = 1320; // 2640m E-W -> 440 cells (10 * 44)
const HALF_H_M = 1056; // 2112m N-S -> 352 cells (8 * 44)

const fetchTile = createTileFetcher({
  userAgent: "AllAboutZimbabwe-CampusVoxel/1.0",
  timeoutMs: 22000,
  rateLimitWaitMs: 14000,
  retryDelayMs: () => 1500,
});

async function fetchWorldOSM(world) {
  const dLat = 0.010;
  // 0.0128 deg of longitude is about 1,340 m here, just past the grid's 1,320 m half-width.
  const dLon = 0.0128;
  const tiles = [
    {
      south: world.lat - dLat,
      north: world.lat + dLat,
      west: world.lon - dLon,
      east: world.lon,
    },
    {
      south: world.lat - dLat,
      north: world.lat + dLat,
      west: world.lon,
      east: world.lon + dLon,
    },
  ];

  const nodes = new Map();
  const ways = new Map();
  for (const t of tiles) {
    collectElements(await fetchTile(t.south, t.west, t.north, t.east), nodes, ways);
  }

  const buildings = [];
  const roads = [];
  const parks = [];
  const waters = [];
  const namedPois = [];

  for (const [id, n] of nodes.entries()) {
    const t = n[2];
    if (t && t.name && (t.amenity || t.leisure || t.tourism || t.building || t.historic)) {
      namedPois.push({
        id,
        name: t.name,
        lat: n[0],
        lon: n[1],
        kind: t.amenity || t.tourism || t.historic || t.leisure || "landmark",
      });
    }
  }

  for (const way of ways.values()) {
    const tags = way.tags || {};
    const coords = wayCoords(way, nodes);
    if (!coords) continue;

    if (tags.building || tags.historic === "ruins" || tags.barrier === "wall") {
      buildings.push({
        id: way.id,
        name: tags.name || null,
        levels: tags["building:levels"] ? Number(tags["building:levels"]) : null,
        height: tags.height ? parseFloat(tags.height) : null,
        isStone: Boolean(tags.historic === "ruins" || tags.barrier === "wall"),
        housenumber: tags["addr:housenumber"] || null,
        street: tags["addr:street"] || null,
        coords,
      });
      if (tags.name && namedPois.length < 25) {
        namedPois.push({
          id: way.id,
          name: tags.name,
          lat: coords[0][0],
          lon: coords[0][1],
          kind: tags.amenity || tags.historic || tags.building || "building",
        });
      }
    } else if (tags.highway) {
      if (
        [
          "motorway",
          "trunk",
          "primary",
          "secondary",
          "tertiary",
          "residential",
          "unclassified",
          "service",
          "path",
          "footway",
        ].includes(tags.highway)
      ) {
        roads.push({
          id: way.id,
          name: tags.name || null,
          highway: tags.highway,
          bridge: Boolean(tags.bridge && tags.bridge !== "no"),
          coords,
        });
      }
    } else if (tags.natural === "water" || tags.waterway) {
      waters.push({ id: way.id, name: tags.name || null, waterway: tags.waterway || null, coords });
    } else if (
      tags.leisure ||
      tags.landuse === "forest" ||
      tags.landuse === "grass" ||
      tags.natural === "wood"
    ) {
      parks.push({ id: way.id, name: tags.name || null, coords });
    }
  }

  return { buildings, roads, parks, waters, namedPois };
}

function voxelizeWorld(world, raw, outDir) {
  const grid = createGrid({
    centerLat: world.lat,
    centerLon: world.lon,
    halfWM: HALF_W_M,
    halfHM: HALF_H_M,
  });
  const { gridW, gridH, surface, bHeight, bColor, bridgeH, treeH } = grid;
  const { idx, inBounds, latLonToMeters, metersToGrid, drawDisc, drawPolyline, fillPolygon } = grid;

  for (const w of raw.waters) {
    if (!w.waterway) {
      fillPolygon(w.coords, (gx, gz) => {
        surface[idx(gx, gz)] = 0;
      });
    } else if (w.waterway === "river" || w.waterway === "canal" || w.waterway === "stream") {
      drawPolyline(w.coords, w.waterway === "river" ? 6.5 : 3.0, (gx, gz, r) =>
        drawDisc(surface, gx, gz, r, 0)
      );
    }
  }

  for (const p of raw.parks) {
    fillPolygon(p.coords, (gx, gz) => {
      const i = idx(gx, gz);
      if (surface[i] !== 0) {
        surface[i] = 2;
        const h = hashId(gx * 73856093 + gz * 19349663);
        if (h > 0.89 && gx % 2 === 0 && gz % 2 === 0) treeH[i] = 2;
      }
    });
  }

  for (let z = 3; z < gridH - 3; z += 4) {
    for (let x = 3; x < gridW - 3; x += 4) {
      const i = idx(x, z);
      const h = hashId(x * 83492791 + z * 2971215073);
      if (surface[i] === 1 && h > 0.91) treeH[i] = 2;
    }
  }

  for (const r of raw.roads) {
    const isMajor = ["motorway", "trunk", "primary", "secondary"].includes(r.highway);
    const rad = isMajor ? 1.5 : r.highway === "tertiary" ? 1.1 : 0.7;
    if (r.bridge) {
      drawPolyline(r.coords, rad, (gx, gz, rc) => drawDisc(bridgeH, gx, gz, rc, 3));
    } else {
      drawPolyline(r.coords, rad, (gx, gz, rc) => {
        drawDisc(surface, gx, gz, rc, isMajor ? 4 : 3, (cur) => cur !== 0);
        drawDisc(treeH, gx, gz, rc, 0);
      });
    }
  }

  for (const b of raw.buildings) {
    const hHash = hashId(b.id);
    let meters = b.height || (b.levels ? b.levels * 3.5 : 0);
    if (!meters || Number.isNaN(meters)) {
      meters = b.isStone ? 9 + hHash * 5 : hHash > 0.85 ? 14 + hHash * 18 : 6 + hHash * 8;
    }
    const voxH = Math.max(2, Math.min(48, Math.round(meters / V_STEP_M)));
    const choices = b.isStone
      ? [GRANITE, 13, 2]
      : voxH >= 7
      ? [9, 1, 7, 13, 16]
      : [1, 2, 5, 6, 12, 13, 15];
    const palIdx = choices[Math.floor(hHash * choices.length) % choices.length];

    if (b.isStone && b.coords.length >= 2) {
      drawPolyline(b.coords, 1.2, (gx, gz, rc) => {
        drawDisc(bHeight, gx, gz, rc, voxH);
        drawDisc(bColor, gx, gz, rc, GRANITE);
      });
    } else {
      grid.fillBuilding(b.coords, voxH, palIdx);
    }
  }

  if (world.campusSlug === "great-zimbabwe") {
    // OSM has no usable footprint for the Great Enclosure: stamp its elliptical wall and the Conical Tower.
    const [gx0, gz0] = metersToGrid(0, 0);
    for (let a = 0; a < 360; a += 3) {
      const rad = (a * Math.PI) / 180;
      const rx = Math.round(gx0 + Math.cos(rad) * 9);
      const rz = Math.round(gz0 + Math.sin(rad) * 7);
      if (inBounds(rx, rz)) {
        bHeight[idx(rx, rz)] = 4;
        bColor[idx(rx, rz)] = GRANITE;
      }
    }
    if (inBounds(gx0 + 5, gz0 + 2)) {
      bHeight[idx(gx0 + 5, gz0 + 2)] = 5;
      bColor[idx(gx0 + 5, gz0 + 2)] = GRANITE;
    }
  }

  const routes = routesFromRoads(grid, raw.roads, {
    minCoords: 3,
    include: (r) => !["path", "footway"].includes(r.highway),
    bridgeY: 9,
    minLen: 110,
    fallbackName: () => `${world.shortName} Road`,
  });

  if (world.campusSlug === "victoria-falls") {
    routes.unshift({
      name: "Zambezi Upper River Sunset Cruise",
      kind: "ferry",
      len: 900,
      pts: [
        latLonToMeters(-17.916, 25.844),
        latLonToMeters(-17.918, 25.849),
        latLonToMeters(-17.921, 25.853),
      ].map(([mx, mz]) => [Number(mx.toFixed(1)), 1.5, Number(mz.toFixed(1))]),
    });
  }

  writeWorld({
    outDir,
    binFile: `${world.campusSlug}.bin.gz`,
    metaFile: `${world.campusSlug}-meta.json`,
    grid,
    stats: {
      buildings: raw.buildings.length,
      roads: raw.roads.length,
      parks: raw.parks.length,
    },
    pois: raw.namedPois.slice(0, 20),
    routes: routes.slice(0, 45),
  });
}

// Usage: node scripts/build-campus-voxels.mjs [--index-only] [campusSlug ...]
// --index-only refetches OSM and rewrites only the search index, leaving world files alone.
async function main() {
  const outDir = path.join(process.cwd(), "public", "data", "cities");
  fs.mkdirSync(outDir, { recursive: true });

  const { flags, slugs } = parseArgs();
  const indexOnly = flags.has("--index-only");
  const targets = slugs.length ? WORLDS.filter((w) => slugs.includes(w.campusSlug)) : WORLDS;

  console.log(
    `Building ${indexOnly ? "search indexes" : "voxel worlds"} for ${targets.length} Zimbabwe university campuses & wonders from real OSM...`
  );

  for (let i = 0; i < targets.length; i++) {
    const w = targets[i];
    const binPath = path.join(outDir, `${w.campusSlug}.bin.gz`);
    if (!indexOnly && fs.existsSync(binPath) && !slugs.length) {
      console.log(`[${i + 1}/${targets.length}] ${w.shortName} — cached`);
      continue;
    }
    const raw = await fetchWorldOSM(w);
    if (!indexOnly) voxelizeWorld(w, raw, outDir);
    const places = placesFromOsm({
      roads: raw.roads,
      buildings: raw.buildings,
      pois: raw.namedPois,
    });
    writeSearchIndex(w.campusSlug, places);
    console.log(
      `[${i + 1}/${targets.length}] ${w.shortName}: ${raw.buildings.length} buildings, ${raw.roads.length} roads, ${raw.namedPois.length} named POIs, ${places.length} search places`
    );
    await sleep(1000);
  }
  console.log(indexOnly ? "Campus search indexes rebuilt." : "All flagship campuses & wonders voxelized!");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
