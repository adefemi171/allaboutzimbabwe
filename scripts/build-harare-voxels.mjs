import fs from "node:fs";
import path from "node:path";
import { placesFromOsm, writeSearchIndex } from "./search-index.mjs";
import {
  CELL_M,
  V_STEP_M,
  createGrid,
  hashId,
  hexToPaletteIndex,
  parseColorHex,
  routesFromRoads,
  writeWorld,
} from "./lib/voxel-build.mjs";

const RAW_PATH = path.join(process.cwd(), "data", "raw", "harare-osm-clean.json");
const OUT_DIR = path.join(process.cwd(), "public", "data");

const CENTER_LAT = -17.8292;
const CENTER_LON = 31.0522;

// 19,008 m E-W (3168 cells = 72 chunks of 44) x 12,672 m N-S (2112 cells = 48 chunks):
// CBD plus Borrowdale, Gletwyn, Shawasha Hills and Mount Pleasant.
const HALF_W_M = 9504;
const HALF_H_M = 6336;

// [lat, lon, radius in cells, height in voxels, palette index]
const SKYLINE_TOWERS = [
  [-17.8266, 31.0528, 3, 40, 9], // Reserve Bank of Zimbabwe, 120 m
  [-17.8322, 31.0468, 3, 35, 10], // Joina City, 105 m
  [-17.8308, 31.0534, 4, 16, 5], // Eastgate Centre
  [-17.8286, 31.0485, 3, 28, 7], // Meikles / Karigamombe
];

const KOPJE = { lat: -17.8358, lon: 31.0355, radiusM: 170, heightM: 54 };

function main() {
  if (!fs.existsSync(RAW_PATH)) {
    throw new Error(`Missing ${RAW_PATH}. Run fetch-harare-osm.mjs first.`);
  }
  const raw = JSON.parse(fs.readFileSync(RAW_PATH, "utf8"));
  console.log(`Loaded Harare OSM: ${raw.buildings.length} buildings, ${raw.roads.length} roads`);

  const grid = createGrid({
    centerLat: CENTER_LAT,
    centerLon: CENTER_LON,
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
    } else if (ww === "river" || ww === "canal" || ww === "stream") {
      drawPolyline(w.coords, ww === "river" ? 4.5 : 2, (gx, gz, r) => {
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
        if (h > 0.89 && gx % 2 === 0 && gz % 2 === 0) {
          treeH[i] = 2 + Math.floor((h * 100) % 2);
        }
      }
    });
  }

  // Street trees: everywhere north of the centre, plus the Avenues strip just south of it.
  for (let z = 4; z < gridH - 4; z += 3) {
    for (let x = 4; x < gridW - 4; x += 3) {
      const i = idx(x, z);
      if (surface[i] === 1) {
        const mx = x * CELL_M - HALF_W_M;
        const mz = z * CELL_M - HALF_H_M;
        const inAvenuesOrNorth = mz < -400 || (Math.abs(mx) < 1800 && mz < 400);
        const h = hashId(x * 83492791 + z * 2971215073);
        if (inAvenuesOrNorth && h > 0.925) {
          treeH[i] = 2;
        }
      }
    }
  }

  for (const r of raw.roads) {
    const isMajor = ["motorway", "trunk", "primary", "motorway_link", "trunk_link"].includes(
      r.highway
    );
    const rad = isMajor ? 1.7 : r.highway === "secondary" ? 1.2 : 0.75;
    if (r.bridge) {
      drawPolyline(r.coords, rad, (gx, gz, radC) => {
        drawDisc(bridgeH, gx, gz, radC, 2);
      });
    } else {
      const roadVal = isMajor ? 4 : 3;
      drawPolyline(r.coords, rad, (gx, gz, radC) => {
        drawDisc(surface, gx, gz, radC, roadVal, (cur) => cur !== 0);
        drawDisc(treeH, gx, gz, radC, 0);
      });
    }
  }

  let tallCount = 0;
  for (const b of raw.buildings) {
    const hHash = hashId(b.id);
    const [lat0, lon0] = b.coords[0];
    const [mx, mz] = latLonToMeters(lat0, lon0);

    let meters = b.height || (b.levels ? b.levels * 3.4 : 0);
    const isCBD = Math.abs(mx) < 1200 && Math.abs(mz) < 900;
    const isAvenues = mz < -700 && mz > -1800 && Math.abs(mx) < 1800;

    // OSM rarely has heights here, so guess one from the district.
    if (!meters || Number.isNaN(meters)) {
      if (isCBD) {
        meters = hHash > 0.82 ? 22 + hHash * 32 : 9 + hHash * 14;
      } else if (isAvenues) {
        meters = hHash > 0.85 ? 16 + hHash * 16 : 7 + hHash * 9;
      } else {
        meters = 4.5 + hHash * 7;
      }
    }

    const voxH = Math.max(2, Math.min(64, Math.round(meters / V_STEP_M)));
    if (voxH >= 8) tallCount++;

    let palIdx = hexToPaletteIndex(parseColorHex(b.colour));
    if (!palIdx) {
      if (voxH >= 10) {
        const glassChoices = [9, 10, 11, 7, 8, 17];
        palIdx = glassChoices[Math.floor(hHash * glassChoices.length) % glassChoices.length];
      } else if (isCBD) {
        const cbdChoices = [2, 5, 6, 7, 12, 13, 15];
        palIdx = cbdChoices[Math.floor(hHash * cbdChoices.length) % cbdChoices.length];
      } else {
        const genChoices = [1, 2, 3, 5, 6, 12, 13, 15];
        palIdx = genChoices[Math.floor(hHash * genChoices.length) % genChoices.length];
      }
    }

    grid.fillBuilding(b.coords, voxH, palIdx);
  }

  grid.stampDome(KOPJE);

  // OSM footprints alone leave the skyline flat, so the best-known towers are stamped in.
  for (const [lat, lon, radiusCells, heightVoxels, palIdx] of SKYLINE_TOWERS) {
    const [mx, mz] = latLonToMeters(lat, lon);
    const [cx, cz] = metersToGrid(mx, mz);
    for (let dz = -radiusCells; dz <= radiusCells; dz++) {
      for (let dx = -radiusCells; dx <= radiusCells; dx++) {
        if (Math.abs(dx) + Math.abs(dz) > radiusCells * 1.45) continue;
        const gx = cx + dx;
        const gz = cz + dz;
        if (!inBounds(gx, gz)) continue;
        const i = idx(gx, gz);
        const dist = Math.max(Math.abs(dx), Math.abs(dz));
        const h = dist === 0 ? heightVoxels : Math.max(8, Math.round(heightVoxels * (1 - dist * 0.14)));
        if (h > bHeight[i]) {
          bHeight[i] = h;
          bColor[i] = palIdx;
        }
      }
    }
  }

  const topRoutes = routesFromRoads(grid, raw.roads, {
    minCoords: 4,
    include: (r) => r.bridge || ["motorway", "trunk", "primary", "secondary"].includes(r.highway),
    bridgeY: 7.5,
    minLen: 180,
    fallbackName: (r) => `Harare ${r.highway}`,
  }).slice(0, 85);

  const bytes = writeWorld({
    outDir: OUT_DIR,
    binFile: "harare-world.bin.gz",
    metaFile: "harare-meta.json",
    grid,
    stats: {
      buildings: raw.buildings.length,
      tallBuildings: tallCount,
      roads: raw.roads.length,
      parks: raw.parks.length,
    },
    routes: topRoutes,
  });

  writeSearchIndex("harare", placesFromOsm(raw));

  console.log(
    `Built Harare voxel grid (${gridW}x${gridH} = ${grid.totalCells.toLocaleString()} cells, ${(
      bytes /
      1024 /
      1024
    ).toFixed(2)} MB) + ${topRoutes.length} transit routes.`
  );
}

main();
