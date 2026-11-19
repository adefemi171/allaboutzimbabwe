import * as THREE from "three";

type Shape = "sentinel" | "station" | "satellite";

/** An enlarged illustration at the selected spacecraft's orbital position. */
export class ReplaySpacecraft extends THREE.Group {
  private readonly cube = new THREE.BoxGeometry();
  private readonly frame = new THREE.MeshLambertMaterial({ color: 0xb7cbe0 });
  private readonly foil = new THREE.MeshLambertMaterial({ color: 0xd7a96a });
  private readonly shadow = new THREE.MeshLambertMaterial({ color: 0x252e3a });
  private readonly panel = new THREE.MeshLambertMaterial({ color: 0x427abf, emissive: 0x071428 });
  private readonly warmPanel = new THREE.MeshLambertMaterial({ color: 0x986243, emissive: 0x1f1008 });
  private readonly shapes = new Map<Shape, THREE.Group>();
  private readonly along = new THREE.Vector3();
  private readonly outward = new THREE.Vector3();
  private readonly across = new THREE.Vector3();
  private readonly basis = new THREE.Matrix4();
  private span = 4;

  constructor() {
    super();
    this.visible = false;
    this.add(new THREE.AmbientLight(0xffffff, 1.8));
    const key = new THREE.DirectionalLight(0xe5efff, 2);
    key.position.set(3, 5, 7);
    this.add(key);
  }

  show(noradId: number): void {
    const shape: Shape = noradId === 25544
      ? "station"
      : [40697, 42063, 60990].includes(noradId)
        ? "sentinel"
        : "satellite";
    this.span = shape === "station" ? 5.3 : shape === "sentinel" ? 3.37 : 4.02;
    let model = this.shapes.get(shape);
    if (!model) {
      model = this.build(shape);
      this.shapes.set(shape, model);
      this.add(model);
    }
    for (const group of this.shapes.values()) group.visible = group === model;
    this.visible = true;
  }

  /** Keep the panels legible as the camera zooms. Local +Z faces away from Earth. */
  pose(position: THREE.Vector3, next: THREE.Vector3, camera: THREE.PerspectiveCamera, height: number): void {
    this.position.copy(position);
    this.outward.copy(position).normalize();
    this.along.subVectors(next, position);
    this.along.addScaledVector(this.outward, -this.along.dot(this.outward)).normalize();
    if (this.along.lengthSq() > 0) {
      this.across.crossVectors(this.along, this.outward).normalize();
      this.quaternion.setFromRotationMatrix(this.basis.makeBasis(this.across, this.along, this.outward));
    }
    const frustum = 2 * position.distanceTo(camera.position) * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    this.scale.setScalar(Math.min(0.055, (frustum * 62) / (this.span * Math.max(1, height))));
  }

  private build(shape: Shape): THREE.Group {
    const model = new THREE.Group();
    const box = (material: THREE.Material, w: number, h: number, d: number, x = 0, y = 0, z = 0) => {
      const mesh = new THREE.Mesh(this.cube, material);
      mesh.scale.set(w, h, d);
      mesh.position.set(x, y, z);
      model.add(mesh);
    };
    const solar = (x: number, y: number, w: number, h: number, material = this.panel) => {
      box(this.frame, w, h, 0.075, x, y);
      for (let col = 0; col < 3; col++) {
        box(material, w / 3 - 0.055, h - 0.10, 0.08, x + (col - 1) * w / 3, y);
      }
    };

    if (shape === "station") {
      box(this.frame, 5.3, 0.18, 0.19);
      box(this.frame, 0.57, 1.65, 0.50);
      box(this.frame, 1.40, 0.55, 0.45);
      box(this.shadow, 0.31, 0.42, 0.32, 0, 0.95);
      for (const x of [-2.2, -1.45, 1.45, 2.2]) {
        for (const y of [-0.83, 0.83]) solar(x, y, 0.59, 1.39, this.warmPanel);
      }
      return model;
    }

    box(this.foil, 1, 1.16, 0.82);
    box(this.frame, 0.9, 0.23, 0.88, 0, 0.45);
    box(this.shadow, 0.54, 0.68, 0.22, 0, -0.17, -0.47);
    box(this.frame, 0.34, 0.02, 0.51, -0.26, -0.34, 0.51);
    if (shape === "sentinel") {
      box(this.frame, 0.31, 0.12, 0.12, 0.57);
      for (const x of [0.99, 1.75, 2.51]) solar(x, 0, 0.71, 0.90);
    } else {
      for (const side of [-1, 1]) {
        box(this.frame, 0.34, 0.10, 0.12, side * 0.59);
        solar(side * 1.36, 0, 1.30, 0.71);
      }
    }
    return model;
  }

  dispose(): void {
    this.cube.dispose();
    for (const material of [this.frame, this.foil, this.shadow, this.panel, this.warmPanel]) {
      material.dispose();
    }
  }
}
