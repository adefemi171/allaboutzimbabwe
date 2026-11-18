/** Shared pieces of the three.js globes (home fly-in, atlas, satellite tracker). */
import * as THREE from "three";

export const HARARE = { lat: -17.83, lon: 31.05 };

/** Point on a sphere whose texture is an equirectangular map with lon -180 at u = 0. */
export function latLonToVec3(lat: number, lon: number, radius: number): THREE.Vector3 {
  const phi = ((90 - lat) * Math.PI) / 180;
  const theta = ((lon + 180) * Math.PI) / 180;
  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta)
  );
}

/** Rotation that turns a globe so the given point faces a camera on +Z, tilted slightly toward it. */
export function rotationFacing(lat: number, lon: number): { x: number; y: number } {
  return {
    x: (lat * Math.PI) / 180 + 0.02,
    y: (-lon * Math.PI) / 180 - Math.PI / 2,
  };
}

type Outline = [lon: number, lat: number][];

const AFRICA: Outline = [
  [-17.5, 14.7], [-16.0, 21.0], [-13.2, 27.6], [-5.5, 35.8], [10.0, 36.8],
  [11.0, 33.0], [22.0, 32.0], [32.3, 31.2], [35.0, 28.0], [43.0, 12.5],
  [51.3, 11.9], [45.0, 2.0], [40.5, -4.5], [35.0, -16.0], [32.9, -26.0],
  [28.0, -33.0], [20.0, -34.8], [18.3, -33.9], [14.5, -22.0], [12.0, -15.0],
  [12.5, -6.0], [9.4, 0.4], [9.6, 3.8], [8.5, 4.5], [6.4, 4.3], [3.4, 6.4],
  [1.2, 6.1], [-4.0, 5.2], [-7.8, 4.4], [-13.2, 8.5], [-17.5, 14.7],
];

export const ZIMBABWE_OUTLINE: Outline = [
  [25.24, -17.8], [26.8, -17.95], [28.0, -17.0], [28.9, -16.5],
  [30.4, -15.6], [31.9, -16.4], [32.95, -17.2], [32.85, -18.8],
  [33.05, -20.0], [32.45, -21.3], [31.3, -22.35], [29.9, -22.2],
  [28.0, -21.6], [26.7, -20.4], [25.24, -18.9], [25.24, -17.8],
];

const EUROPE: Outline = [
  [-9.3, 38.7], [-9.0, 43.0], [-1.8, 43.4], [-4.5, 48.4], [2.0, 51.0],
  [8.5, 54.0], [10.5, 57.7], [5.0, 60.5], [15.0, 68.5], [28.0, 71.0],
  [40.0, 66.0], [38.0, 46.0], [29.0, 41.0], [23.7, 38.0], [15.0, 38.0],
  [12.5, 41.9], [5.0, 43.3], [-5.3, 36.1], [-9.3, 38.7],
];

const MADAGASCAR: Outline = [
  [49.3, -12.0], [50.4, -15.6], [47.5, -25.0], [44.0, -25.2],
  [43.3, -21.0], [44.5, -17.0], [47.2, -14.0], [49.3, -12.0],
];

const ZAMBEZI: Outline = [
  [23.2, -16.5], [25.85, -17.92], [28.76, -16.52], [30.4, -15.6], [35.8, -18.5],
];

/** Hand-drawn equirectangular Earth: dark sea, graticule, rough continents, Zimbabwe highlighted. */
export function buildStylizedEarthTexture(): THREE.CanvasTexture {
  const w = 2048;
  const h = 1024;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;

  ctx.fillStyle = "#101310";
  ctx.fillRect(0, 0, w, h);

  const toX = (lon: number) => ((lon + 180) / 360) * w;
  const toY = (lat: number) => ((90 - lat) / 180) * h;
  const trace = (line: Outline) => {
    ctx.beginPath();
    line.forEach(([lon, lat], i) => {
      if (i === 0) ctx.moveTo(toX(lon), toY(lat));
      else ctx.lineTo(toX(lon), toY(lat));
    });
  };

  ctx.strokeStyle = "rgba(164, 170, 162, 0.08)";
  ctx.lineWidth = 1;
  for (let lon = -180; lon <= 180; lon += 15) {
    trace([[lon, 90], [lon, -90]]);
    ctx.stroke();
  }
  for (let lat = -75; lat <= 75; lat += 15) {
    trace([[-180, lat], [180, lat]]);
    ctx.stroke();
  }

  const land = (outline: Outline, fill: string, stroke: string, lineWidth: number) => {
    trace(outline);
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lineWidth;
    ctx.stroke();
  };
  land(AFRICA, "#2a2f2a", "rgba(164, 170, 162, 0.25)", 2);
  land(MADAGASCAR, "#2a2f2a", "rgba(164, 170, 162, 0.2)", 1.5);
  land(EUROPE, "#232723", "rgba(164, 170, 162, 0.18)", 1.5);
  land(ZIMBABWE_OUTLINE, "#4cb82a", "#ffd200", 3);

  trace(ZAMBEZI);
  ctx.strokeStyle = "rgba(98, 180, 232, 0.65)";
  ctx.lineWidth = 2;
  ctx.stroke();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/** A marker dot with a flat halo ring lying on the sphere, both at `position`. */
export function makeBeacon(
  position: THREE.Vector3,
  radius: number,
  color: THREE.ColorRepresentation,
  haloOpacity: number
): { dot: THREE.Mesh; halo: THREE.Mesh<THREE.RingGeometry, THREE.MeshBasicMaterial> } {
  const dot = new THREE.Mesh(
    new THREE.SphereGeometry(radius, 12, 12),
    new THREE.MeshBasicMaterial({ color })
  );
  dot.position.copy(position);

  const halo = new THREE.Mesh(
    new THREE.RingGeometry(radius * 1.25, radius * 2.2, 20),
    new THREE.MeshBasicMaterial({
      color,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: haloOpacity,
    })
  );
  // Lifted a hair off the surface so it does not z-fight the globe.
  halo.position.copy(position).multiplyScalar(1.003);
  halo.lookAt(position.clone().multiplyScalar(2));

  return { dot, halo };
}

/**
 * Frees a scene's GPU resources and its WebGL context. renderer.dispose()
 * alone leaves geometries, materials and textures alive, and browsers cap
 * the number of live contexts.
 */
export function disposeScene(scene: THREE.Scene, renderer: THREE.WebGLRenderer) {
  scene.traverse((object) => {
    const { geometry, material } = object as THREE.Mesh;
    geometry?.dispose();
    for (const m of Array.isArray(material) ? material : material ? [material] : []) {
      (m as THREE.MeshStandardMaterial).map?.dispose();
      m.dispose();
    }
  });
  renderer.dispose();
  renderer.forceContextLoss();
}
