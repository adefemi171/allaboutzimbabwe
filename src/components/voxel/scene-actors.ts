import * as THREE from "three";
import type { RouteLine } from "@/lib/zimbabwe-voxel-mesher";

export type VehicleKind = "kombi" | "zupco" | "car" | "ferry";

export interface VehicleInstance {
  mesh: THREE.Group;
  route: RouteLine;
  kind: VehicleKind;
  progress: number;
  speedMps: number;
  segLengths: number[];
  totalLen: number;
}

export interface PedestrianInstance {
  mesh: THREE.Group;
  leftLeg: THREE.Mesh;
  rightLeg: THREE.Mesh;
  leftArm: THREE.Mesh;
  rightArm: THREE.Mesh;
  route: RouteLine;
  label: string;
  progress: number;
  dirSign: 1 | -1;
  sideOffset: number;
  speedMps: number;
  stridePhase: number;
  segLengths: number[];
  totalLen: number;
}

/** Name shown in the ride HUD. */
export function vehicleLabel(kind: VehicleKind, city: string): string {
  if (kind === "kombi") return `${city} Kombi`;
  if (kind === "zupco") return "ZUPCO Bus";
  if (kind === "ferry") return "Zambezi Boat";
  return "City Car";
}

const BEAM_GEOMETRY = new THREE.CircleGeometry(1, 16).rotateX(-Math.PI / 2);
const TAIL_LIGHT_MATERIAL = new THREE.MeshBasicMaterial({ color: 0xdc2626 });

/**
 * `beamMaterial` paints the headlight pool on the road ahead; the caller fades it
 * with the time of day (it is the street lamps' pool material).
 */
export function buildVehicleMesh(kind: VehicleKind, beamMaterial: THREE.Material): THREE.Group {
  const g = new THREE.Group();
  if (kind === "kombi") {
    // Classic white Zimbabwe Kombi minibus with emerald/gold transit stripe
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(2.5, 2.3, 5.2),
      new THREE.MeshLambertMaterial({ color: 0xf4f4f5 })
    );
    body.position.y = 1.35;
    g.add(body);
    const stripe = new THREE.Mesh(
      new THREE.BoxGeometry(2.56, 0.42, 5.24),
      new THREE.MeshLambertMaterial({ color: 0x4cb82a })
    );
    stripe.position.y = 1.2;
    g.add(stripe);
    const cabin = new THREE.Mesh(
      new THREE.BoxGeometry(2.3, 0.85, 3.6),
      new THREE.MeshLambertMaterial({ color: 0x1f2937 })
    );
    cabin.position.set(0, 2.05, -0.2);
    g.add(cabin);
  } else if (kind === "zupco") {
    // ZUPCO green & gold metro coach
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(2.8, 3.1, 10.5),
      new THREE.MeshLambertMaterial({ color: 0x059669 })
    );
    body.position.y = 1.8;
    g.add(body);
    const roof = new THREE.Mesh(
      new THREE.BoxGeometry(2.4, 0.35, 9.6),
      new THREE.MeshLambertMaterial({ color: 0xfacc15 })
    );
    roof.position.y = 3.5;
    g.add(roof);
  } else if (kind === "ferry") {
    const hull = new THREE.Mesh(
      new THREE.BoxGeometry(5.2, 1.4, 14.0),
      new THREE.MeshLambertMaterial({ color: 0xf8fafc })
    );
    hull.position.y = 0.7;
    g.add(hull);
    const cabin = new THREE.Mesh(
      new THREE.BoxGeometry(4.2, 1.9, 9.2),
      new THREE.MeshLambertMaterial({ color: 0x0284c7 })
    );
    cabin.position.set(0, 2.2, -0.5);
    g.add(cabin);
  } else {
    const colors = [0xe4e4e7, 0xdc2626, 0x334155, 0x4cb82a, 0xf8fafc];
    const col = colors[Math.floor(Math.random() * colors.length)];
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(2.1, 1.4, 4.4),
      new THREE.MeshLambertMaterial({ color: col })
    );
    body.position.y = 0.9;
    g.add(body);
  }

  const lights = new THREE.Mesh(
    new THREE.BoxGeometry(1.7, 0.35, 0.25),
    new THREE.MeshBasicMaterial({ color: 0xfef08a })
  );
  const frontZ = kind === "zupco" ? 5.3 : kind === "ferry" ? 7.0 : 2.65;
  lights.position.set(0, 1.0, frontZ);
  g.add(lights);

  if (kind !== "ferry") {
    const tail = new THREE.Mesh(lights.geometry, TAIL_LIGHT_MATERIAL);
    tail.position.set(0, 1.0, -frontZ);
    g.add(tail);

    const beam = new THREE.Mesh(BEAM_GEOMETRY, beamMaterial);
    beam.scale.set(4.5, 1, 10);
    beam.position.set(0, 0.3, frontZ + 9);
    g.add(beam);
  }

  return g;
}

export const PEDESTRIAN_NAMES = [
  "Tendai",
  "Rumbidzai",
  "Tatenda",
  "Chipo",
  "Tinashe",
  "Nyasha",
  "Farai",
  "Kudzai",
  "Tariro",
  "Takudzwa",
  "Rutendo",
  "Munyaradzi",
  "Vimbai",
  "Simba",
  "Nomsa",
  "Thabo",
];

export function buildPedestrianMesh(seed: number): {
  group: THREE.Group;
  leftLeg: THREE.Mesh;
  rightLeg: THREE.Mesh;
  leftArm: THREE.Mesh;
  rightArm: THREE.Mesh;
} {
  const group = new THREE.Group();
  const skinTones = [0x6d4730, 0x553421, 0x82573c, 0x452819];
  const shirtColors = [
    0xf4f4f5,
    0xde2010,
    0x4cb82a,
    0x2563eb,
    0xeab308,
    0xa855f7,
    0x0ea5e9,
    0x334155,
  ];
  const pantColors = [0x18181b, 0x1e293b, 0x3f3f46, 0x451a03, 0x27272a];

  const skinMat = new THREE.MeshLambertMaterial({
    color: skinTones[seed % skinTones.length],
  });
  const shirtMat = new THREE.MeshLambertMaterial({
    color: shirtColors[(seed * 3) % shirtColors.length],
  });
  const pantMat = new THREE.MeshLambertMaterial({
    color: pantColors[(seed * 7) % pantColors.length],
  });

  const legGeo = new THREE.BoxGeometry(0.26, 0.82, 0.28);
  legGeo.translate(0, -0.41, 0);
  const leftLeg = new THREE.Mesh(legGeo, pantMat);
  leftLeg.position.set(-0.17, 0.85, 0);
  leftLeg.castShadow = true;
  group.add(leftLeg);

  const rightLeg = new THREE.Mesh(legGeo, pantMat);
  rightLeg.position.set(0.17, 0.85, 0);
  rightLeg.castShadow = true;
  group.add(rightLeg);

  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.88, 0.38), shirtMat);
  torso.position.set(0, 1.3, 0);
  torso.castShadow = true;
  group.add(torso);

  const armGeo = new THREE.BoxGeometry(0.22, 0.74, 0.24);
  armGeo.translate(0, -0.35, 0);
  const leftArm = new THREE.Mesh(armGeo, shirtMat);
  leftArm.position.set(-0.46, 1.68, 0);
  group.add(leftArm);

  const rightArm = new THREE.Mesh(armGeo, shirtMat);
  rightArm.position.set(0.46, 1.68, 0);
  group.add(rightArm);

  const head = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), skinMat);
  head.position.set(0, 2.02, 0);
  head.castShadow = true;
  group.add(head);

  if (seed % 3 === 0) {
    const cap = new THREE.Mesh(
      new THREE.BoxGeometry(0.54, 0.18, 0.54),
      new THREE.MeshLambertMaterial({ color: shirtColors[(seed + 2) % shirtColors.length] })
    );
    cap.position.set(0, 2.3, 0);
    group.add(cap);
  }

  const hitBox = new THREE.Mesh(
    new THREE.BoxGeometry(1.8, 3.2, 1.8),
    new THREE.MeshBasicMaterial({ visible: false })
  );
  hitBox.position.set(0, 1.4, 0);
  group.add(hitBox);

  group.scale.setScalar(1.35);

  return { group, leftLeg, rightLeg, leftArm, rightArm };
}

export function sampleRoutePoint(
  v: { route: RouteLine; segLengths: number[]; totalLen: number },
  dist: number,
  outPos: THREE.Vector3,
  outDir: THREE.Vector3
) {
  let d = ((dist % v.totalLen) + v.totalLen) % v.totalLen;
  const pts = v.route.pts;
  for (let i = 0; i < v.segLengths.length; i++) {
    const segLen = v.segLengths[i];
    if (d <= segLen || i === v.segLengths.length - 1) {
      const t = segLen > 0 ? d / segLen : 0;
      const p0 = pts[i];
      const p1 = pts[i + 1];
      outPos.set(
        p0[0] + (p1[0] - p0[0]) * t,
        p0[1] + (p1[1] - p0[1]) * t,
        p0[2] + (p1[2] - p0[2]) * t
      );
      outDir.set(p1[0] - p0[0], 0, p1[2] - p0[2]).normalize();
      return;
    }
    d -= segLen;
  }
}

