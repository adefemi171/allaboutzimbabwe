import fs from "node:fs";
import path from "node:path";
import { placesFromOsm, writeSearchIndex } from "./search-index.mjs";
import {
  V_STEP_M,
  classifyCityWays,
  collectElements,
  createGrid,
  createTileFetcher,
  hashId,
  hexToPaletteIndex,
  loadTsExport,
  parseArgs,
  parseColorHex,
  routesFromRoads,
  sleep,
  writeWorld,
} from "./lib/voxel-build.mjs";

// Harare has its own, larger world: see build-harare-voxels.mjs.
const PROVINCES = loadTsExport("src/data/zimbabwe-provinces.ts", "ZIMBABWE_PROVINCES").filter((p) => p.slug !== "harare");

const HALF_W_M = 1848; // 3696m E-W -> 616 cells (14 * 44)
const HALF_H_M = 1320; // 2640m N-S -> 440 cells (10 * 44)

const fetchTile = createTileFetcher({
  userAgent: "AllAboutZimbabwe-3DVoxel/1.0 (https://allaboutzimbabwe.zw)",
  timeoutMs: 22000,
  rateLimitWaitMs: 14000,
  retryDelayMs: (attempt) => 900 * (attempt + 1),
});

async function fetchProvinceOSM(prov) {
  const dLat = 0.0125;
  const dLon = 0.0175;
  const bbox = {
    south: prov.lat - dLat,
    west: prov.lon - dLon,
    north: prov.lat + dLat,
    east: prov.lon + dLon,
  };

  const latStep = (bbox.north - bbox.south) / 2;
  const lonStep = (bbox.east - bbox.west) / 3;
  const tiles = [];
  for (let r = 0; r < 2; r++) {
    for (let c = 0; c < 3; c++) {
      tiles.push({
        south: bbox.south + r * latStep,
        north: bbox.south + (r + 1) * latStep,
        west: bbox.west + c * lonStep,
        east: bbox.west + (c + 1) * lonStep,
      });
    }
  }

  const nodes = new Map();
  const ways = new Map();

  for (const t of tiles) {
    collectElements(await fetchTile(t.south, t.west, t.north, t.east), nodes, ways);
  }

  return classifyCityWays(nodes, ways);
}

function voxelizeProvince(prov, raw, outDir) {
  const grid = createGrid({
    centerLat: prov.lat,
    centerLon: prov.lon,
    halfWM: HALF_W_M,
    halfHM: HALF_H_M,
  });
  const { gridW, gridH, surface, bHeight, bColor, bridgeH, treeH } = grid;
  const { idx, inBounds, latLonToMeters, metersToGrid, drawDisc, drawPolyline, fillPolygon } = grid;

  for (const w of raw.waters) {
    const ww = w.waterway;
    if (!ww) {
      fillPolygon(w.coords, (gx, gz) => {
        surface[idx(gx, gz)] = 0;
      });
    } else if (ww === "river" || ww === "canal") {
      drawPolyline(w.coords, ww === "river" ? 5.5 : 2.5, (gx, gz, r) => {
        drawDisc(surface, gx, gz, r, 0);
      });
    }
  }

  for (const p of raw.parks) {
    fillPolygon(p.coords, (gx, gz) => {
      const i = idx(gx, gz);
      if (surface[i] !== 0) {
        surface[i] = 2;
        const h = hashId(gx * 73856093 + gz * 19349663);
        if (h > 0.9 && gx % 2 === 0 && gz % 2 === 0) treeH[i] = 2;
      }
    });
  }

  for (let z = 3; z < gridH - 3; z += 4) {
    for (let x = 3; x < gridW - 3; x += 4) {
      const i = idx(x, z);
      const h = hashId(x * 83492791 + z * 2971215073);
      if (surface[i] === 1 && h > 0.925) treeH[i] = 2;
    }
  }

  for (const r of raw.roads) {
    const isMajor = ["motorway", "trunk", "primary", "motorway_link", "trunk_link"].includes(
      r.highway
    );
    const rad = isMajor ? 1.6 : r.highway === "secondary" ? 1.15 : 0.7;
    if (r.bridge) {
      drawPolyline(r.coords, rad, (gx, gz, rc) => {
        drawDisc(bridgeH, gx, gz, rc, 2);
      });
    } else {
      const val = isMajor ? 4 : 3;
      drawPolyline(r.coords, rad, (gx, gz, rc) => {
        drawDisc(surface, gx, gz, rc, val, (cur) => cur !== 0);
        drawDisc(treeH, gx, gz, rc, 0);
      });
    }
  }

  const isBulawayo = prov.slug === "bulawayo";
  const isManicaland = prov.slug === "manicaland";

  for (const b of raw.buildings) {
    const hHash = hashId(b.id);
    let meters = b.height || (b.levels ? b.levels * 3.4 : 0);
    if (!meters || Number.isNaN(meters)) {
      if (isBulawayo) {
        meters = hHash > 0.86 ? 18 + hHash * 22 : 6 + hHash * 10;
      } else {
        meters = hHash > 0.92 ? 15 + hHash * 16 : 4.5 + hHash * 7;
      }
    }
    const voxH = Math.max(2, Math.min(60, Math.round(meters / V_STEP_M)));

    let palIdx = hexToPaletteIndex(parseColorHex(b.colour));
    if (!palIdx) {
      if (voxH >= 9) {
        const tall = [9, 10, 11, 7, 8, 17];
        palIdx = tall[Math.floor(hHash * tall.length) % tall.length];
      } else if (isBulawayo) {
        const byo = [12, 13, 2, 3, 5, 1, 15];
        palIdx = byo[Math.floor(hHash * byo.length) % byo.length];
      } else if (isManicaland) {
        const mtr = [5, 6, 1, 2, 14, 15];
        palIdx = mtr[Math.floor(hHash * mtr.length) % mtr.length];
      } else {
        const gen = [1, 2, 3, 5, 13, 15, 7];
        palIdx = gen[Math.floor(hHash * gen.length) % gen.length];
      }
    }

    grid.fillBuilding(b.coords, voxH, palIdx);
  }

  if (Array.isArray(prov.rockFormations)) {
    for (const rock of prov.rockFormations) grid.stampDome(rock);
  }

  for (const lm of prov.landmarks || []) {
    if (lm.category === "landmark" || lm.category === "culture") {
      const [mx, mz] = latLonToMeters(lm.lat, lm.lon);
      const [cx, cz] = metersToGrid(mx, mz);
      const vox = Math.max(8, Math.min(48, Math.round(lm.elevationM / V_STEP_M)));
      for (let dz = -2; dz <= 2; dz++) {
        for (let dx = -2; dx <= 2; dx++) {
          if (Math.abs(dx) + Math.abs(dz) > 3) continue;
          const gx = cx + dx;
          const gz = cz + dz;
          if (!inBounds(gx, gz)) continue;
          const i = idx(gx, gz);
          const dist = Math.max(Math.abs(dx), Math.abs(dz));
          const h = dist === 0 ? vox : Math.max(5, Math.round(vox * (1 - dist * 0.18)));
          if (h > bHeight[i]) {
            bHeight[i] = h;
            bColor[i] = lm.category === "culture" ? 12 : 9;
          }
        }
      }
    }
  }

  const routes = routesFromRoads(grid, raw.roads, {
    minCoords: 3,
    include: (r) => r.bridge || ["motorway", "trunk", "primary", "secondary"].includes(r.highway),
    bridgeY: 7.5,
    minLen: 140,
    fallbackName: (r) => `${prov.capital} ${r.highway}`,
  }).slice(0, 55);

  writeWorld({
    outDir,
    binFile: `${prov.slug}.bin.gz`,
    metaFile: `${prov.slug}-meta.json`,
    grid,
    stats: {
      buildings: raw.buildings.length,
      roads: raw.roads.length,
      parks: raw.parks.length,
    },
    routes,
  });
}

// Usage: node scripts/build-all-provinces-voxels.mjs [--index-only] [slug ...]
// --index-only refetches OSM and rewrites only the search index, leaving world files alone.
async function main() {
  const outDir = path.join(process.cwd(), "public", "data", "cities");
  fs.mkdirSync(outDir, { recursive: true });

  const { flags, slugs } = parseArgs();
  const indexOnly = flags.has("--index-only");
  const targets = slugs.length ? PROVINCES.filter((p) => slugs.includes(p.slug)) : PROVINCES;

  console.log(
    `Building ${indexOnly ? "search indexes" : "real OSM 3D voxel worlds"} for ${targets.length} Zimbabwe provinces...`
  );

  for (let i = 0; i < targets.length; i++) {
    const pr = targets[i];
    const binPath = path.join(outDir, `${pr.slug}.bin.gz`);
    if (!indexOnly && fs.existsSync(binPath) && !slugs.length) {
      console.log(`[${i + 1}/${targets.length}] ${pr.province} (${pr.capital}) — cached, skipping`);
      continue;
    }
    const t0 = Date.now();
    const raw = await fetchProvinceOSM(pr);
    if (!indexOnly) voxelizeProvince(pr, raw, outDir);
    const places = placesFromOsm(raw);
    writeSearchIndex(pr.slug, places);
    console.log(
      `[${i + 1}/${targets.length}] ${pr.province} (${pr.capital}): ${raw.buildings.length} buildings, ${raw.roads.length} roads, ${places.length} search places (${Date.now() - t0}ms)`
    );
    await sleep(1000);
  }

  console.log(indexOnly ? "Province search indexes rebuilt." : "All Zimbabwean provinces voxelized!");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
