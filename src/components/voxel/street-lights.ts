import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { RouteLine, VoxelGridData } from "@/lib/zimbabwe-voxel-mesher";

/** Route points float this far above the road surface they follow. */
export const ROUTE_HEIGHT_ABOVE_ROAD = 1.6;

const SPACING_M = 38;
const KERB_OFFSET_M = 6;
const POLE_HEIGHT_M = 8;
const ARM_REACH_M = 2.2;
const MAX_LAMPS = 6000;
const LAMP_COLOR = new THREE.Color(0xffd9a0);
const LAMP_OFF_COLOR = new THREE.Color(0x70757c);

/** Real lights are costly, so only the lamps nearest a low camera get one (fewer on phones). */
const NEAR_LIGHTS = 4;
const NEAR_LIGHTS_LITE = 2;
const NEAR_LIGHT_RANGE_M = 140;
const NEAR_LIGHT_MAX_CAMERA_Y = 160;
const NEAR_LIGHT_REFRESH_MS = 300;

/** Soft white disc used for light pooling on the road (lamps and headlights). */
function makeGlowTexture(): THREE.CanvasTexture {
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, "rgba(255,255,255,1)");
  gradient.addColorStop(0.35, "rgba(255,255,255,0.45)");
  gradient.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  return new THREE.CanvasTexture(canvas);
}

/**
 * Street lamps along every road route: instanced poles, lamp heads that switch on
 * at dusk, a pool of light on the road under each, and a few real point lights
 * that follow the camera at street level so nearby buildings are actually lit.
 */
export class StreetLights {
  readonly group = new THREE.Group();
  /** Shared with vehicle headlights so every light pool fades with the same dusk. */
  readonly poolMaterial: THREE.MeshBasicMaterial;

  private readonly headMaterial = new THREE.MeshBasicMaterial({ toneMapped: false });
  private readonly poleMaterial = new THREE.MeshLambertMaterial({ color: 0x3b4149 });
  private readonly meshes: THREE.InstancedMesh[];
  private readonly nearLights: THREE.PointLight[] = [];
  /** xyz of each lamp head, for picking the lamps nearest the camera. */
  private readonly heads: Float32Array;
  private lastNearRefresh = 0;

  constructor(routes: RouteLine[], grid: VoxelGridData, lite: boolean) {
    this.group.name = "street-lights";
    this.poolMaterial = new THREE.MeshBasicMaterial({
      map: makeGlowTexture(),
      color: LAMP_COLOR,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -4,
      toneMapped: false,
    });

    const lamps = placeLamps(routes, grid);
    this.heads = new Float32Array(lamps.length * 3);

    const pole = mergeGeometries([
      new THREE.BoxGeometry(0.35, POLE_HEIGHT_M, 0.35).translate(0, POLE_HEIGHT_M / 2, 0),
      new THREE.BoxGeometry(0.22, 0.22, ARM_REACH_M).translate(0, POLE_HEIGHT_M, ARM_REACH_M / 2),
    ]);
    const head = new THREE.BoxGeometry(0.7, 0.28, 1.1).translate(0, POLE_HEIGHT_M - 0.2, ARM_REACH_M);
    const pool = new THREE.CircleGeometry(12, 20)
      .rotateX(-Math.PI / 2)
      .translate(0, 0.3, ARM_REACH_M);

    const poles = new THREE.InstancedMesh(pole, this.poleMaterial, lamps.length);
    const headMesh = new THREE.InstancedMesh(head, this.headMaterial, lamps.length);
    const pools = new THREE.InstancedMesh(pool, this.poolMaterial, lamps.length);

    const dummy = new THREE.Object3D();
    lamps.forEach((lamp, i) => {
      dummy.position.set(lamp.x, lamp.y, lamp.z);
      // Local +Z is the arm, pointed back at the road centre line.
      dummy.rotation.y = Math.atan2(lamp.toRoadX, lamp.toRoadZ);
      dummy.updateMatrix();
      poles.setMatrixAt(i, dummy.matrix);
      headMesh.setMatrixAt(i, dummy.matrix);
      pools.setMatrixAt(i, dummy.matrix);
      this.heads.set(
        [
          lamp.x + lamp.toRoadX * ARM_REACH_M,
          lamp.y + POLE_HEIGHT_M - 0.6,
          lamp.z + lamp.toRoadZ * ARM_REACH_M,
        ],
        i * 3
      );
    });
    this.meshes = [poles, headMesh, pools];
    for (const mesh of this.meshes) {
      mesh.instanceMatrix.needsUpdate = true;
      mesh.computeBoundingSphere();
      this.group.add(mesh);
    }

    for (let i = 0; i < (lite ? NEAR_LIGHTS_LITE : NEAR_LIGHTS); i++) {
      const light = new THREE.PointLight(LAMP_COLOR, 0, 70, 2);
      this.nearLights.push(light);
      this.group.add(light);
    }
  }

  /** `night` is 0 (day) to 1 (full dark). */
  update(night: number, camera: THREE.Camera, now: number): void {
    this.poolMaterial.opacity = night * 0.5;
    this.headMaterial.color.lerpColors(LAMP_OFF_COLOR, LAMP_COLOR, night);

    if (now - this.lastNearRefresh < NEAR_LIGHT_REFRESH_MS) return;
    this.lastNearRefresh = now;

    const { x: cx, y: cy, z: cz } = camera.position;
    const nearest: { index: number; dist: number }[] = [];
    if (night > 0.05 && cy < NEAR_LIGHT_MAX_CAMERA_Y) {
      for (let i = 0; i < this.heads.length; i += 3) {
        const dist = Math.hypot(this.heads[i] - cx, this.heads[i + 2] - cz);
        if (dist > NEAR_LIGHT_RANGE_M) continue;
        nearest.push({ index: i, dist });
      }
      nearest.sort((a, b) => a.dist - b.dist);
    }
    this.nearLights.forEach((light, i) => {
      const lamp = nearest[i];
      light.intensity = lamp ? 90 * night : 0;
      if (lamp) light.position.fromArray(this.heads, lamp.index);
    });
  }

  dispose(): void {
    for (const mesh of this.meshes) {
      mesh.geometry.dispose();
      mesh.dispose();
    }
    this.poolMaterial.map?.dispose();
    for (const material of [this.poolMaterial, this.headMaterial, this.poleMaterial]) {
      material.dispose();
    }
  }
}

interface Lamp {
  x: number;
  y: number;
  z: number;
  /** Unit vector from the lamp toward the road centre line. */
  toRoadX: number;
  toRoadZ: number;
}

/** Walk each road, dropping a lamp every SPACING_M on alternating kerbs. */
function placeLamps(routes: RouteLine[], grid: VoxelGridData): Lamp[] {
  const lamps: Lamp[] = [];
  const isFree = (x: number, z: number) => {
    const gx = Math.floor((x + grid.halfWM) / grid.cellM);
    const gz = Math.floor((z + grid.halfHM) / grid.cellM);
    if (gx < 0 || gx >= grid.gridW || gz < 0 || gz >= grid.gridH) return false;
    const cell = gz * grid.gridW + gx;
    // Not inside a building and not out on open water.
    return grid.bHeight[cell] === 0 && grid.surface[cell] !== 0;
  };

  for (const route of routes) {
    if (route.kind === "ferry") continue;
    let untilNext = SPACING_M / 2;
    let side = 1;
    for (let i = 0; i < route.pts.length - 1 && lamps.length < MAX_LAMPS; i++) {
      const [x0, y0, z0] = route.pts[i];
      const [x1, , z1] = route.pts[i + 1];
      const segLen = Math.hypot(x1 - x0, z1 - z0);
      if (segLen === 0) continue;
      const dirX = (x1 - x0) / segLen;
      const dirZ = (z1 - z0) / segLen;

      let along = untilNext;
      for (; along <= segLen && lamps.length < MAX_LAMPS; along += SPACING_M) {
        // Perpendicular to travel, flipped each lamp so kerbs alternate.
        const outX = -dirZ * side;
        const outZ = dirX * side;
        const x = x0 + dirX * along + outX * KERB_OFFSET_M;
        const z = z0 + dirZ * along + outZ * KERB_OFFSET_M;
        side = -side;
        if (!isFree(x, z)) continue;
        lamps.push({ x, y: y0 - ROUTE_HEIGHT_ABOVE_ROAD, z, toRoadX: -outX, toRoadZ: -outZ });
      }
      untilNext = along - segLen;
    }
  }
  return lamps;
}
