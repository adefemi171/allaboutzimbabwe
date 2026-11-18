"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { isLiteDevice } from "@/lib/device";
import {
  ZIMBABWE_PROVINCES,
  type ZimbabweProvinceProfile,
} from "@/data/zimbabwe-provinces";
import { ZIMBABWE_PLACES, type ZimbabwePlace } from "@/data/zimbabwe-places";
import {
  HARARE,
  buildStylizedEarthTexture,
  disposeScene,
  latLonToVec3,
  makeBeacon,
  rotationFacing,
} from "@/lib/globe";

type GlobeLayer = "all" | "provinces" | "universities" | "landmarks";

interface ZimbabweGlobeProps {
  selectedProvince: ZimbabweProvinceProfile;
  selectedPlace?: ZimbabwePlace | null;
  layer?: GlobeLayer;
  onSelectProvince: (province: ZimbabweProvinceProfile) => void;
  onSelectPlace?: (place: ZimbabwePlace) => void;
}

const MAJOR_SLUGS = new Set(["harare", "bulawayo", "manicaland", "midlands", "masvingo"]);

export function ZimbabweGlobe({
  selectedProvince,
  selectedPlace = null,
  layer = "all",
  onSelectProvince,
  onSelectPlace,
}: ZimbabweGlobeProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const selectedProvinceRef = useRef(selectedProvince);
  selectedProvinceRef.current = selectedProvince;
  const selectedPlaceRef = useRef(selectedPlace);
  selectedPlaceRef.current = selectedPlace;
  const layerRef = useRef<GlobeLayer>(layer);
  layerRef.current = layer;

  const onSelectProvinceRef = useRef(onSelectProvince);
  onSelectProvinceRef.current = onSelectProvince;
  const onSelectPlaceRef = useRef(onSelectPlace);
  onSelectPlaceRef.current = onSelectPlace;

  const targetRotRef = useRef(rotationFacing(HARARE.lat, HARARE.lon));

  useEffect(() => {
    const focus = selectedPlace ?? selectedProvince;
    targetRotRef.current = rotationFacing(focus.lat, focus.lon);
  }, [selectedProvince, selectedPlace]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 540;
    const height = container.clientHeight || 540;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 100);
    camera.position.set(0, 0, 4.15);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, isLiteDevice() ? 1.5 : 2));
    renderer.setSize(width, height);
    container.appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight(0xdbeafe, 0.85));
    const sun = new THREE.DirectionalLight(0xfff1d6, 1.8);
    sun.position.set(5, -2.0, 4);
    scene.add(sun);
    const rim = new THREE.DirectionalLight(0x62b4e8, 0.65);
    rim.position.set(-4, 2, -3);
    scene.add(rim);

    const globeGroup = new THREE.Group();
    scene.add(globeGroup);

    const earth = new THREE.Mesh(
      new THREE.SphereGeometry(1.32, 64, 64),
      new THREE.MeshStandardMaterial({
        map: buildStylizedEarthTexture(),
        roughness: 0.78,
        metalness: 0.12,
      })
    );
    globeGroup.add(earth);

    const atmosMat = new THREE.ShaderMaterial({
      transparent: true,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      vertexShader: `
        varying vec3 vNormal;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec3 vNormal;
        void main() {
          float intensity = pow(0.66 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 3.2);
          gl_FragColor = vec4(0.38, 0.71, 0.91, 1.0) * intensity * 0.65;
        }
      `,
    });
    scene.add(new THREE.Mesh(new THREE.SphereGeometry(1.42, 48, 48), atmosMat));

    type Halo = ReturnType<typeof makeBeacon>["halo"];
    const provinceBeacons: { dot: THREE.Mesh; halo: Halo; province: ZimbabweProvinceProfile }[] = [];
    const placeBeacons: { dot: THREE.Mesh; halo: Halo; place: ZimbabwePlace }[] = [];
    const hitTargets: THREE.Mesh[] = [];

    for (const province of ZIMBABWE_PROVINCES) {
      const isMajor = MAJOR_SLUGS.has(province.slug);
      const { dot, halo } = makeBeacon(
        latLonToVec3(province.lat, province.lon, 1.33),
        isMajor ? 0.016 : 0.012,
        "#ffd200",
        isMajor ? 0.65 : 0.35
      );
      dot.userData = { kind: "province", province };
      globeGroup.add(dot, halo);
      hitTargets.push(dot);
      provinceBeacons.push({ dot, halo, province });
    }

    for (const place of ZIMBABWE_PLACES) {
      const { dot, halo } = makeBeacon(
        latLonToVec3(place.lat, place.lon, 1.336),
        place.has3DCampus ? 0.014 : 0.01,
        place.category === "university" ? "#b99cff" : "#ffd200",
        0.5
      );
      dot.userData = { kind: "place", place };
      globeGroup.add(dot, halo);
      hitTargets.push(dot);
      placeBeacons.push({ dot, halo, place });
    }

    globeGroup.rotation.x = targetRotRef.current.x;
    globeGroup.rotation.y = targetRotRef.current.y;

    let isDragging = false;
    let dragDist = 0;
    let prevX = 0;
    let prevY = 0;
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();

    const onPointerDown = (e: PointerEvent) => {
      isDragging = true;
      dragDist = 0;
      prevX = e.clientX;
      prevY = e.clientY;
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!isDragging) return;
      const dx = e.clientX - prevX;
      const dy = e.clientY - prevY;
      dragDist += Math.hypot(dx, dy);
      prevX = e.clientX;
      prevY = e.clientY;
      targetRotRef.current.y += dx * 0.006;
      targetRotRef.current.x = Math.max(-0.9, Math.min(0.9, targetRotRef.current.x + dy * 0.006));
    };

    const onPointerUp = (e: PointerEvent) => {
      if (isDragging && dragDist < 6) {
        const rect = renderer.domElement.getBoundingClientRect();
        pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        raycaster.setFromCamera(pointer, camera);
        const visibleTargets = hitTargets.filter((t) => t.visible);
        const hits = raycaster.intersectObjects(visibleTargets, false);
        if (hits.length > 0) {
          const ud = hits[0].object.userData;
          if (ud.kind === "place" && onSelectPlaceRef.current) {
            onSelectPlaceRef.current(ud.place as ZimbabwePlace);
          } else if (ud.kind === "province") {
            onSelectProvinceRef.current(ud.province as ZimbabweProvinceProfile);
          }
        }
      }
      isDragging = false;
    };

    const dom = renderer.domElement;
    dom.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);

    const onResize = () => {
      const w = container.clientWidth || 540;
      const h = container.clientHeight || 540;
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

      globeGroup.rotation.x += (targetRotRef.current.x - globeGroup.rotation.x) * 0.08;
      globeGroup.rotation.y += (targetRotRef.current.y - globeGroup.rotation.y) * 0.08;

      const curLayer = layerRef.current;

      for (const b of provinceBeacons) {
        const show = curLayer === "all" || curLayer === "provinces";
        b.dot.visible = show;
        b.halo.visible = show;
        const active =
          !selectedPlaceRef.current && b.province.slug === selectedProvinceRef.current.slug;
        const pulse = active ? 1.55 + Math.sin(t * 4) * 0.35 : 0.9 + Math.sin(t * 2.2) * 0.12;
        b.halo.scale.setScalar(pulse);
        b.halo.material.opacity = active ? 0.98 : 0.34;
      }

      for (const b of placeBeacons) {
        const isUni = b.place.category === "university";
        const show =
          curLayer === "all" ||
          (curLayer === "universities" && isUni) ||
          (curLayer === "landmarks" && !isUni);
        b.dot.visible = show;
        b.halo.visible = show;
        const active = selectedPlaceRef.current?.id === b.place.id;
        const pulse = active ? 1.6 + Math.sin(t * 4) * 0.35 : 0.88 + Math.sin(t * 2.5) * 0.12;
        b.halo.scale.setScalar(pulse);
        b.halo.material.opacity = active ? 0.98 : 0.42;
      }

      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(raf);
      dom.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("resize", onResize);
      disposeScene(scene, renderer);
      if (container.contains(dom)) container.removeChild(dom);
    };
  }, []);

  return (
    <div
      ref={mountRef}
      className="h-[360px] w-full cursor-grab active:cursor-grabbing sm:h-[460px] lg:h-[500px]"
      aria-label="Interactive 3D Earth Globe showing Zimbabwe's 10 provinces, universities, and landmarks"
    />
  );
}
