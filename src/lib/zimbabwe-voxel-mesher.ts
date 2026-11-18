import * as THREE from "three";

/** Grid layout shared by the meta file and the parsed world. */
interface VoxelGridLayout {
  gridW: number;
  gridH: number;
  cellM: number;
  vStepM: number;
  halfWM: number;
  halfHM: number;
  centerLat: number;
  centerLon: number;
  palette: string[];
}

export interface VoxelGridData extends VoxelGridLayout {
  surface: Uint8Array;
  bHeight: Uint8Array;
  bColor: Uint8Array;
  bridgeH: Uint8Array;
  treeH: Uint8Array;
}

export interface RouteLine {
  name: string;
  kind: string;
  len?: number;
  pts: [number, number, number][];
}

export interface OsmPoi {
  id: number;
  name: string;
  lat: number;
  lon: number;
  kind: string;
}

export interface VoxelMeta extends VoxelGridLayout {
  stats: {
    buildings: number;
    tallBuildings?: number;
    roads: number;
    parks: number;
  };
  pois?: OsmPoi[];
  routes: RouteLine[];
}

export const CHUNK_CELLS = 44;

const M_PER_LAT = 110574;
const metersPerLon = (lat: number) => 111320 * Math.cos((lat * Math.PI) / 180);

/** Lat/lon to world [x, z] in metres from the world's centre; +z is south. */
export function latLonToWorldMeters(
  lat: number,
  lon: number,
  centerLat: number,
  centerLon: number
): [number, number] {
  return [(lon - centerLon) * metersPerLon(centerLat), -(lat - centerLat) * M_PER_LAT];
}

/** Inverse of latLonToWorldMeters; returns [lat, lon]. */
export function worldMetersToLatLon(
  x: number,
  z: number,
  centerLat: number,
  centerLon: number
): [number, number] {
  return [centerLat - z / M_PER_LAT, centerLon + x / metersPerLon(centerLat)];
}

export function parseVoxelBinary(buffer: ArrayBuffer, meta: VoxelMeta): VoxelGridData {
  const view = new DataView(buffer);
  const gridW = view.getUint16(4, true);
  const gridH = view.getUint16(6, true);
  const cellM = view.getUint16(8, true);
  const vStepM = view.getUint16(10, true);
  const total = gridW * gridH;

  const bytes = new Uint8Array(buffer, 16);
  const surface = new Uint8Array(total);
  const bHeight = new Uint8Array(total);
  const bColor = new Uint8Array(total);
  const bridgeH = new Uint8Array(total);
  const treeH = new Uint8Array(total);

  for (let i = 0; i < total; i++) {
    const off = i * 4;
    surface[i] = bytes[off];
    bHeight[i] = bytes[off + 1];
    bColor[i] = bytes[off + 2];
    const packed = bytes[off + 3];
    bridgeH[i] = (packed >> 4) & 0x0f;
    treeH[i] = packed & 0x0f;
  }

  return {
    gridW,
    gridH,
    cellM,
    vStepM,
    halfWM: meta.halfWM,
    halfHM: meta.halfHM,
    centerLat: meta.centerLat,
    centerLon: meta.centerLon,
    palette: meta.palette,
    surface,
    bHeight,
    bColor,
    bridgeH,
    treeH,
  };
}

function hexToRgbNorm(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

// Surface base colors: [1=land, 2=grass, 3=road, 4=arterial, 5=sand/riverbank]
const SURFACE_COLORS: Record<number, [number, number, number]> = {
  1: [0.25, 0.24, 0.22], // warm Highveld earth/urban ground
  2: [0.2, 0.43, 0.24],  // Harare Gardens / jacaranda park green
  3: [0.16, 0.17, 0.2],  // street asphalt
  4: [0.13, 0.14, 0.17], // major avenue / highway
  5: [0.64, 0.57, 0.44], // granite / Zambezi riverbank
};

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

function hashCell(gx: number, gz: number): number {
  const h = ((gx * 374761393 + gz * 668265263) ^ 0x5bf03635) >>> 0;
  return (h % 1000) / 1000;
}

type ChunkMeshLayer = "all" | "ground" | "features";

export function buildChunkGeometry(
  grid: VoxelGridData,
  cx: number,
  cz: number,
  paletteRgb: [number, number, number][],
  options?: { waterRgb?: [number, number, number]; layer?: ChunkMeshLayer }
): THREE.BufferGeometry | null {
  const layer: ChunkMeshLayer = options?.layer || "all";
  const wantGround = layer === "all" || layer === "ground";
  const wantFeatures = layer === "all" || layer === "features";
  const { gridW, gridH, cellM, vStepM, halfWM, halfHM, surface, bHeight, bColor, bridgeH, treeH } =
    grid;
  const waterRgb = options?.waterRgb;

  const startX = cx * CHUNK_CELLS;
  const startZ = cz * CHUNK_CELLS;
  const endX = Math.min(gridW, startX + CHUNK_CELLS);
  const endZ = Math.min(gridH, startZ + CHUNK_CELLS);

  const positions: number[] = [];
  const normals: number[] = [];
  const colors: number[] = [];
  const glows: number[] = [];
  const indices: number[] = [];

  let vCount = 0;

  function pushQuad(
    x0: number, y0: number, z0: number,
    x1: number, y1: number, z1: number,
    x2: number, y2: number, z2: number,
    x3: number, y3: number, z3: number,
    nx: number, ny: number, nz: number,
    r: number, g: number, b: number,
    gr: number, gg: number, gb: number
  ) {
    positions.push(x0, y0, z0, x1, y1, z1, x2, y2, z2, x3, y3, z3);
    normals.push(nx, ny, nz, nx, ny, nz, nx, ny, nz, nx, ny, nz);
    colors.push(r, g, b, r, g, b, r, g, b, r, g, b);
    glows.push(gr, gg, gb, gr, gg, gb, gr, gg, gb, gr, gg, gb);
    indices.push(vCount, vCount + 1, vCount + 2, vCount, vCount + 2, vCount + 3);
    vCount += 4;
  }

  function pushBox(
    wx0: number, wy0: number, wz0: number,
    wx1: number, wy1: number, wz1: number,
    r: number, g: number, b: number,
    topMult = 1.06,
    sideShade = 0.88,
    glow: [number, number, number] = [0, 0, 0],
    emitBottom = false
  ) {
    const tr = Math.min(1, r * topMult);
    const tg = Math.min(1, g * topMult);
    const tb = Math.min(1, b * topMult);
    pushQuad(wx0, wy1, wz1, wx1, wy1, wz1, wx1, wy1, wz0, wx0, wy1, wz0, 0, 1, 0, tr, tg, tb, 0, 0, 0);
    if (emitBottom) {
      pushQuad(wx0, wy0, wz0, wx1, wy0, wz0, wx1, wy0, wz1, wx0, wy0, wz1, 0, -1, 0, r * 0.6, g * 0.6, b * 0.6, 0, 0, 0);
    }
    pushQuad(wx1, wy0, wz0, wx0, wy0, wz0, wx0, wy1, wz0, wx1, wy1, wz0, 0, 0, -1, r * sideShade, g * sideShade, b * sideShade, glow[0], glow[1], glow[2]);
    pushQuad(wx0, wy0, wz1, wx1, wy0, wz1, wx1, wy1, wz1, wx0, wy1, wz1, 0, 0, 1, r * 0.94, g * 0.94, b * 0.94, glow[0], glow[1], glow[2]);
    pushQuad(wx0, wy0, wz0, wx0, wy0, wz1, wx0, wy1, wz1, wx0, wy1, wz0, -1, 0, 0, r * 0.82, g * 0.82, b * 0.82, glow[0], glow[1], glow[2]);
    pushQuad(wx1, wy0, wz1, wx1, wy0, wz0, wx1, wy1, wz0, wx1, wy1, wz1, 1, 0, 0, r * 0.9, g * 0.9, b * 0.9, glow[0], glow[1], glow[2]);
  }

  const landTopY = 1.6;
  const idx = (x: number, z: number) => z * gridW + x;

  for (let gz = startZ; gz < endZ; gz++) {
    const wz0 = gz * cellM - halfHM;
    const wz1 = wz0 + cellM;

    for (let gx = startX; gx < endX; gx++) {
      const i = idx(gx, gz);
      const s = surface[i];
      const bh = bHeight[i];
      const br = bridgeH[i];
      const th = treeH[i];

      if (s === 0 && bh === 0 && br === 0 && th === 0 && !waterRgb) continue;

      const wx0 = gx * cellM - halfWM;
      const wx1 = wx0 + cellM;
      const jitter = (hashCell(gx, gz) - 0.5) * 0.04;

      if (wantGround && s === 0 && waterRgb && bh === 0) {
        const wr = clamp01(waterRgb[0] + jitter * 0.35);
        const wg = clamp01(waterRgb[1] + jitter * 0.25);
        const wb = clamp01(waterRgb[2] + jitter * 0.15);
        const waterY = 0.95;
        pushQuad(
          wx0, waterY, wz1,
          wx1, waterY, wz1,
          wx1, waterY, wz0,
          wx0, waterY, wz0,
          0, 1, 0,
          wr, wg, wb,
          0.04, 0.14, 0.28
        );
        if (!wantFeatures && br === 0 && th === 0) continue;
      }

      if (wantGround && s !== 0) {
        const base = SURFACE_COLORS[s] || SURFACE_COLORS[1];
        const r = clamp01(base[0] + jitter);
        const g = clamp01(base[1] + jitter);
        const b = clamp01(base[2] + jitter);
        // A scattering of major-road cells glow warm, as street lamps.
        const streetLamp = s === 4 && hashCell(gx * 3, gz * 7) > 0.86;

        pushQuad(
          wx0, landTopY, wz1,
          wx1, landTopY, wz1,
          wx1, landTopY, wz0,
          wx0, landTopY, wz0,
          0, 1, 0,
          r, g, b,
          streetLamp ? 0.65 : 0,
          streetLamp ? 0.48 : 0,
          streetLamp ? 0.2 : 0
        );

        const nWater = gz > 0 ? surface[idx(gx, gz - 1)] === 0 : true;
        const sWater = gz < gridH - 1 ? surface[idx(gx, gz + 1)] === 0 : true;
        const wWater = gx > 0 ? surface[idx(gx - 1, gz)] === 0 : true;
        const eWater = gx < gridW - 1 ? surface[idx(gx + 1, gz)] === 0 : true;

        if (nWater) {
          pushQuad(wx1, 0, wz0, wx0, 0, wz0, wx0, landTopY, wz0, wx1, landTopY, wz0, 0, 0, -1, r * 0.72, g * 0.72, b * 0.72, 0, 0, 0);
        }
        if (sWater) {
          pushQuad(wx0, 0, wz1, wx1, 0, wz1, wx1, landTopY, wz1, wx0, landTopY, wz1, 0, 0, 1, r * 0.82, g * 0.82, b * 0.82, 0, 0, 0);
        }
        if (wWater) {
          pushQuad(wx0, 0, wz0, wx0, 0, wz1, wx0, landTopY, wz1, wx0, landTopY, wz0, -1, 0, 0, r * 0.7, g * 0.7, b * 0.7, 0, 0, 0);
        }
        if (eWater) {
          pushQuad(wx1, 0, wz1, wx1, 0, wz0, wx1, landTopY, wz0, wx1, landTopY, wz1, 1, 0, 0, r * 0.78, g * 0.78, b * 0.78, 0, 0, 0);
        }
      }

      if (!wantFeatures) continue;

      if (bh > 0) {
        const topY = landTopY + bh * vStepM;
        const pal = paletteRgb[bColor[i]] || paletteRgb[1];
        const r = clamp01(pal[0] + jitter * 0.7);
        const g = clamp01(pal[1] + jitter * 0.7);
        const b = clamp01(pal[2] + jitter * 0.7);

        const winSeed = hashCell(gx * 13 + bh, gz * 17);
        const isLit = winSeed > 0.42;
        const glowR = isLit ? (winSeed > 0.82 ? 0.55 : 0.85) : 0.05;
        const glowG = isLit ? (winSeed > 0.82 ? 0.82 : 0.62) : 0.04;
        const glowB = isLit ? (winSeed > 0.82 ? 0.95 : 0.28) : 0.02;

        const roofShade = bh >= 10 ? 0.95 : 1.04;
        pushQuad(
          wx0, topY, wz1,
          wx1, topY, wz1,
          wx1, topY, wz0,
          wx0, topY, wz0,
          0, 1, 0,
          Math.min(1, r * roofShade),
          Math.min(1, g * roofShade),
          Math.min(1, b * roofShade),
          0, 0, 0
        );

        const nH = gz > 0 ? bHeight[idx(gx, gz - 1)] : 0;
        const sH = gz < gridH - 1 ? bHeight[idx(gx, gz + 1)] : 0;
        const wH = gx > 0 ? bHeight[idx(gx - 1, gz)] : 0;
        const eH = gx < gridW - 1 ? bHeight[idx(gx + 1, gz)] : 0;

        if (bh > nH) {
          const bot = landTopY + nH * vStepM;
          pushQuad(wx1, bot, wz0, wx0, bot, wz0, wx0, topY, wz0, wx1, topY, wz0, 0, 0, -1, r * 0.78, g * 0.78, b * 0.78, glowR * 0.7, glowG * 0.7, glowB * 0.7);
        }
        if (bh > sH) {
          const bot = landTopY + sH * vStepM;
          pushQuad(wx0, bot, wz1, wx1, bot, wz1, wx1, topY, wz1, wx0, topY, wz1, 0, 0, 1, r * 0.96, g * 0.96, b * 0.96, glowR, glowG, glowB);
        }
        if (bh > wH) {
          const bot = landTopY + wH * vStepM;
          pushQuad(wx0, bot, wz0, wx0, bot, wz1, wx0, topY, wz1, wx0, topY, wz0, -1, 0, 0, r * 0.74, g * 0.74, b * 0.74, glowR * 0.75, glowG * 0.75, glowB * 0.75);
        }
        if (bh > eH) {
          const bot = landTopY + eH * vStepM;
          pushQuad(wx1, bot, wz1, wx1, bot, wz0, wx1, topY, wz0, wx1, topY, wz1, 1, 0, 0, r * 0.88, g * 0.88, b * 0.88, glowR * 0.9, glowG * 0.9, glowB * 0.9);
        }
      }

      if (br > 0) {
        const deckBot = br * vStepM;
        const deckTop = deckBot + 1.8;
        const isLamp = (gx + gz) % 4 === 0;
        pushBox(
          wx0, deckBot, wz0,
          wx1, deckTop, wz1,
          0.28, 0.3, 0.34,
          1.12,
          0.8,
          isLamp ? [0.95, 0.65, 0.22] : [0, 0, 0],
          true
        );
        if (gx % 6 === 0 && gz % 6 === 0) {
          pushBox(
            wx0 + 1.5, 0, wz0 + 1.5,
            wx1 - 1.5, deckBot, wz1 - 1.5,
            0.55, 0.54, 0.52,
            1.0,
            0.85
          );
        }
      }

      // Trees: about a quarter are purple jacarandas, the rest green acacias.
      if (th > 0 && bh === 0) {
        const trunkTop = landTopY + 2.8;
        const crownTop = trunkTop + th * 2.1;
        pushBox(
          wx0 + 2.1, landTopY, wz0 + 2.1,
          wx1 - 2.1, trunkTop, wz1 - 2.1,
          0.38, 0.26, 0.16,
          1.0,
          0.85
        );
        const tSeed = hashCell(gx * 5, gz * 11);
        const isJacaranda = tSeed > 0.72;
        const cr = isJacaranda ? 0.48 : 0.18 + tSeed * 0.1;
        const cg = isJacaranda ? 0.34 : 0.44 + tSeed * 0.12;
        const cb = isJacaranda ? 0.66 : 0.21 + tSeed * 0.05;
        pushBox(
          wx0 + 0.4, trunkTop, wz0 + 0.4,
          wx1 - 0.4, crownTop, wz1 - 0.4,
          cr, cg, cb,
          1.12,
          0.82
        );
      }
    }
  }

  if (positions.length === 0) return null;

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
  geo.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  geo.setAttribute("aGlow", new THREE.Float32BufferAttribute(glows, 3));
  geo.setIndex(indices);
  geo.computeBoundingSphere();
  return geo;
}

export function buildPaletteRgb(palette: string[]): [number, number, number][] {
  return palette.map((hex) => hexToRgbNorm(hex));
}
