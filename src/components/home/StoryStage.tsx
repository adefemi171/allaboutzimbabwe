"use client";

import { useEffect, useRef, type RefObject } from "react";
import * as THREE from "three";
import { isLiteDevice } from "@/lib/device";
import { ZIMBABWE_PROVINCES } from "@/data/zimbabwe-provinces";
import {
  HARARE,
  ZIMBABWE_OUTLINE,
  buildStylizedEarthTexture,
  disposeScene,
  latLonToVec3,
  rotationFacing,
} from "@/lib/globe";
import {
  type StoryFrame,
  activeScene,
  elevationFromFrame,
  poseAtFrame,
} from "@/lib/story-scroll";

interface StoryStageProps {
  frame: StoryFrame;
  narrow: boolean;
  /** HTML marker that follows Zimbabwe on the globe. */
  badgeRef: RefObject<HTMLDivElement | null>;
}

/** Lat/lon to the flat country model's x/z, roughly centred on Zimbabwe. */
function zimLatLonToPlane(lat: number, lon: number): [number, number] {
  const x = (lon - 29.5) * 0.48;
  const z = -(lat + 19.0) * 0.52;
  return [x, z];
}

/** Relative column height per province capital on the country model. */
const CITY_WEIGHT: Record<string, number> = {
  harare: 1.0,
  bulawayo: 0.72,
  manicaland: 0.48,
  midlands: 0.42,
  masvingo: 0.36,
  "mashonaland-west": 0.34,
  "mashonaland-east": 0.3,
  "mashonaland-central": 0.28,
  "matabeleland-north": 0.32,
  "matabeleland-south": 0.28,
};

export function StoryStage({ frame, narrow, badgeRef }: StoryStageProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef(frame);
  frameRef.current = frame;
  const narrowRef = useRef(narrow);
  narrowRef.current = narrow;

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0c0e0c);
    scene.fog = new THREE.FogExp2(0x0c0e0c, 0.028);

    const camera = new THREE.PerspectiveCamera(36, width / height, 0.1, 120);
    camera.position.set(-0.45, 0.22, 4.25);

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, isLiteDevice() ? 1.5 : 2));
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight(0xdbeafe, 0.75));
    const sun = new THREE.DirectionalLight(0xfff1d6, 1.85);
    sun.position.set(5, 6, 4);
    sun.castShadow = true;
    scene.add(sun);
    const rim = new THREE.DirectionalLight(0x62b4e8, 0.65);
    rim.position.set(-4, 2, -4);
    scene.add(rim);

    const globeGroup = new THREE.Group();
    scene.add(globeGroup);

    const globe = new THREE.Mesh(
      new THREE.SphereGeometry(1.36, 64, 64),
      new THREE.MeshStandardMaterial({
        map: buildStylizedEarthTexture(),
        roughness: 0.78,
        metalness: 0.1,
      })
    );
    globeGroup.add(globe);

    // Invisible anchor: the HTML badge is the marker and follows this point.
    const anchor = new THREE.Object3D();
    anchor.position.copy(latLonToVec3(HARARE.lat, HARARE.lon, 1.38));
    globeGroup.add(anchor);

    const globeFacing = rotationFacing(HARARE.lat, HARARE.lon);
    globeGroup.rotation.set(globeFacing.x, globeFacing.y, 0);
    globeGroup.position.set(0.85, -0.05, 0);

    // Every column, ridge, tree and building is this one box, scaled.
    const unitBox = new THREE.BoxGeometry(1, 1, 1);
    const box = (w: number, h: number, d: number, material: THREE.Material) => {
      const mesh = new THREE.Mesh(unitBox, material);
      mesh.scale.set(w, h, d);
      return mesh;
    };

    const countryGroup = new THREE.Group();
    countryGroup.position.set(0.85, -0.1, 0);
    scene.add(countryGroup);

    const zimShape = new THREE.Shape();
    ZIMBABWE_OUTLINE.forEach(([lon, lat], idx) => {
      const [px, pz] = zimLatLonToPlane(lat, lon);
      if (idx === 0) zimShape.moveTo(px, -pz);
      else zimShape.lineTo(px, -pz);
    });
    const zimBaseGeo = new THREE.ExtrudeGeometry(zimShape, {
      depth: 0.24,
      bevelEnabled: true,
      bevelThickness: 0.02,
      bevelSize: 0.02,
      bevelSegments: 2,
    });
    zimBaseGeo.rotateX(-Math.PI / 2);
    const zimBase = new THREE.Mesh(
      zimBaseGeo,
      new THREE.MeshStandardMaterial({
        color: 0x4cb82a,
        roughness: 0.78,
        metalness: 0.08,
      })
    );
    zimBase.receiveShadow = true;
    countryGroup.add(zimBase);

    const gridHelper = new THREE.GridHelper(18, 36, 0x2b302b, 0x1d211d);
    gridHelper.position.y = -0.02;
    countryGroup.add(gridHelper);

    const zambeziPts = [
      [24.5, -17.6],
      [25.85, -17.92],
      [27.5, -17.2],
      [28.76, -16.52],
      [30.4, -15.65],
      [32.5, -16.2],
    ].map(([lon, lat]) => {
      const [px, pz] = zimLatLonToPlane(lat, lon);
      return new THREE.Vector3(px, 0.26, pz);
    });
    const zambeziGeo = new THREE.TubeGeometry(
      new THREE.CatmullRomCurve3(zambeziPts),
      36,
      0.03,
      8,
      false
    );
    countryGroup.add(
      new THREE.Mesh(zambeziGeo, new THREE.MeshBasicMaterial({ color: 0x62b4e8 }))
    );

    for (const pr of ZIMBABWE_PROVINCES) {
      const [px, pz] = zimLatLonToPlane(pr.lat, pr.lon);
      const w = CITY_WEIGHT[pr.slug] || 0.3;
      const colH = 0.28 + w * 0.78;
      const colMesh = box(
        0.16,
        colH,
        0.16,
        new THREE.MeshStandardMaterial({
          color: pr.slug === "harare" ? 0xffd200 : 0xd9cbb0,
          emissive: pr.slug === "harare" ? 0x664900 : 0x151815,
          roughness: 0.5,
        })
      );
      colMesh.position.set(px, 0.25 + colH / 2, pz);
      colMesh.castShadow = true;
      countryGroup.add(colMesh);
    }

    const ridgeCoords: [number, number, number][] = [
      [-18.29, 32.84, 0.62],
      [-18.97, 32.67, 0.44],
      [-19.8, 32.86, 0.54],
      [-20.49, 28.5, 0.34],
    ];
    for (const [lat, lon, rh] of ridgeCoords) {
      const [rx, rz] = zimLatLonToPlane(lat, lon);
      const ridgeMesh = box(
        0.24,
        rh,
        0.24,
        new THREE.MeshStandardMaterial({ color: 0xb08c5a, roughness: 0.85 })
      );
      ridgeMesh.position.set(rx, 0.25 + rh / 2, rz);
      countryGroup.add(ridgeMesh);
    }

    const contourMaterial = new THREE.MeshStandardMaterial({
      color: 0x3f93cf,
      transparent: true,
      opacity: 0.32,
      side: THREE.DoubleSide,
    });
    const contourPlane = new THREE.Mesh(new THREE.PlaneGeometry(6.5, 5.5), contourMaterial);
    contourPlane.rotation.x = -Math.PI / 2;
    contourPlane.position.y = 0.15;
    contourPlane.visible = false;
    countryGroup.add(contourPlane);

    const harareGroup = new THREE.Group();
    harareGroup.position.set(0.85, -0.35, 0);
    scene.add(harareGroup);

    const harareGround = new THREE.Mesh(
      new THREE.BoxGeometry(5.6, 0.14, 5.6),
      new THREE.MeshStandardMaterial({ color: 0x1d211d, roughness: 0.9 })
    );
    harareGround.position.y = -0.07;
    harareGround.receiveShadow = true;
    harareGroup.add(harareGround);

    const palette = [0xd9cbb0, 0xc2583d, 0x9aa3ab, 0x62b4e8, 0xe3dccb, 0x4cb82a];
    const jacaranda = new THREE.MeshStandardMaterial({ color: 0xb99cff });
    for (let gx = -8; gx <= 8; gx++) {
      for (let gz = -8; gz <= 8; gz++) {
        if (gx % 3 === 0 || gz % 3 === 0) {
          if ((gx + gz) % 6 === 0) {
            const tree = box(0.12, 0.18, 0.12, jacaranda);
            tree.position.set(gx * 0.28, 0.09, gz * 0.28);
            harareGroup.add(tree);
          }
          continue;
        }
        const distCenter = Math.hypot(gx, gz);
        const isRbz = gx === 1 && gz === 1;
        const isEastgate = gx === 2 && gz === -1;
        const h = isRbz
          ? 1.55
          : isEastgate
          ? 0.85
          : Math.max(
              0.18,
              (1.15 - distCenter * 0.08) * (0.5 + (Math.abs(gx * 7 + gz * 13) % 10) / 15)
            );
        const col = isRbz
          ? 0x62b4e8
          : isEastgate
          ? 0xc2583d
          : palette[Math.abs(gx * 3 + gz * 5) % palette.length];
        const bldg = box(
          0.22,
          h,
          0.22,
          new THREE.MeshStandardMaterial({
            color: col,
            emissive: isRbz ? 0x103854 : 0x000000,
            roughness: 0.6,
          })
        );
        bldg.position.set(gx * 0.28, h / 2, gz * 0.28);
        bldg.castShadow = true;
        harareGroup.add(bldg);
      }
    }

    const camGoal = new THREE.Vector3(-0.45, 0.22, 4.25);
    const lookGoal = new THREE.Vector3(0.85, -0.02, 0);
    const curLook = new THREE.Vector3(0.85, -0.02, 0);
    // Damping close to NL engine.setGoal(..., 5) — snappy but not instant.
    const damp = 0.18;

    const onResize = () => {
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener("resize", onResize);

    let raf = 0;
    const clock = new THREE.Clock();
    const animate = () => {
      raf = requestAnimationFrame(animate);
      const t = clock.getElapsedTime();
      const f = frameRef.current;

      // Ordinary page content covers the canvas from here on.
      if (f.past) return;

      const pose = poseAtFrame(f, narrowRef.current);
      camGoal.set(pose.cam[0], pose.cam[1], pose.cam[2]);
      lookGoal.set(pose.look[0], pose.look[1], pose.look[2]);

      camera.position.lerp(camGoal, damp);
      curLook.lerp(lookGoal, damp);
      camera.lookAt(curLook);

      // The camera flies continuously; the models swap in one cut, halfway there.
      const scene3d = activeScene(f);
      const climbed = scene3d === "highveld" || scene3d === "harare";
      globeGroup.visible = scene3d === "globe";
      countryGroup.visible = scene3d === "country" || scene3d === "highveld";
      harareGroup.visible = scene3d === "harare";

      // Gentle idle motion while held; freeze during travel so the fly reads clean.
      const idle = f.travel <= 0.02 ? 1 : 0;
      globeGroup.rotation.y = globeFacing.y + Math.sin(t * 0.2) * 0.08 * idle;
      countryGroup.rotation.y = (climbed ? 0.42 : 0) + Math.sin(t * 0.22) * 0.12 * idle;
      harareGroup.rotation.y = t * 0.06 * idle;


      const elev = elevationFromFrame(f);
      contourPlane.visible = elev > 0.02 && countryGroup.visible;
      contourPlane.position.y = 0.24 + elev * 0.55;
      contourMaterial.opacity = 0.12 + elev * 0.28;

      renderer.render(scene, camera);

      // Keep the HTML badge pinned to Zimbabwe, wherever the camera has put it.
      const badge = badgeRef.current;
      if (badge) {
        anchor.getWorldPosition(badgePos).project(camera);
        const x = (badgePos.x * 0.5 + 0.5) * container.clientWidth;
        const y = (-badgePos.y * 0.5 + 0.5) * container.clientHeight;
        badge.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%)`;
      }
    };
    const badgePos = new THREE.Vector3();
    animate();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      disposeScene(scene, renderer);
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [badgeRef]);

  return (
    <div
      ref={mountRef}
      aria-hidden="true"
      className="sea-dots pointer-events-none fixed inset-0 z-0"
    />
  );
}
