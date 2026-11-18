import * as THREE from "three";
import {
  fetchImageryTile,
  latToTileY,
  lonToTileX,
  MAX_IMAGERY_ZOOM,
  tileXToLon,
  tileYToLat,
  zoomForResolution,
} from "@/lib/esri-imagery";
import { latLonToWorldMeters, worldMetersToLatLon } from "@/lib/zimbabwe-voxel-mesher";

export type MapStyleMode = "voxel" | "satellite" | "hybrid";

const GROUND_Y = 1.52;
/** Detail tiles are loaded in a (2r+1)² block around the focus point. */
const FULL = { baseTiles: 48, detailRadius: 2, maxDetailTiles: 180, parallelLoads: 8 };
/** Phones: under half the texture memory and fewer downloads at once. */
const LITE = { baseTiles: 24, detailRadius: 2, maxDetailTiles: 80, parallelLoads: 6 };
const UPDATE_INTERVAL_MS = 200;

interface Tile {
  mesh: THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial> | null;
  zoom: number;
  pinned: boolean;
  lastWanted: number;
}

/**
 * Satellite ground for the voxel world: a base layer covering the whole map plus
 * sharper tiles streamed in around the camera focus as the user zooms in.
 * Tiles never write depth and are drawn coarse-to-fine, so finer levels simply
 * paint over coarser ones without z-fighting.
 */
export class SatelliteGround {
  readonly group = new THREE.Group();

  private readonly tiles = new Map<string, Tile>();
  private readonly queue: { key: string; zoom: number; x: number; y: number }[] = [];
  private readonly abort = new AbortController();
  private readonly planeGeo = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
  private readonly baseZoom: number;
  private readonly budget: typeof FULL;
  private activeLoads = 0;
  private lastUpdate = 0;
  private brightness = 1;
  private baseSettled: ((ok: boolean) => void) | null = null;
  private basePending = 0;
  private baseLoaded = 0;

  constructor(
    private readonly opts: {
      centerLat: number;
      centerLon: number;
      halfWM: number;
      halfHM: number;
      anisotropy: number;
      lite: boolean;
    }
  ) {
    this.group.name = "satellite-ground";
    this.group.visible = false;
    this.budget = opts.lite ? LITE : FULL;

    let zoom = 16;
    for (; zoom > 10; zoom--) {
      const [x0, y0, x1, y1] = this.tileRange(zoom, -opts.halfWM, -opts.halfHM, opts.halfWM, opts.halfHM);
      if ((x1 - x0 + 1) * (y1 - y0 + 1) <= this.budget.baseTiles) break;
    }
    this.baseZoom = zoom;
  }

  /**
   * Loads the whole-map layer (plus a one-tile margin). Resolves once it has
   * settled: false when no imagery could be fetched at all.
   */
  loadBase(): Promise<boolean> {
    const { halfWM, halfHM } = this.opts;
    const [x0, y0, x1, y1] = this.tileRange(this.baseZoom, -halfWM, -halfHM, halfWM, halfHM);
    return new Promise((resolve) => {
      this.baseSettled = resolve;
      for (let y = y0 - 1; y <= y1 + 1; y++) {
        for (let x = x0 - 1; x <= x1 + 1; x++) {
          this.basePending++;
          this.request(this.baseZoom, x, y, true);
        }
      }
    });
  }

  /**
   * Stream detail around a focus point (world metres). `viewDistM` is how far the
   * camera is from that point; closer views ask for deeper zoom levels.
   */
  update(focusX: number, focusZ: number, viewDistM: number, now: number): void {
    if (now - this.lastUpdate < UPDATE_INTERVAL_MS) return;
    this.lastUpdate = now;

    // ~1000 px of screen across the view distance.
    const wanted = Math.min(
      MAX_IMAGERY_ZOOM,
      zoomForResolution(viewDistM / 1000, this.opts.centerLat)
    );
    const [lat, lon] = worldMetersToLatLon(focusX, focusZ, this.opts.centerLat, this.opts.centerLon);

    // The loader takes the newest request first, so asking for the wide, coarse
    // ring last gets context on screen before the sharpest tiles arrive.
    for (const zoom of [wanted, wanted - 2]) {
      if (zoom <= this.baseZoom) continue;
      const cx = Math.floor(lonToTileX(lon, zoom));
      const cy = Math.floor(latToTileY(lat, zoom));
      const r = this.budget.detailRadius;
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          const tile = this.request(zoom, cx + dx, cy + dy, false);
          tile.lastWanted = now;
        }
      }
    }
    this.evict();
  }

  /** Dim the imagery (0–1) so it follows the scene's time of day. */
  setBrightness(value: number): void {
    if (Math.abs(value - this.brightness) < 0.02) return;
    this.brightness = value;
    for (const tile of this.tiles.values()) tile.mesh?.material.color.setScalar(value);
  }

  dispose(): void {
    this.abort.abort();
    this.queue.length = 0;
    for (const tile of this.tiles.values()) this.disposeMesh(tile);
    this.tiles.clear();
    this.planeGeo.dispose();
    this.baseSettled?.(false);
  }

  private tileRange(zoom: number, minX: number, minZ: number, maxX: number, maxZ: number) {
    const { centerLat, centerLon } = this.opts;
    const [north, west] = worldMetersToLatLon(minX, minZ, centerLat, centerLon);
    const [south, east] = worldMetersToLatLon(maxX, maxZ, centerLat, centerLon);
    return [
      Math.floor(lonToTileX(west, zoom)),
      Math.floor(latToTileY(north, zoom)),
      Math.floor(lonToTileX(east, zoom)),
      Math.floor(latToTileY(south, zoom)),
    ] as const;
  }

  private request(zoom: number, x: number, y: number, pinned: boolean): Tile {
    const key = `${zoom}/${x}/${y}`;
    let tile = this.tiles.get(key);
    if (!tile) {
      tile = { mesh: null, zoom, pinned, lastWanted: 0 };
      this.tiles.set(key, tile);
      this.queue.push({ key, zoom, x, y });
      this.pump();
    }
    return tile;
  }

  private pump(): void {
    while (this.activeLoads < this.budget.parallelLoads && this.queue.length > 0) {
      // Newest request first: the user's current view beats a stale backlog.
      const job = this.queue.pop()!;
      const tile = this.tiles.get(job.key);
      if (!tile) continue;
      this.activeLoads++;
      void fetchImageryTile(job.zoom, job.x, job.y, this.abort.signal).then((bitmap) => {
        this.activeLoads--;
        if (this.abort.signal.aborted) {
          bitmap?.close();
          return;
        }
        // Evicted while loading: drop the result. A missing tile keeps its empty
        // entry so the same hole is not requested again.
        if (bitmap && this.tiles.get(job.key) === tile) this.attach(tile, job, bitmap);
        else bitmap?.close();
        if (tile.pinned) {
          if (tile.mesh) this.baseLoaded++;
          if (--this.basePending === 0) this.baseSettled?.(this.baseLoaded > 0);
        }
        this.pump();
      });
    }
  }

  private attach(tile: Tile, job: { zoom: number; x: number; y: number }, bitmap: ImageBitmap) {
    const { centerLat, centerLon } = this.opts;
    const [west, north] = latLonToWorldMeters(
      tileYToLat(job.y, job.zoom),
      tileXToLon(job.x, job.zoom),
      centerLat,
      centerLon
    );
    const [east, south] = latLonToWorldMeters(
      tileYToLat(job.y + 1, job.zoom),
      tileXToLon(job.x + 1, job.zoom),
      centerLat,
      centerLon
    );

    // Drawn through a canvas so the texture keeps three's default orientation.
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    canvas.getContext("2d")?.drawImage(bitmap, 0, 0);
    bitmap.close();

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = this.opts.anisotropy;

    const material = new THREE.MeshBasicMaterial({
      map: texture,
      toneMapped: false,
      depthWrite: false,
    });
    material.color.setScalar(this.brightness);

    const mesh = new THREE.Mesh(this.planeGeo, material);
    mesh.scale.set(east - west, 1, south - north);
    mesh.position.set((west + east) / 2, GROUND_Y, (north + south) / 2);
    mesh.renderOrder = job.zoom - 100;
    tile.mesh = mesh;
    this.group.add(mesh);
  }

  private evict(): void {
    const detail = [...this.tiles.entries()].filter(([, t]) => !t.pinned);
    const max = this.budget.maxDetailTiles;
    if (detail.length <= max) return;
    detail.sort((a, b) => a[1].lastWanted - b[1].lastWanted);
    for (const [key, tile] of detail.slice(0, detail.length - max)) {
      this.disposeMesh(tile);
      this.tiles.delete(key);
    }
  }

  private disposeMesh(tile: Tile): void {
    if (!tile.mesh) return;
    this.group.remove(tile.mesh);
    tile.mesh.material.map?.dispose();
    tile.mesh.material.dispose();
    tile.mesh = null;
  }
}
