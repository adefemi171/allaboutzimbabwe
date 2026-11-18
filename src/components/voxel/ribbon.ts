import * as THREE from "three";

/** Flat strip of `width` metres following [x, z] points at height `y`. */
export function buildRibbonGeometry(
  points: [number, number][],
  width: number,
  y: number
): THREE.BufferGeometry {
  const positions: number[] = [];
  const half = width / 2;
  for (let i = 0; i < points.length - 1; i++) {
    const [x0, z0] = points[i];
    const [x1, z1] = points[i + 1];
    const len = Math.hypot(x1 - x0, z1 - z0);
    if (len === 0) continue;
    const nx = (-(z1 - z0) / len) * half;
    const nz = ((x1 - x0) / len) * half;
    positions.push(
      x0 + nx, y, z0 + nz, x0 - nx, y, z0 - nz, x1 + nx, y, z1 + nz,
      x1 + nx, y, z1 + nz, x0 - nx, y, z0 - nz, x1 - nx, y, z1 - nz
    );
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  return geometry;
}
