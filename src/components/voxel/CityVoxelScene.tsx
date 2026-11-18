"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import {
  Search,
  Sun,
  CloudRain,
  Cloud,
  Sparkles,
  Wind,
  Eye,
  Footprints,
  Bus,
  Ship,
  ArrowRight,
  X,
  Compass,
  SlidersHorizontal,
  ChevronRight,
  MapPin,
  ChevronDown,
  Flag,
  GraduationCap,
  Minus,
  Maximize2,
  EyeOff,
  Globe2,
  Layers,
  Satellite,
} from "lucide-react";
import { openFeedbackModal } from "@/components/FeedbackWidget";
import { HARARE_LANDMARKS } from "@/data/harare-landmarks";
import {
  ZIMBABWE_PROVINCES,
  airportBadge,
  cityMapHref,
  getProvinceBySlug,
} from "@/data/zimbabwe-provinces";
import {
  ZIMBABWE_PLACES,
  getPlaceByCampusSlug,
  getPlacesForProvince,
  type ZimbabwePlace,
} from "@/data/zimbabwe-places";
import {
  buildChunkGeometry,
  buildPaletteRgb,
  CHUNK_CELLS,
  latLonToWorldMeters,
  parseVoxelBinary,
  type VoxelMeta,
  type RouteLine,
} from "@/lib/zimbabwe-voxel-mesher";
import { isLiteDevice } from "@/lib/device";
import { worldFiles } from "@/lib/world-files";
import { IMAGERY_CREDIT } from "@/lib/esri-imagery";
import { SatelliteGround, type MapStyleMode } from "@/lib/satellite-ground";
import {
  fetchStreetPaths,
  searchPlaces,
  type LatLonPath,
  type MapSearchPlace,
} from "@/lib/map-search";
import { buildRibbonGeometry } from "@/components/voxel/ribbon";
import {
  buildPedestrianMesh,
  buildVehicleMesh,
  PEDESTRIAN_NAMES,
  sampleRoutePoint,
  vehicleLabel,
  type PedestrianInstance,
  type VehicleInstance,
} from "@/components/voxel/scene-actors";
import { ROUTE_HEIGHT_ABOVE_ROAD, StreetLights } from "@/components/voxel/street-lights";
import {
  readPassTrack,
  TRACK_STORAGE_KEY,
  type StoredPassTrack,
} from "@/satellite/pass-track";

type WeatherMode = "typical" | "clear" | "haze" | "cloudy" | "rain";
type ControlMode = "orbit" | "street" | "pedestrian" | "ride";

interface UnifiedLandmark {
  id: string;
  name: string;
  district: string;
  lat: number;
  lon: number;
  elevationM: number;
  importance: 1 | 2 | 3;
  category: "landmark" | "district" | "bridge" | "transit" | "culture" | "university";
  summary: string;
  vibeNote: string;
  rentEstimate: string;
  guideSlug: string;
  campusSlug?: string;
}

type SearchRow =
  | { source: "landmark"; landmark: UnifiedLandmark; rank: number }
  | { source: "osm"; place: MapSearchPlace; rank: number };

const MAP_STYLES = [
  { id: "voxel", Icon: Layers, title: "Voxel map" },
  { id: "hybrid", Icon: Globe2, title: "Hybrid: satellite ground + 3D buildings" },
  { id: "satellite", Icon: Satellite, title: "Satellite imagery" },
] as const;

const HARARE_CAMERA_PRESETS: Record<
  string,
  { label: string; lat: number; lon: number; offset: [number, number, number] }
> = {
  overview: { label: "Harare Overview", lat: -17.8292, lon: 31.0522, offset: [-820, 600, 980] },
  cbd: { label: "CBD & RBZ Tower", lat: -17.827, lon: 31.0525, offset: [-380, 260, 440] },
  eastgate: { label: "Eastgate & Unity Sq", lat: -17.8305, lon: 31.0532, offset: [-320, 210, 380] },
  kopje: { label: "Harare Kopje", lat: -17.8358, lon: 31.0355, offset: [-360, 230, 420] },
  avenues: { label: "Avenues & Gardens", lat: -17.819, lon: 31.048, offset: [-360, 240, 430] },
  avondale: { label: "Avondale & Belgravia", lat: -17.802, lon: 31.039, offset: [-390, 260, 450] },
  mountpleasant: { label: "Mount Pleasant & UZ", lat: -17.784, lon: 31.053, offset: [-420, 280, 480] },
  borrowdale: { label: "Borrowdale Village", lat: -17.783, lon: 31.083, offset: [-450, 300, 520] },
  gletwyn: { label: "Gletwyn", lat: -17.78, lon: 31.12, offset: [-440, 290, 500] },
  shawasha: { label: "Shawasha Hills", lat: -17.80, lon: 31.14, offset: [-460, 310, 540] },
};

function formatHour(h: number): string {
  const hh = Math.floor(h) % 24;
  const mm = Math.floor((h - Math.floor(h)) * 60);
  const tag =
    h >= 5.5 && h < 7.5
      ? "dawn"
      : h >= 7.5 && h < 11.5
      ? "morning"
      : h >= 11.5 && h < 16.0
      ? "midday"
      : h >= 16.0 && h < 18.75
      ? "golden hour"
      : "Zimbabwe night";
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")} · ${tag}`;
}

function getLocalHour(d = new Date()): number {
  return d.getHours() + d.getMinutes() / 60 + d.getSeconds() / 3600;
}

function getLocalDayOfYear(d = new Date()): number {
  const start = Date.UTC(d.getFullYear(), 0, 1);
  const current = Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
  const day = Math.floor((current - start) / 86_400_000) + 1;
  return Math.min(365, Math.max(1, day));
}

function formatDayOfYear(day: number): string {
  const d = new Date(2026, 0, day);
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

/**
 * The server labels world files as gzip so the browser unpacks them; a host that
 * drops that header hands over the packed bytes, which are unpacked here instead.
 */
async function gunzipIfNeeded(buf: ArrayBuffer): Promise<ArrayBuffer> {
  const head = new Uint8Array(buf, 0, 2);
  if (head[0] !== 0x1f || head[1] !== 0x8b) return buf;
  const stream = new Blob([buf]).stream().pipeThrough(new DecompressionStream("gzip"));
  return new Response(stream).arrayBuffer();
}

export function CityVoxelScene({
  provinceSlug = "harare",
  campusSlug,
  initialView,
}: {
  provinceSlug?: string;
  campusSlug?: string;
  initialView?: string;
}) {
  const router = useRouter();
  const campusProfile = useMemo(
    () => (campusSlug ? getPlaceByCampusSlug(campusSlug) : undefined),
    [campusSlug]
  );
  const provinceProfile = useMemo(
    () =>
      getProvinceBySlug(campusProfile ? campusProfile.provinceSlug : provinceSlug) ||
      ZIMBABWE_PROVINCES[0],
    [campusProfile, provinceSlug]
  );
  const isCampus = Boolean(campusProfile);
  const isHarare = !isCampus && provinceProfile.slug === "harare";

  const activeLat = campusProfile ? campusProfile.lat : provinceProfile.lat;
  const activeLon = campusProfile ? campusProfile.lon : provinceProfile.lon;
  const activeTitle = campusProfile ? campusProfile.shortName : provinceProfile.capital;
  const activeSub = campusProfile ? campusProfile.province : provinceProfile.province;

  const provincePlaces = useMemo(
    () => getPlacesForProvince(provinceProfile.slug),
    [provinceProfile.slug]
  );

  const [osmPois, setOsmPois] = useState<UnifiedLandmark[]>([]);

  const landmarks: UnifiedLandmark[] = useMemo(() => {
    const base: UnifiedLandmark[] =
      isCampus && campusProfile
        ? [
            {
              id: campusProfile.id,
              name: campusProfile.name,
              district: `${campusProfile.city} · ${campusProfile.province}`,
              lat: campusProfile.lat,
              lon: campusProfile.lon,
              elevationM: campusProfile.elevationM,
              importance: 1,
              category: campusProfile.category === "university" ? "university" : "culture",
              summary: campusProfile.summary,
              vibeNote: campusProfile.vibeNote,
              rentEstimate: campusProfile.foundedOrStat || "3D Place",
              guideSlug: campusProfile.guideSlug,
            },
          ]
        : isHarare
        ? HARARE_LANDMARKS.map((l) => ({ ...l }))
        : provinceProfile.landmarks.map((l) => ({
            ...l,
            district: `${provinceProfile.capital} · ${provinceProfile.province}`,
            importance: 1 as const,
            rentEstimate: provinceProfile.rentMonthlyRange,
          }));

    const maxW = isHarare ? 3800 : isCampus ? 1280 : 1780;
    const maxH = isHarare ? 2500 : isCampus ? 1000 : 1260;
    for (const pl of provincePlaces) {
      if (base.some((b) => b.name === pl.name)) continue;
      const [wx, wz] = latLonToWorldMeters(pl.lat, pl.lon, activeLat, activeLon);
      if (Math.abs(wx) <= maxW && Math.abs(wz) <= maxH) {
        base.push({
          id: pl.id,
          name: pl.shortName,
          district: `${pl.city} · ${pl.province}`,
          lat: pl.lat,
          lon: pl.lon,
          elevationM: pl.elevationM,
          importance: 1,
          category: pl.category === "university" ? "university" : "culture",
          summary: pl.summary,
          vibeNote: pl.vibeNote,
          rentEstimate: pl.foundedOrStat || pl.category,
          guideSlug: pl.guideSlug,
          campusSlug: pl.campusSlug,
        });
      }
    }

    for (const poi of osmPois) {
      if (!base.some((b) => b.name.toLowerCase() === poi.name.toLowerCase())) {
        base.push(poi);
      }
    }
    return base;
  }, [
    isCampus,
    campusProfile,
    isHarare,
    provinceProfile,
    provincePlaces,
    activeLat,
    activeLon,
    osmPois,
  ]);

  const [isMobile, setIsMobile] = useState(false);

  const visibleLandmarks = useMemo(() => {
    if (!isMobile) return landmarks;
    return landmarks.filter((lm) => lm.importance <= 2).slice(0, 6);
  }, [landmarks, isMobile]);

  const containerRef = useRef<HTMLDivElement>(null);
  const labelsLayerRef = useRef<HTMLDivElement>(null);
  const landmarkWorldRef = useRef<{ lm: UnifiedLandmark; pos: THREE.Vector3 }[]>([]);
  landmarkWorldRef.current = useMemo(
    () =>
      visibleLandmarks.map((lm) => {
        const [wx, wz] = latLonToWorldMeters(lm.lat, lm.lon, activeLat, activeLon);
        return { lm, pos: new THREE.Vector3(wx, lm.elevationM + 14, wz) };
      }),
    [visibleLandmarks, activeLat, activeLon]
  );

  const [loadProgress, setLoadProgress] = useState<{ label: string; pct: number } | null>({
    label: `Loading ${activeTitle} (${activeSub}) OpenStreetMap voxels…`,
    pct: 12,
  });
  const [hour, setHour] = useState(17.1);
  const [dayOfYear, setDayOfYear] = useState(290);
  const [followDeviceTime, setFollowDeviceTime] = useState(true);
  const [weather, setWeather] = useState<WeatherMode>("typical");
  const [renderScale, setRenderScale] = useState(0.85);
  const [controlMode, setControlMode] = useState<ControlMode>("orbit");
  const [searchQuery, setSearchQuery] = useState("");
  const [mapPlaces, setMapPlaces] = useState<MapSearchPlace[]>([]);
  const [remotePlaces, setRemotePlaces] = useState<MapSearchPlace[]>([]);
  const [remoteSearching, setRemoteSearching] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<MapSearchPlace | null>(null);
  const [provinceSwitcherOpen, setProvinceSwitcherOpen] = useState(false);
  const [switcherTab, setSwitcherTab] = useState<"provinces" | "universities">("provinces");
  const [placesDrawerOpen, setPlacesDrawerOpen] = useState(false);
  const [provinceFilter, setProvinceFilter] = useState("");
  const [selectedLandmark, setSelectedLandmark] = useState<UnifiedLandmark | null>(null);
  const [rideInfo, setRideInfo] = useState<{ kind: string; route: string; speedKmh: number } | null>(
    null
  );
  const [streetInfo, setStreetInfo] = useState<{
    streetName: string;
    personName?: string;
    firstPerson?: boolean;
  } | null>(null);
  const [hudStats, setHudStats] = useState({
    fps: 60,
    chunks: 0,
    totalChunks: 0,
    trisM: "0.0",
    buildingsCount: 0,
  });
  const [controlsOpen, setControlsOpen] = useState(false);
  const [navPanelOpen, setNavPanelOpen] = useState(false);
  const [telemetryOpen, setTelemetryOpen] = useState(false);
  const [landmarkMinimized, setLandmarkMinimized] = useState(false);
  const [hudHidden, setHudHidden] = useState(false);
  const [browserBottomInset, setBrowserBottomInset] = useState(0);
  const [mapStyle, setMapStyle] = useState<MapStyleMode>("voxel");
  const [satLoading, setSatLoading] = useState(false);
  const [passTrackBanner, setPassTrackBanner] = useState<StoredPassTrack | null>(null);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 820px)");
    const sync = () => {
      const mobile = mq.matches;
      setIsMobile(mobile);
      if (mobile) {
        setNavPanelOpen(false);
        setTelemetryOpen(false);
        setControlsOpen(false);
      } else {
        setNavPanelOpen(true);
        setTelemetryOpen(true);
        setControlsOpen(true);
      }
    };
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    const syncBottomInset = () => {
      const vv = window.visualViewport;
      if (!vv) {
        setBrowserBottomInset(0);
        return;
      }
      // Safari / Chrome mobile toolbars sit over the layout viewport even when
      // 100dvh shrinks; lift HUD by the obscured strip (+ a mobile buffer).
      const obscured = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      const mobileBuffer = window.matchMedia("(max-width: 820px)").matches ? 44 : 0;
      setBrowserBottomInset(Math.max(obscured, mobileBuffer));
    };
    syncBottomInset();
    const vv = window.visualViewport;
    vv?.addEventListener("resize", syncBottomInset);
    vv?.addEventListener("scroll", syncBottomInset);
    window.addEventListener("resize", syncBottomInset);
    return () => {
      vv?.removeEventListener("resize", syncBottomInset);
      vv?.removeEventListener("scroll", syncBottomInset);
      window.removeEventListener("resize", syncBottomInset);
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("satTrack") !== "1") return;
    const stored = readPassTrack();
    if (stored) setPassTrackBanner(stored);
  }, []);

  useEffect(() => {
    if (!followDeviceTime) return;
    const syncFromDevice = () => {
      const now = new Date();
      setHour(getLocalHour(now));
      setDayOfYear(getLocalDayOfYear(now));
    };
    syncFromDevice();
    const id = window.setInterval(syncFromDevice, 30_000);
    const onVisibility = () => {
      if (document.visibilityState === "visible") syncFromDevice();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [followDeviceTime]);

  const hourRef = useRef(hour);
  hourRef.current = hour;
  const dayRef = useRef(dayOfYear);
  dayRef.current = dayOfYear;
  const weatherRef = useRef(weather);
  weatherRef.current = weather;
  const renderScaleRef = useRef(renderScale);
  renderScaleRef.current = renderScale;
  const controlModeRef = useRef(controlMode);
  controlModeRef.current = controlMode;
  const streetFpvRef = useRef(false);
  streetFpvRef.current = Boolean(streetInfo?.firstPerson);

  const mapStyleRef = useRef(mapStyle);
  mapStyleRef.current = mapStyle;

  const sceneActionsRef = useRef<{
    flyToLatLon: (lat: number, lon: number, offset?: [number, number, number]) => void;
    cycleRide: (preferredKind?: "kombi" | "ferry") => void;
    enterStreetView: (lat?: number, lon?: number) => void;
    followNextPedestrian: () => void;
    togglePedestrianFpv: () => void;
    exitToFly: () => void;
    setMapStyle: (mode: MapStyleMode) => void;
    /** Pin a searched spot; a street name also outlines that road from the city's routes. */
    highlightPlace: (lat: number, lon: number, streetName?: string) => void;
    addStreetPaths: (paths: LatLonPath[]) => void;
    clearHighlight: () => void;
    clearPassTrack: () => void;
  } | null>(null);
  /** Bumped per selection so a slow street lookup cannot outline a stale pick. */
  const highlightTokenRef = useRef(0);

  const searchSlug =
    isCampus && campusProfile?.campusSlug ? campusProfile.campusSlug : provinceProfile.slug;

  useEffect(() => {
    let cancelled = false;
    setMapPlaces([]);
    setRemotePlaces([]);
    setSelectedPlace(null);
    fetch(`/data/search/${searchSlug}.json`)
      .then((res) => (res.ok ? res.json() : { places: [] }))
      .then((data) => {
        if (!cancelled) setMapPlaces(Array.isArray(data.places) ? data.places : []);
      })
      .catch(() => {
        if (!cancelled) setMapPlaces([]);
      });
    return () => {
      cancelled = true;
    };
  }, [searchSlug]);

  const localSearchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (q.length < 2) return [];

    const score = (name: string) => {
      const n = name.toLowerCase();
      if (n.startsWith(q)) return 0;
      if (n.split(/[^a-z0-9]+/).some((word) => word.startsWith(q))) return 1;
      return 2;
    };

    const rows: SearchRow[] = [];
    const landmarkNames = new Set<string>();

    for (const landmark of landmarks) {
      if (
        landmark.name.toLowerCase().includes(q) ||
        landmark.district.toLowerCase().includes(q) ||
        landmark.summary.toLowerCase().includes(q)
      ) {
        landmarkNames.add(landmark.name.toLowerCase());
        rows.push({ source: "landmark", landmark, rank: score(landmark.name) });
      }
    }

    for (const place of mapPlaces) {
      if (!place.name.toLowerCase().includes(q)) continue;
      if (landmarkNames.has(place.name.toLowerCase()) && place.kind !== "address") continue;
      const kindBias = place.kind === "street" || place.kind === "address" ? 0 : 0.4;
      rows.push({ source: "osm", place, rank: score(place.name) + kindBias });
    }

    rows.sort((a, b) => a.rank - b.rank || a.source.localeCompare(b.source));
    return rows.slice(0, 8);
  }, [searchQuery, landmarks, mapPlaces]);

  useEffect(() => {
    const q = searchQuery.trim();
    // Live lookup only for house numbers or when the bundled index is thin.
    if (q.length < 3 || (!/\d/.test(q) && localSearchResults.length >= 3)) {
      setRemotePlaces([]);
      setRemoteSearching(false);
      return;
    }

    const controller = new AbortController();
    setRemoteSearching(true);
    const timer = window.setTimeout(() => {
      searchPlaces(q, { bias: { lat: activeLat, lon: activeLon }, signal: controller.signal })
        .then((places) => {
          if (!controller.signal.aborted) setRemotePlaces(places);
        })
        .catch(() => {
          if (!controller.signal.aborted) setRemotePlaces([]);
        })
        .finally(() => {
          if (!controller.signal.aborted) setRemoteSearching(false);
        });
    }, 380);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [searchQuery, localSearchResults.length, activeLat, activeLon]);

  const searchResults = useMemo(() => {
    const rows: SearchRow[] = [...localSearchResults];
    const seen = new Set(
      rows.map((row) =>
        row.source === "landmark"
          ? row.landmark.name.toLowerCase()
          : row.place.name.toLowerCase()
      )
    );

    for (const place of remotePlaces) {
      const key = place.name.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      rows.push({ source: "osm", place, rank: place.kind === "address" ? 0.5 : 1.2 });
    }

    rows.sort((a, b) => a.rank - b.rank);
    return rows.slice(0, 10);
  }, [localSearchResults, remotePlaces]);

  const filteredProvinces = useMemo(() => {
    const q = provinceFilter.trim().toLowerCase();
    if (!q) return ZIMBABWE_PROVINCES;
    return ZIMBABWE_PROVINCES.filter(
      (p) =>
        p.province.toLowerCase().includes(q) ||
        p.capital.toLowerCase().includes(q) ||
        p.region.toLowerCase().includes(q)
    );
  }, [provinceFilter]);

  const filteredCampuses = useMemo(() => {
    const q = provinceFilter.trim().toLowerCase();
    const list = ZIMBABWE_PLACES.filter((p) => p.has3DCampus && p.campusSlug);
    if (!q) return list;
    return list.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.shortName.toLowerCase().includes(q) ||
        c.province.toLowerCase().includes(q) ||
        c.city.toLowerCase().includes(q)
    );
  }, [provinceFilter]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let disposed = false;
    setOsmPois([]);
    setLoadProgress({
      label: `Loading ${activeTitle} (${activeSub}) OpenStreetMap voxels…`,
      pct: 12,
    });
    setSelectedLandmark(null);
    setControlMode("orbit");
    setRideInfo(null);
    setStreetInfo(null);

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xd8a878);
    scene.fog = new THREE.FogExp2(0xd8a878, 0.00024);

    const camera = new THREE.PerspectiveCamera(48, width / height, 2, 16000);
    let startTarget: [number, number] = [0, 0];
    let startOffset: [number, number, number] = [-720, 520, 920];
    if (isHarare) {
      const preset = HARARE_CAMERA_PRESETS[initialView || "overview"] || HARARE_CAMERA_PRESETS.overview;
      startTarget = latLonToWorldMeters(preset.lat, preset.lon, activeLat, activeLon);
      startOffset = preset.offset;
    }
    camera.position.set(
      startTarget[0] + startOffset[0],
      startOffset[1],
      startTarget[1] + startOffset[2]
    );

    // Phones get a lower pixel density, smaller shadows and less streamed detail.
    const lite = isLiteDevice();
    const maxPixelRatio = Math.min(window.devicePixelRatio, lite ? 1.5 : 2);
    const renderer = new THREE.WebGLRenderer({ antialias: !lite, powerPreference: "high-performance" });
    renderer.setPixelRatio(maxPixelRatio * renderScaleRef.current);
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    // The shadow pass redraws every building, so it only runs when the sun or the
    // city actually changed (see the frame loop), not on every frame.
    renderer.shadowMap.autoUpdate = false;
    const shadowSunPos = new THREE.Vector3(Infinity, 0, 0);
    let shadowAt = 0;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    container.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(startTarget[0], 12, startTarget[1]);
    controls.enableDamping = true;
    controls.dampingFactor = 0.07;
    controls.maxPolarAngle = Math.PI * 0.485;
    controls.minDistance = 28;
    controls.maxDistance = 4200;
    controls.update();

    const hemiLight = new THREE.HemisphereLight(0xffe7cc, 0x263240, 0.72);
    scene.add(hemiLight);

    const sunLight = new THREE.DirectionalLight(0xffdfb4, 2.2);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.setScalar(lite ? 1024 : 2048);
    sunLight.shadow.camera.near = 100;
    sunLight.shadow.camera.far = 6500;
    const shadowBound = 2000;
    sunLight.shadow.camera.left = -shadowBound;
    sunLight.shadow.camera.right = shadowBound;
    sunLight.shadow.camera.top = shadowBound;
    sunLight.shadow.camera.bottom = -shadowBound;
    sunLight.shadow.bias = -0.0008;
    scene.add(sunLight);
    scene.add(sunLight.target);

    const waterGeo = new THREE.PlaneGeometry(16000, 14000, 1, 1);
    const isVictoriaFalls = campusProfile?.campusSlug === "victoria-falls";
    const hasWaterBackdrop =
      provinceProfile.waterType !== "none" || isVictoriaFalls;
    const waterMat = new THREE.MeshStandardMaterial({
      color: isVictoriaFalls ? 0x1f8fd4 : hasWaterBackdrop ? 0x164258 : 0x282622,
      roughness: isVictoriaFalls ? 0.55 : hasWaterBackdrop ? 0.28 : 0.92,
      metalness: isVictoriaFalls ? 0.08 : hasWaterBackdrop ? 0.42 : 0.04,
      emissive: isVictoriaFalls ? 0x0a4a7a : 0x000000,
      emissiveIntensity: isVictoriaFalls ? 0.18 : 0,
    });
    const waterPlane = new THREE.Mesh(waterGeo, waterMat);
    waterPlane.rotation.x = -Math.PI / 2;
    waterPlane.position.y = 0.25;
    waterPlane.receiveShadow = true;
    scene.add(waterPlane);

    const nightUniform = { value: 0.0 };
    const voxelMat = new THREE.MeshLambertMaterial({ vertexColors: true });
    voxelMat.onBeforeCompile = (shader) => {
      shader.uniforms.uNight = nightUniform;
      shader.vertexShader = shader.vertexShader
        .replace(
          "#include <common>",
          `#include <common>
           attribute vec3 aGlow;
           varying vec3 vGlow;
           varying vec3 vWorldPos;`
        )
        .replace(
          "#include <begin_vertex>",
          `#include <begin_vertex>
           vGlow = aGlow;
           vWorldPos = (modelMatrix * vec4(transformed, 1.0)).xyz;`
        );
      shader.fragmentShader = shader.fragmentShader
        .replace(
          "#include <common>",
          `#include <common>
           uniform float uNight;
           varying vec3 vGlow;
           varying vec3 vWorldPos;`
        )
        .replace(
          "#include <dithering_fragment>",
          `
           float fy = fract(vWorldPos.y / 3.0);
           float fxz = fract((vWorldPos.x + vWorldPos.z) / 3.0);
           if (vWorldPos.y > 2.2) {
             float slab = smoothstep(0.0, 0.14, fy);
             gl_FragColor.rgb *= mix(0.88, 1.0, slab);
             float winY = step(0.26, fy) * step(fy, 0.74);
             float winX = step(0.22, fxz) * step(fxz, 0.76);
             gl_FragColor.rgb += vGlow * winY * winX * uNight * 1.15;
           } else {
             gl_FragColor.rgb += vGlow * uNight * 1.1;
           }
           #include <dithering_fragment>`
        );
    };

    const rainCount = 3500;
    const rainGeo = new THREE.BufferGeometry();
    const rainPos = new Float32Array(rainCount * 3);
    for (let i = 0; i < rainCount; i++) {
      rainPos[i * 3] = (Math.random() - 0.5) * 1600;
      rainPos[i * 3 + 1] = Math.random() * 450;
      rainPos[i * 3 + 2] = (Math.random() - 0.5) * 1600;
    }
    rainGeo.setAttribute("position", new THREE.BufferAttribute(rainPos, 3));
    const rainPoints = new THREE.Points(
      rainGeo,
      new THREE.PointsMaterial({ color: 0xcbd5e1, size: 2.2, transparent: true, opacity: 0.55 })
    );
    rainPoints.visible = false;
    scene.add(rainPoints);

    const groundGroup = new THREE.Group();
    groundGroup.name = "voxel-ground";
    scene.add(groundGroup);
    const featureGroup = new THREE.Group();
    featureGroup.name = "voxel-features";
    scene.add(featureGroup);
    const trafficGroup = new THREE.Group();
    scene.add(trafficGroup);
    const pedGroup = new THREE.Group();
    scene.add(pedGroup);
    const satTrackGroup = new THREE.Group();
    satTrackGroup.name = "sat-pass-track";
    scene.add(satTrackGroup);

    const storedTrack =
      typeof window !== "undefined" &&
      new URLSearchParams(window.location.search).get("satTrack") === "1"
        ? readPassTrack()
        : null;
    if (storedTrack && storedTrack.track.length >= 2) {
      const pts = storedTrack.track.map((p) => {
        const [x, z] = latLonToWorldMeters(p.lat, p.lon, activeLat, activeLon);
        const y = 40 + Math.min(220, p.altKm * 0.015);
        return new THREE.Vector3(x, y, z);
      });
      const geo = new THREE.BufferGeometry().setFromPoints(pts);
      const line = new THREE.Line(
        geo,
        new THREE.LineBasicMaterial({ color: 0x4cb82a, linewidth: 2 })
      );
      satTrackGroup.add(line);
      const mid = pts[Math.floor(pts.length / 2)];
      const marker = new THREE.Mesh(
        new THREE.SphereGeometry(18, 12, 12),
        new THREE.MeshBasicMaterial({ color: 0x62b4e8 })
      );
      marker.position.copy(mid);
      satTrackGroup.add(marker);
      controls.target.set(mid.x, 20, mid.z);
      camera.position.set(mid.x - 420, 280, mid.z + 520);
      controls.update();
    }

    const highlightGroup = new THREE.Group();
    highlightGroup.name = "search-highlight";
    scene.add(highlightGroup);
    const highlightMat = new THREE.MeshBasicMaterial({
      color: 0xffd200,
      transparent: true,
      opacity: 0.8,
      depthWrite: false,
      side: THREE.DoubleSide,
      toneMapped: false,
    });
    const addStreetRibbon = (points: [number, number][]) => {
      if (points.length < 2) return;
      // Just above the road surface, wide enough to read from the air.
      highlightGroup.add(new THREE.Mesh(buildRibbonGeometry(points, 7, 2.1), highlightMat));
    };
    const clearHighlight = () => {
      for (const child of highlightGroup.children) (child as THREE.Mesh).geometry.dispose();
      highlightGroup.clear();
    };

    let satGround: SatelliteGround | null = null;
    let satelliteReady = false;
    let streetLights: StreetLights | null = null;
    let cityRoutes: RouteLine[] = [];

    function applyMapStyle(mode: MapStyleMode) {
      const showSat = mode !== "voxel";
      const satUp = showSat && satelliteReady;
      const showStreetLife = mode !== "satellite";
      if (satGround) satGround.group.visible = satUp;
      // Keep voxel ground until imagery is ready so the switch never blanks the scene
      groundGroup.visible = mode === "voxel" || (showSat && !satelliteReady);
      featureGroup.visible = showStreetLife;
      waterPlane.visible = !satUp;
      trafficGroup.visible = showStreetLife;
      pedGroup.visible = showStreetLife;
      if (streetLights) streetLights.group.visible = showStreetLife;
      if (controlModeRef.current === "orbit") {
        controls.maxDistance = mode === "satellite" ? 9000 : 4200;
      }
    }

    const vehicles: VehicleInstance[] = [];
    const pedestrians: PedestrianInstance[] = [];
    let activeRideIdx = 0;
    let activePedIdx = 0;
    let snapPedCam = false;

    let flyAnim: {
      active: boolean;
      startPos: THREE.Vector3;
      endPos: THREE.Vector3;
      startTarget: THREE.Vector3;
      endTarget: THREE.Vector3;
      t: number;
    } | null = null;

    const keysDown = new Set<string>();
    const onKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === "INPUT") return;
      keysDown.add(e.key.toLowerCase());
    };
    const onKeyUp = (e: KeyboardEvent) => {
      keysDown.delete(e.key.toLowerCase());
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);

    function setOrbitCameraConstraints(isStreet: boolean) {
      if (isStreet) {
        controls.enabled = true;
        controls.minDistance = 0.5;
        controls.maxDistance = 10;
        controls.minPolarAngle = Math.PI * 0.2;
        controls.maxPolarAngle = Math.PI * 0.64;
      } else {
        controls.enabled = true;
        controls.minDistance = 28;
        controls.maxDistance = 4200;
        controls.minPolarAngle = 0;
        controls.maxPolarAngle = Math.PI * 0.485;
      }
    }

    function findNearestStreetPoint(refX: number, refZ: number) {
      let bestDist = Infinity;
      const bestPos = new THREE.Vector3(refX, 3.6, refZ);
      const bestDir = new THREE.Vector3(0, 0, 1);
      let bestName = `${provinceProfile.capital} Avenue`;

      const roadCandidates = vehicles.filter((v) => v.kind !== "ferry");
      for (const v of roadCandidates) {
        const pts = v.route.pts;
        for (let i = 0; i < pts.length - 1; i++) {
          const mx = (pts[i][0] + pts[i + 1][0]) * 0.5;
          const my = (pts[i][1] + pts[i + 1][1]) * 0.5;
          const mz = (pts[i][2] + pts[i + 1][2]) * 0.5;
          const d = Math.hypot(mx - refX, mz - refZ);
          if (d < bestDist) {
            bestDist = d;
            bestDir.set(pts[i + 1][0] - pts[i][0], 0, pts[i + 1][2] - pts[i][2]).normalize();
            const perpX = -bestDir.z * 3.6;
            const perpZ = bestDir.x * 3.6;
            bestPos.set(mx + perpX, my + 0.6, mz + perpZ);
            bestName = v.route.name;
          }
        }
      }
      return { pos: bestPos, dir: bestDir, name: bestName };
    }

    function exitToFly() {
      setControlMode("orbit");
      setRideInfo(null);
      setStreetInfo(null);
      setOrbitCameraConstraints(false);
      const cur = controls.target.clone();
      camera.position.set(cur.x - 240, 190, cur.z + 280);
      controls.target.set(cur.x, 14, cur.z);
      controls.update();
    }

    function startRide(vehicle: VehicleInstance) {
      activeRideIdx = vehicles.indexOf(vehicle) + 1;
      setControlMode("ride");
      setStreetInfo(null);
      setSelectedLandmark(null);
      setRideInfo({
        kind: vehicleLabel(vehicle.kind, provinceProfile.capital),
        route: vehicle.route.name,
        speedKmh: Math.round(vehicle.speedMps * 3.6),
      });
      controls.enabled = false;
    }

    function followPedestrian(ped: PedestrianInstance, firstPerson: boolean) {
      activePedIdx = pedestrians.indexOf(ped) + 1;
      snapPedCam = true;
      setControlMode("pedestrian");
      setRideInfo(null);
      setSelectedLandmark(null);
      setStreetInfo({ streetName: ped.route.name, personName: ped.label, firstPerson });
      controls.enabled = false;
    }

    sceneActionsRef.current = {
      flyToLatLon: (lat, lon, offset = [-340, 200, 390]) => {
        const [wx, wz] = latLonToWorldMeters(lat, lon, activeLat, activeLon);
        setControlMode("orbit");
        setRideInfo(null);
        setStreetInfo(null);
        setOrbitCameraConstraints(false);
        flyAnim = {
          active: true,
          startPos: camera.position.clone(),
          endPos: new THREE.Vector3(wx + offset[0], offset[1], wz + offset[2]),
          startTarget: controls.target.clone(),
          endTarget: new THREE.Vector3(wx, 18, wz),
          t: 0,
        };
      },
      cycleRide: (preferredKind) => {
        if (vehicles.length === 0 || !trafficGroup.visible) return;
        const limit = isHarare ? 3200 : 1500;
        const coreVehicles = vehicles.filter((v) => {
          const mid = v.route.pts[Math.floor(v.route.pts.length / 2)];
          return Math.abs(mid[0]) < limit && Math.abs(mid[2]) < limit;
        });
        const basePool = coreVehicles.length > 0 ? coreVehicles : vehicles;
        const pool = preferredKind ? basePool.filter((v) => v.kind === preferredKind) : basePool;
        const list = pool.length > 0 ? pool : basePool;
        startRide(list[activeRideIdx % list.length]);
      },
      enterStreetView: (lat, lon) => {
        let refX = controls.target.x;
        let refZ = controls.target.z;
        if (typeof lat === "number" && typeof lon === "number") {
          const [wx, wz] = latLonToWorldMeters(lat, lon, activeLat, activeLon);
          refX = wx;
          refZ = wz;
        }
        const snapped = findNearestStreetPoint(refX, refZ);
        setControlMode("street");
        setRideInfo(null);
        setStreetInfo({ streetName: snapped.name });
        setOrbitCameraConstraints(true);
        flyAnim = null;

        camera.position.copy(snapped.pos);
        controls.target.set(
          snapped.pos.x + snapped.dir.x * 6,
          snapped.pos.y,
          snapped.pos.z + snapped.dir.z * 6
        );
        controls.update();
      },
      followNextPedestrian: () => {
        if (pedestrians.length === 0 || !pedGroup.visible) return;
        followPedestrian(pedestrians[activePedIdx % pedestrians.length], streetFpvRef.current);
      },
      togglePedestrianFpv: () => {
        setStreetInfo((prev) =>
          prev ? { ...prev, firstPerson: !prev.firstPerson } : prev
        );
      },
      exitToFly,
      setMapStyle: (mode) => {
        // Pure imagery has no traffic or pedestrians to ride with.
        if (mode === "satellite" && controlModeRef.current !== "orbit") exitToFly();
        setMapStyle(mode);
        applyMapStyle(mode);
        if (mode !== "voxel") ensureSatellite();
        if (mode === "satellite") {
          // Swing to a near top-down view, the way imagery is meant to be read.
          const target = controls.target.clone();
          const dist = Math.max(400, camera.position.distanceTo(target));
          flyAnim = {
            active: true,
            startPos: camera.position.clone(),
            endPos: new THREE.Vector3(target.x, dist, target.z + dist * 0.12),
            startTarget: target,
            endTarget: target,
            t: 0,
          };
        }
      },
      highlightPlace: (lat, lon, streetName) => {
        clearHighlight();
        const [wx, wz] = latLonToWorldMeters(lat, lon, activeLat, activeLon);
        const pin = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.4, 90, 12), highlightMat);
        pin.position.set(wx, 46, wz);
        highlightGroup.add(pin);
        if (!streetName) return;
        const wanted = streetName.toLowerCase();
        for (const route of cityRoutes) {
          if (route.name.toLowerCase() === wanted) addStreetRibbon(route.pts.map((p) => [p[0], p[2]]));
        }
      },
      addStreetPaths: (paths) => {
        for (const path of paths) {
          addStreetRibbon(path.map(([lat, lon]) => latLonToWorldMeters(lat, lon, activeLat, activeLon)));
        }
      },
      clearHighlight,
      clearPassTrack: () => satTrackGroup.clear(),
    };

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let pointerDownXY = [0, 0];
    const onPointerDown = (e: PointerEvent) => {
      pointerDownXY = [e.clientX, e.clientY];
    };
    const onPointerUp = (e: PointerEvent) => {
      if (Math.hypot(e.clientX - pointerDownXY[0], e.clientY - pointerDownXY[1]) > 5) return;
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);

      // Nothing to click while pure satellite imagery hides street life.
      if (!trafficGroup.visible) return;

      if (pedestrians.length > 0) {
        const pedHits = raycaster.intersectObjects(pedGroup.children, true);
        if (pedHits.length > 0) {
          let obj: THREE.Object3D | null = pedHits[0].object;
          while (obj && obj.parent !== pedGroup) obj = obj.parent;
          const ped = pedestrians.find((p) => p.mesh === obj);
          if (ped) {
            followPedestrian(ped, false);
            return;
          }
        }
      }

      if (vehicles.length === 0) return;
      const hits = raycaster.intersectObjects(trafficGroup.children, true);
      if (hits.length > 0) {
        let obj: THREE.Object3D | null = hits[0].object;
        while (obj && obj.parent !== trafficGroup) obj = obj.parent;
        const vehicle = vehicles.find((v) => v.mesh === obj);
        if (vehicle) startRide(vehicle);
      }
    };
    renderer.domElement.addEventListener("pointerdown", onPointerDown);
    renderer.domElement.addEventListener("pointerup", onPointerUp);

    let pendingChunks: { cx: number; cz: number; dist: number }[] = [];
    let gridData: ReturnType<typeof parseVoxelBinary> | null = null;
    let paletteRgb: [number, number, number][] = [];
    let builtChunks = 0;
    let totalChunks = 0;
    let totalTris = 0;
    let totalBuildings = 0;

    function ensureSatellite() {
      if (satGround || !gridData) return;
      const ground = new SatelliteGround({
        centerLat: activeLat,
        centerLon: activeLon,
        halfWM: gridData.halfWM,
        halfHM: gridData.halfHM,
        anisotropy: renderer.capabilities.getMaxAnisotropy(),
        lite,
      });
      satGround = ground;
      scene.add(ground.group);
      setSatLoading(true);
      void ground.loadBase().then((ok) => {
        if (disposed) return;
        setSatLoading(false);
        if (ok) {
          satelliteReady = true;
          applyMapStyle(mapStyleRef.current);
          return;
        }
        // Imagery unreachable: fall back to the voxel map and allow a retry.
        console.warn("Satellite imagery failed to load");
        scene.remove(ground.group);
        ground.dispose();
        satGround = null;
        setMapStyle("voxel");
        applyMapStyle("voxel");
      });
    }

    async function loadCity() {
      try {
        const { meta: metaUrl, world: binUrl } = worldFiles(searchSlug);

        setLoadProgress({ label: `Fetching ${activeTitle} road & transit routes…`, pct: 22 });
        // Both at once; the world is most of the wait.
        const binFetch = fetch(binUrl);
        binFetch.catch(() => {}); // Reported below, if the meta gets that far.
        const metaRes = await fetch(metaUrl);
        const meta: VoxelMeta = await metaRes.json();
        if (disposed) return;

        if (Array.isArray(meta.pois) && meta.pois.length > 0) {
          setOsmPois(
            meta.pois
              .filter((p) => p.name && p.name.trim().length > 2 && !/^\d+$/.test(p.name.trim()))
              .slice(0, 14)
              .map((p) => ({
              id: `osm-poi-${p.id}`,
              name: p.name,
              district: `${activeTitle} · ${activeSub}`,
              lat: p.lat,
              lon: p.lon,
              elevationM: 28,
              importance: 2 as const,
              category:
                p.kind === "university" || p.kind === "college" ? "university" : "landmark",
              summary: `${p.name} — real OpenStreetMap feature inside ${activeTitle}.`,
              vibeNote: "Click Street View Here to walk past this building at ground level.",
              rentEstimate: p.kind,
              guideSlug: campusProfile?.guideSlug || "visiting-zimbabwe",
            }))
          );
        }

        totalBuildings = meta.stats?.buildings || 0;
        setHudStats((prev) => ({ ...prev, buildingsCount: totalBuildings }));
        setLoadProgress({
          label: `Streaming ${activeTitle} (${totalBuildings.toLocaleString()} OSM buildings)…`,
          pct: 55,
        });
        // Worlds are stored gzipped (Harare is 27 MB raw, under 1 MB packed).
        const binRes = await binFetch;
        if (!binRes.ok) throw new Error(`World file missing: ${binUrl}`);
        const buf = await gunzipIfNeeded(await binRes.arrayBuffer());
        if (disposed) return;

        gridData = parseVoxelBinary(buf, meta);
        paletteRgb = buildPaletteRgb(meta.palette);

        cityRoutes = meta.routes || [];
        streetLights = new StreetLights(cityRoutes, gridData, lite);
        scene.add(streetLights.group);
        const beamMaterial = streetLights.poolMaterial;

        if (mapStyleRef.current !== "voxel") ensureSatellite();

        const cols = Math.ceil(gridData.gridW / CHUNK_CELLS);
        const rows = Math.ceil(gridData.gridH / CHUNK_CELLS);
        totalChunks = cols * rows;

        const targetX = controls.target.x;
        const targetZ = controls.target.z;

        const queue: { cx: number; cz: number; dist: number }[] = [];
        for (let cz = 0; cz < rows; cz++) {
          for (let cx = 0; cx < cols; cx++) {
            const worldX = (cx + 0.5) * CHUNK_CELLS * gridData.cellM - gridData.halfWM;
            const worldZ = (cz + 0.5) * CHUNK_CELLS * gridData.cellM - gridData.halfHM;
            queue.push({ cx, cz, dist: Math.hypot(worldX - targetX, worldZ - targetZ) });
          }
        }
        queue.sort((a, b) => a.dist - b.dist);
        pendingChunks = queue;

        cityRoutes.forEach((route, rIdx) => {
          const segLengths: number[] = [];
          let totalLen = 0;
          for (let i = 0; i < route.pts.length - 1; i++) {
            const len = Math.hypot(
              route.pts[i + 1][0] - route.pts[i][0],
              route.pts[i + 1][2] - route.pts[i][2]
            );
            segLengths.push(len);
            totalLen += len;
          }
          if (totalLen < 50) return;

          const midPt = route.pts[Math.floor(route.pts.length / 2)];
          const insideGrid =
            Math.abs(midPt[0]) < meta.halfWM - 280 &&
            Math.abs(midPt[2]) < meta.halfHM - 240;
          if (route.kind !== "ferry" && route.kind !== "bridge" && insideGrid && pedestrians.length < 110) {
            const pedCount = 3;
            for (let p = 0; p < pedCount; p++) {
              const seed = rIdx * 13 + p * 7;
              const built = buildPedestrianMesh(seed);
              pedGroup.add(built.group);
              let initProgress = ((p + 0.35) / pedCount) * totalLen * 0.8 + Math.random() * 35;
              let accLen = 0;
              for (let s = 0; s < segLengths.length; s++) {
                const pt = route.pts[s];
                if (
                  Math.abs(pt[0]) < meta.halfWM - 350 &&
                  Math.abs(pt[2]) < meta.halfHM - 300
                ) {
                  initProgress = accLen + segLengths[s] * (0.2 + p * 0.25);
                  break;
                }
                accLen += segLengths[s];
              }

              pedestrians.push({
                mesh: built.group,
                leftLeg: built.leftLeg,
                rightLeg: built.rightLeg,
                leftArm: built.leftArm,
                rightArm: built.rightArm,
                route,
                label: PEDESTRIAN_NAMES[seed % PEDESTRIAN_NAMES.length],
                progress: Math.min(totalLen - 1, initProgress),
                dirSign: (seed % 2 === 0 ? 1 : -1) as 1 | -1,
                sideOffset: seed % 2 === 0 ? 3.5 : -3.5,
                speedMps: 1.45 + (seed % 5) * 0.14,
                stridePhase: Math.random() * Math.PI * 2,
                segLengths,
                totalLen,
              });
            }
          }

          const count = route.kind === "ferry" ? 3 : route.kind === "bridge" ? 3 : 2;
          for (let k = 0; k < count; k++) {
            const kind: VehicleInstance["kind"] =
              route.kind === "ferry"
                ? "ferry"
                : (rIdx + k) % 5 === 0
                ? "zupco"
                : (rIdx + k) % 2 === 0
                ? "kombi"
                : "car";
            const mesh = buildVehicleMesh(kind, beamMaterial);
            trafficGroup.add(mesh);
            vehicles.push({
              mesh,
              route,
              kind,
              progress: (k / count) * totalLen + Math.random() * 60,
              speedMps:
                kind === "ferry"
                  ? 11
                  : kind === "zupco"
                  ? 18
                  : kind === "kombi"
                  ? 16 + Math.random() * 6
                  : 19 + Math.random() * 6,
              segLengths,
              totalLen,
            });
          }
        });

        setLoadProgress({ label: `Meshing ${provinceProfile.capital} 3D voxels…`, pct: 80 });
      } catch (err) {
        console.error(`Failed loading ${provinceProfile.slug} voxel world:`, err);
        setLoadProgress(null);
      }
    }

    loadCity();

    const vPos = new THREE.Vector3();
    const vDir = new THREE.Vector3();
    const projVec = new THREE.Vector3();
    const fwdVec = new THREE.Vector3();
    const rightVec = new THREE.Vector3();

    let lastTime = performance.now();
    let fpsAccum = 0;
    let fpsFrames = 0;
    let slowSamples = 0;
    let currentFps = 60;
    let raf = 0;
    let lastRenderScale = renderScaleRef.current;

    const animate = () => {
      raf = requestAnimationFrame(animate);
      const now = performance.now();
      const dt = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;

      if (Math.abs(renderScaleRef.current - lastRenderScale) > 0.01) {
        lastRenderScale = renderScaleRef.current;
        renderer.setPixelRatio(maxPixelRatio * lastRenderScale);
      }

      if (gridData && pendingChunks.length > 0) {
        const startT = performance.now();
        const waterOpt = isVictoriaFalls
          ? ([0.1, 0.48, 0.78] as [number, number, number])
          : undefined;
        while (pendingChunks.length > 0 && performance.now() - startT < 12) {
          const next = pendingChunks.shift()!;
          const groundGeo = buildChunkGeometry(gridData, next.cx, next.cz, paletteRgb, {
            waterRgb: waterOpt,
            layer: "ground",
          });
          const featureGeo = buildChunkGeometry(gridData, next.cx, next.cz, paletteRgb, {
            waterRgb: waterOpt,
            layer: "features",
          });
          builtChunks++;
          if (groundGeo) {
            const mesh = new THREE.Mesh(groundGeo, voxelMat);
            mesh.receiveShadow = true;
            groundGroup.add(mesh);
            totalTris += (groundGeo.index ? groundGeo.index.count : 0) / 3;
          }
          if (featureGeo) {
            const mesh = new THREE.Mesh(featureGeo, voxelMat);
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            featureGroup.add(mesh);
            totalTris += (featureGeo.index ? featureGeo.index.count : 0) / 3;
          }
        }
        applyMapStyle(mapStyleRef.current);
        if (pendingChunks.length === 0 || builtChunks > 36) {
          setLoadProgress(null);
        }
      }

      const h = hourRef.current;
      const day = dayRef.current;
      const wMode = weatherRef.current;

      const solarAngle = ((h - 6.0) / 12.2) * Math.PI;
      const sunSin = Math.sin(solarAngle);
      const sunCos = Math.cos(solarAngle);
      const sunAz = (day / 365 - 0.5) * 0.45;

      sunLight.position.set(
        controls.target.x + sunCos * 1800,
        Math.max(120, sunSin * 1900),
        controls.target.z + Math.sin(sunAz) * 900 - 450
      );
      sunLight.target.position.set(controls.target.x, 0, controls.target.z);
      if (
        pendingChunks.length > 0 ||
        now - shadowAt > 500 ||
        sunLight.position.distanceToSquared(shadowSunPos) > 25 * 25
      ) {
        renderer.shadowMap.needsUpdate = true;
        shadowSunPos.copy(sunLight.position);
        shadowAt = now;
      }

      const isDay = sunSin > 0;
      const goldenFactor = Math.max(0, 1 - Math.abs(sunSin) * 3.2);
      const nightFactor = THREE.MathUtils.clamp((-sunSin + 0.08) * 3.0, 0, 1);
      nightUniform.value = nightFactor;

      const skyColor = new THREE.Color();
      if (wMode === "haze") {
        skyColor.setRGB(
          isDay ? 0.78 - nightFactor * 0.65 : 0.07,
          isDay ? 0.66 - nightFactor * 0.54 : 0.06,
          isDay ? 0.52 - nightFactor * 0.42 : 0.07
        );
      } else if (wMode === "rain" || wMode === "cloudy") {
        const overcast = wMode === "rain" ? 0.36 : 0.56;
        skyColor.setRGB(
          overcast * (1 - nightFactor * 0.85),
          (overcast + 0.03) * (1 - nightFactor * 0.85),
          (overcast + 0.08) * (1 - nightFactor * 0.78)
        );
      } else {
        const daySky = new THREE.Color(wMode === "clear" ? 0x6ba7d9 : 0x89b7d6);
        const goldenSky = new THREE.Color(0xd98b5f);
        const nightSky = new THREE.Color(0x090d16);
        skyColor.copy(daySky).lerp(goldenSky, goldenFactor * 0.75).lerp(nightSky, nightFactor);
      }

      scene.background = skyColor;
      const fogDensity =
        wMode === "haze"
          ? 0.00048
          : wMode === "rain"
          ? 0.00044
          : wMode === "clear"
          ? 0.00014
          : 0.00023;
      if (mapStyleRef.current === "satellite") {
        scene.fog = null;
      } else if (scene.fog instanceof THREE.FogExp2) {
        scene.fog.color.copy(skyColor);
        scene.fog.density = fogDensity;
      } else {
        scene.fog = new THREE.FogExp2(skyColor.getHex(), fogDensity);
      }
      streetLights?.update(nightFactor, camera, now);

      sunLight.intensity =
        (wMode === "rain" ? 0.65 : wMode === "cloudy" ? 0.95 : wMode === "haze" ? 1.45 : 2.35) *
        Math.max(0.24, sunSin + 0.14) *
        (1 - nightFactor * 0.72);
      sunLight.color.setHex(0xfff1d6).lerp(new THREE.Color(0xff9248), goldenFactor * 0.85);
      hemiLight.intensity = 0.44 + (1 - nightFactor) * 0.45;
      if (isVictoriaFalls) {
        waterMat.color
          .setHex(
            wMode === "haze" ? 0x3a9ab8 : wMode === "rain" ? 0x1878b8 : wMode === "clear" ? 0x2a9ae0 : 0x1f8fd4
          )
          .lerp(new THREE.Color(0x0c3d66), nightFactor * 0.45);
        waterMat.emissiveIntensity = 0.22 - nightFactor * 0.1;
      } else if (hasWaterBackdrop) {
        waterMat.color
          .setHex(wMode === "haze" ? 0x2b454e : 0x15465e)
          .lerp(new THREE.Color(0x0b1c2d), nightFactor * 0.65);
      } else {
        waterMat.color
          .setHex(0x282622)
          .lerp(new THREE.Color(0x0f1014), nightFactor * 0.75);
      }

      rainPoints.visible = wMode === "rain";
      if (wMode === "rain") {
        rainPoints.position.set(controls.target.x, 0, controls.target.z);
        const arr = rainGeo.attributes.position.array as Float32Array;
        for (let i = 1; i < arr.length; i += 3) {
          arr[i] -= 260 * dt;
          if (arr[i] < 0) arr[i] = 440;
        }
        rainGeo.attributes.position.needsUpdate = true;
      }

      if (flyAnim && flyAnim.active) {
        flyAnim.t = Math.min(1, flyAnim.t + dt * 1.45);
        const ease = 1 - Math.pow(1 - flyAnim.t, 3);
        camera.position.lerpVectors(flyAnim.startPos, flyAnim.endPos, ease);
        controls.target.lerpVectors(flyAnim.startTarget, flyAnim.endTarget, ease);
        if (flyAnim.t >= 1) flyAnim.active = false;
      }

      for (const v of vehicles) {
        v.progress = (v.progress + v.speedMps * dt) % v.totalLen;
        sampleRoutePoint(v, v.progress, vPos, vDir);
        v.mesh.position.copy(vPos);
        if (v.kind !== "ferry") v.mesh.position.y -= ROUTE_HEIGHT_ABOVE_ROAD;
        if (vDir.lengthSq() > 0.001) {
          v.mesh.rotation.y = Math.atan2(vDir.x, vDir.z);
        }
      }

      for (const ped of pedestrians) {
        ped.progress += ped.speedMps * ped.dirSign * dt;
        if (ped.progress >= ped.totalLen) {
          ped.progress = ped.totalLen;
          ped.dirSign = -1;
        } else if (ped.progress <= 0) {
          ped.progress = 0;
          ped.dirSign = 1;
        }
        sampleRoutePoint(ped, ped.progress, vPos, vDir);
        if (vDir.lengthSq() > 0.001) {
          const inBound =
            gridData &&
            (Math.abs(vPos.x) > gridData.halfWM - 160 || Math.abs(vPos.z) > gridData.halfHM - 160);
          if (inBound) {
            ped.dirSign = (ped.dirSign === 1 ? -1 : 1) as 1 | -1;
            ped.progress = THREE.MathUtils.clamp(
              ped.progress + ped.speedMps * ped.dirSign * 2,
              0,
              ped.totalLen
            );
          }
          const perpX = -vDir.z * ped.sideOffset;
          const perpZ = vDir.x * ped.sideOffset;
          ped.mesh.position.set(vPos.x + perpX, vPos.y - 1.55, vPos.z + perpZ);
          const walkYaw = Math.atan2(vDir.x * ped.dirSign, vDir.z * ped.dirSign);
          ped.mesh.rotation.y = walkYaw;
        }
        ped.stridePhase += dt * ped.speedMps * 4.8;
        const swing = Math.sin(ped.stridePhase) * 0.55;
        ped.leftLeg.rotation.x = swing;
        ped.rightLeg.rotation.x = -swing;
        ped.leftArm.rotation.x = -swing * 0.75;
        ped.rightArm.rotation.x = swing * 0.75;
      }

      const mode = controlModeRef.current;
      if (mode === "ride" && vehicles.length > 0) {
        const targetV = vehicles[(activeRideIdx - 1 + vehicles.length) % vehicles.length];
        sampleRoutePoint(targetV, targetV.progress, vPos, vDir);
        const camBack = vPos.clone().sub(vDir.clone().multiplyScalar(28));
        camBack.y += 11;
        camera.position.lerp(camBack, 0.12);
        const lookAhead = vPos.clone().add(vDir.clone().multiplyScalar(42));
        lookAhead.y += 4;
        camera.lookAt(lookAhead);
      } else if (mode === "pedestrian" && pedestrians.length > 0) {
        const ped = pedestrians[(activePedIdx - 1 + pedestrians.length) % pedestrians.length];
        sampleRoutePoint(ped, ped.progress, vPos, vDir);
        const walkDir = vDir.clone().multiplyScalar(ped.dirSign);
        const px = ped.mesh.position.x;
        const py = ped.mesh.position.y;
        const pz = ped.mesh.position.z;
        if (streetFpvRef.current) {
          const bob = Math.abs(Math.sin(ped.stridePhase)) * 0.12;
          camera.position.set(px + walkDir.x * 0.6, py + 2.35 + bob, pz + walkDir.z * 0.6);
          camera.lookAt(px + walkDir.x * 30, py + 2.25, pz + walkDir.z * 30);
        } else {
          const camBack = new THREE.Vector3(
            px - walkDir.x * 8.0,
            py + 4.4,
            pz - walkDir.z * 8.0
          );
          if (snapPedCam) {
            camera.position.copy(camBack);
            snapPedCam = false;
          } else {
            camera.position.lerp(camBack, 0.16);
          }
          camera.lookAt(px + walkDir.x * 16, py + 2.2, pz + walkDir.z * 16);
        }
      } else {
        if (keysDown.size > 0) {
          const speed = (mode === "street" ? 16 : 260) * dt;
          camera.getWorldDirection(fwdVec);
          fwdVec.y = 0;
          fwdVec.normalize();
          rightVec.crossVectors(fwdVec, camera.up).normalize();

          const move = new THREE.Vector3();
          if (keysDown.has("w") || keysDown.has("arrowup")) move.add(fwdVec);
          if (keysDown.has("s") || keysDown.has("arrowdown")) move.sub(fwdVec);
          if (keysDown.has("d") || keysDown.has("arrowright")) move.add(rightVec);
          if (keysDown.has("a") || keysDown.has("arrowleft")) move.sub(rightVec);
          if (move.lengthSq() > 0) {
            move.normalize().multiplyScalar(speed);
            if (mode === "street" && gridData) {
              const nextX = camera.position.x + move.x;
              const nextZ = camera.position.z + move.z;
              const gx = Math.floor((nextX + gridData.halfWM) / gridData.cellM);
              const gz = Math.floor((nextZ + gridData.halfHM) / gridData.cellM);
              const blocked =
                gx >= 0 &&
                gx < gridData.gridW &&
                gz >= 0 &&
                gz < gridData.gridH &&
                gridData.bHeight[gz * gridData.gridW + gx] > 0;
              if (!blocked) {
                camera.position.add(move);
                controls.target.add(move);
              }
            } else {
              camera.position.add(move);
              controls.target.add(move);
            }
          }
        }
        if (mode === "street") {
          const bob = keysDown.size > 0 ? Math.abs(Math.sin(now * 0.008)) * 0.14 : 0;
          camera.position.y = Math.max(3.5, Math.min(camera.position.y, 9.5));
          if (camera.position.y < 5) camera.position.y = 3.6 + bob;
        }
        controls.update();
      }

      // From the air only: at street level the outline would swallow the road.
      highlightGroup.visible = mode === "orbit";

      if (satGround && mapStyleRef.current !== "voxel") {
        // Riding and walking cameras ignore the orbit target, so stream around the camera.
        const focus = mode === "orbit" ? controls.target : camera.position;
        const viewDist = mode === "orbit" ? camera.position.distanceTo(controls.target) : 80;
        satGround.update(focus.x, focus.z, viewDist, now);
        satGround.setBrightness(1 - nightFactor * 0.55);
      }

      renderer.render(scene, camera);

      const labelsEl = labelsLayerRef.current;
      if (labelsEl) {
        const cw = renderer.domElement.clientWidth;
        const ch = renderer.domElement.clientHeight;
        const children = labelsEl.children;
        const activeLandmarks = landmarkWorldRef.current;
        for (let i = 0; i < activeLandmarks.length; i++) {
          const el = children[i] as HTMLElement | undefined;
          if (!el) continue;
          const { lm, pos } = activeLandmarks[i];
          const dist = camera.position.distanceTo(pos);
          projVec.copy(pos).project(camera);

          const behind = projVec.z > 1 || projVec.z < -1;
          const offscreen =
            projVec.x < -1.05 || projVec.x > 1.05 || projVec.y < -1.05 || projVec.y > 1.05;
          const maxDist = lm.importance === 1 ? 6500 : lm.importance === 2 ? 3200 : 1800;

          if (behind || offscreen || dist > maxDist) {
            el.style.opacity = "0";
            el.style.pointerEvents = "none";
          } else {
            const sx = (projVec.x * 0.5 + 0.5) * cw;
            const sy = (-projVec.y * 0.5 + 0.5) * ch;
            el.style.transform = `translate3d(${sx}px, ${sy}px, 0) translate(-50%, -100%)`;
            const fade = THREE.MathUtils.clamp(1 - (dist - maxDist * 0.65) / (maxDist * 0.35), 0.15, 1);
            el.style.opacity = String(fade);
            el.style.pointerEvents = "auto";
          }
        }
      }

      fpsAccum += dt;
      fpsFrames++;
      if (fpsAccum >= 0.6) {
        currentFps = Math.round(fpsFrames / fpsAccum);
        fpsAccum = 0;
        fpsFrames = 0;
        // A phone that stays under 24 fps once the city has loaded gets a softer picture.
        slowSamples = lite && pendingChunks.length === 0 && currentFps < 24 ? slowSamples + 1 : 0;
        if (slowSamples >= 5 && renderScaleRef.current > 0.55) {
          slowSamples = 0;
          setRenderScale((scale) => Math.max(0.55, scale - 0.1));
        }
        setHudStats({
          fps: currentFps,
          chunks: builtChunks,
          totalChunks,
          trisM: (totalTris / 1_000_000).toFixed(2),
          buildingsCount: totalBuildings,
        });
      }
    };

    animate();

    const onResize = () => {
      if (!container) return;
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener("resize", onResize);

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      renderer.domElement.removeEventListener("pointerdown", onPointerDown);
      renderer.domElement.removeEventListener("pointerup", onPointerUp);
      controls.dispose();
      satGround?.dispose();
      streetLights?.dispose();
      clearHighlight();
      highlightMat.dispose();
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [
    initialView,
    isHarare,
    isCampus,
    campusProfile,
    activeLat,
    activeLon,
    activeTitle,
    activeSub,
    provinceProfile,
    searchSlug,
  ]);

  const clearPlace = () => {
    highlightTokenRef.current++;
    setSelectedPlace(null);
    sceneActionsRef.current?.clearHighlight();
  };

  const handleSelectLandmark = (lm: UnifiedLandmark) => {
    clearPlace();
    setSelectedLandmark(lm);
    setLandmarkMinimized(false);
    setSearchQuery("");
    sceneActionsRef.current?.flyToLatLon(lm.lat, lm.lon, [-300, 175, 360]);
  };

  const handleSelectPlace = (place: MapSearchPlace) => {
    const actions = sceneActionsRef.current;
    const token = ++highlightTokenRef.current;
    const isStreet = place.kind === "street";
    setSelectedLandmark(null);
    setSelectedPlace(place);
    setSearchQuery("");
    actions?.flyToLatLon(place.lat, place.lon, [-220, 140, 260]);
    actions?.highlightPlace(place.lat, place.lon, isStreet ? place.name : undefined);
    if (!isStreet) return;
    // The bundled routes only cover main roads; OSM has the full centre line.
    fetchStreetPaths(place.name, { lat: activeLat, lon: activeLon })
      .then((paths) => {
        if (highlightTokenRef.current === token) sceneActionsRef.current?.addStreetPaths(paths);
      })
      .catch(() => {});
  };

  const selectSearchRow = (row: SearchRow) =>
    row.source === "landmark" ? handleSelectLandmark(row.landmark) : handleSelectPlace(row.place);

  return (
    <div className="relative h-[calc(100dvh-4rem)] w-full overflow-hidden bg-[#0c0e0c] select-none touch-none">
      <div ref={containerRef} className="h-full w-full touch-none" />

      {/* Floating Landmark Labels */}
      <div
        ref={labelsLayerRef}
        className={`pointer-events-none absolute inset-0 overflow-hidden transition-opacity ${
          hudHidden ? "opacity-0" : "opacity-100"
        }`}
      >
        {visibleLandmarks.map((lm) => (
          <button
            key={lm.id}
            onClick={() => handleSelectLandmark(lm)}
            className="pointer-events-auto absolute left-0 top-0 flex max-w-[11rem] items-center gap-1.5 rounded-full border border-white/25 bg-[#09090b]/75 px-2 py-1.5 text-[10px] font-medium text-[#f5f4f0] shadow-lg backdrop-blur-md transition-colors hover:border-[#ffd200] hover:bg-[#18181b] sm:max-w-none sm:px-2.5 sm:py-1 sm:text-[11px]"
            style={{ opacity: 0 }}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                lm.category === "university"
                  ? "bg-[#a855f7]"
                  : lm.category === "bridge"
                  ? "bg-[#38bdf8]"
                  : lm.category === "transit"
                  ? "bg-[#4cb82a]"
                  : lm.category === "culture"
                  ? "bg-[#ec4899]"
                  : "bg-[#ffd200]"
              }`}
            />
            <span>{lm.name}</span>
          </button>
        ))}
      </div>

      {passTrackBanner && !loadProgress && (
        <div className="absolute inset-x-3 top-4 z-30 mx-auto flex max-w-lg items-start justify-between gap-3 rounded-xl border border-[#4cb82a]/35 bg-[#0c0e0c]/94 px-3 py-2.5 shadow-2xl backdrop-blur-md sm:inset-x-auto sm:left-4 sm:right-auto">
          <div className="min-w-0 text-xs">
            <div className="font-semibold text-[#4cb82a]">Satellite pass track</div>
            <div className="truncate text-[#e9e5db]">{passTrackBanner.name}</div>
            <div className="font-mono-tech text-[10px] text-[#a4aaa2]">
              max {passTrackBanner.maxElDeg}° over {passTrackBanner.placeLabel} · green path
            </div>
          </div>
          <button
            type="button"
            aria-label="Clear pass track"
            onClick={() => {
              setPassTrackBanner(null);
              sceneActionsRef.current?.clearPassTrack();
              try {
                sessionStorage.removeItem(TRACK_STORAGE_KEY);
              } catch {
                /* ignore */
              }
              const url = new URL(window.location.href);
              url.searchParams.delete("satTrack");
              window.history.replaceState({}, "", url.pathname + url.search);
            }}
            className="shrink-0 rounded border border-[#2b302b] px-2 py-1 text-[10px] text-[#a4aaa2] hover:text-white"
          >
            Clear
          </button>
        </div>
      )}

      {/* Loading Progress */}
      {loadProgress && (
        <div className="pointer-events-none absolute left-4 top-4 z-30 rounded-lg border border-white/15 bg-[#09090b]/85 px-3.5 py-2.5 backdrop-blur-md">
          <div className="flex items-center justify-between gap-6 font-mono-tech text-[11px] text-[#f5f4f0]">
            <span>{loadProgress.label}</span>
            <span className="text-[#ffd200]">{loadProgress.pct}%</span>
          </div>
          <div className="mt-1.5 h-1 w-64 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full bg-[#de2010] transition-all duration-300"
              style={{ width: `${loadProgress.pct}%` }}
            />
          </div>
        </div>
      )}

      {mapStyle !== "voxel" && !hudHidden && (
        <div className="pointer-events-none absolute bottom-2 left-1/2 z-20 -translate-x-1/2 font-mono-tech text-[9px] text-white/55 md:bottom-3">
          {satLoading ? "Loading satellite imagery…" : `${IMAGERY_CREDIT} · zoom in for sharper detail`}
        </div>
      )}

      {/* Clean View restore button when all HUD is hidden */}
      {hudHidden && !loadProgress && (
        <button
          onClick={() => setHudHidden(false)}
          className="absolute right-3 top-3 z-30 inline-flex h-11 items-center gap-1.5 rounded border border-[#2b302b] bg-[#0c0e0c]/92 px-3.5 font-mono-tech text-[11px] font-medium text-[#e9e5db] shadow-xl backdrop-blur-md hover:border-[#ffd200] sm:right-4 sm:top-4 sm:h-auto sm:py-1.5"
        >
          <Maximize2 className="h-3.5 w-3.5 text-[#ffd200]" />
          Show HUD
        </button>
      )}

      {/* Mobile backdrop when navigator sheet is open */}
      {!hudHidden && !loadProgress && isMobile && navPanelOpen && (
        <button
          type="button"
          aria-label="Close navigator"
          className="absolute inset-0 z-30 bg-[#0c0e0c]/55 backdrop-blur-[2px]"
          onClick={() => {
            setProvinceSwitcherOpen(false);
            setPlacesDrawerOpen(false);
            setNavPanelOpen(false);
          }}
        />
      )}

      {/* Top-Left: Province Switcher + Landmark Search + Presets (Minimizable) */}
      {!hudHidden && !loadProgress && (
        <div
          className={`absolute z-40 flex flex-col gap-2 ${
            isMobile && navPanelOpen
              ? "inset-x-3 top-3 max-h-[min(70dvh,32rem)] overflow-y-auto"
              : "left-3 top-3 max-w-[calc(100%-5.75rem)] sm:left-4 sm:top-4 sm:w-84 sm:max-w-none"
          }`}
        >
          {!navPanelOpen ? (
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => {
                  setNavPanelOpen(true);
                  if (isMobile) {
                    setTelemetryOpen(false);
                    setControlsOpen(false);
                  }
                }}
                className="inline-flex max-w-full items-center gap-2 rounded border border-[#2b302b] bg-[#0c0e0c]/92 px-3 py-2.5 text-left shadow-xl backdrop-blur-md transition hover:border-[#ffd200] sm:py-1.5"
              >
                {isCampus ? (
                  <GraduationCap className="h-3.5 w-3.5 shrink-0 text-[#b99cff]" />
                ) : (
                  <MapPin className="h-3.5 w-3.5 shrink-0 text-[#ffd200]" />
                )}
                <span className="truncate text-xs font-semibold text-[#e9e5db]">{activeTitle}</span>
                <span className="hidden font-mono-tech text-[10px] text-[#4cb82a] lg:inline">
                  {hudStats.buildingsCount.toLocaleString()}
                </span>
                <Maximize2 className="ml-0.5 h-3.5 w-3.5 shrink-0 text-[#a4aaa2]" />
              </button>
            </div>
          ) : (
            <>
              <div className="relative flex items-stretch gap-1.5">
                <button
                  onClick={() => setProvinceSwitcherOpen((v) => !v)}
                  className="flex min-w-0 flex-1 items-center justify-between rounded border border-[#2b302b] bg-[#0c0e0c]/96 px-3 py-2.5 text-left shadow-xl backdrop-blur-md transition hover:border-[#ffd200]"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    {isCampus ? (
                      <GraduationCap className="h-4 w-4 shrink-0 text-[#a855f7]" />
                    ) : (
                      <MapPin className="h-4 w-4 shrink-0 text-[#de2010]" />
                    )}
                    <div className="min-w-0">
                      <div className="truncate text-xs font-semibold text-white">
                        {activeTitle}{" "}
                        <span className="font-normal text-[#9a9891]">· {activeSub}</span>
                      </div>
                      <div className="truncate font-mono-tech text-[10px] text-[#4cb82a]">
                        {provinceProfile.region} · {hudStats.buildingsCount.toLocaleString()} OSM buildings
                      </div>
                    </div>
                  </div>
                  <ChevronDown className="ml-1.5 h-4 w-4 shrink-0 text-[#9a9891]" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setProvinceSwitcherOpen(false);
                    setPlacesDrawerOpen(false);
                    setNavPanelOpen(false);
                  }}
                  aria-label="Minimize city navigator"
                  title="Minimize navigator"
                  className="inline-flex w-9 shrink-0 items-center justify-center rounded-xl border border-white/20 bg-[#09090b]/88 text-[#9a9891] shadow-xl backdrop-blur-md transition hover:border-white/35 hover:text-white"
                >
                  <Minus className="h-4 w-4" />
                </button>

                {provinceSwitcherOpen && (
                  <div className="absolute left-0 right-0 top-full z-40 mt-1.5 rounded-xl border border-white/15 bg-[#0d0d12]/98 p-2 shadow-2xl backdrop-blur-xl">
                    <div className="mb-2 grid grid-cols-2 gap-1 rounded-lg border border-white/10 bg-white/[0.03] p-0.5">
                      <button
                        onClick={() => setSwitcherTab("provinces")}
                        className={`rounded-md py-1 text-[11px] font-medium ${
                          switcherTab === "provinces"
                            ? "bg-[#de2010] text-white"
                            : "text-[#9a9891] hover:text-white"
                        }`}
                      >
                        Provinces (10)
                      </button>
                      <button
                        onClick={() => setSwitcherTab("universities")}
                        className={`rounded-md py-1 text-[11px] font-medium ${
                          switcherTab === "universities"
                            ? "bg-[#a855f7] text-white"
                            : "text-[#9a9891] hover:text-white"
                        }`}
                      >
                        Campuses &amp; Icons (11)
                      </button>
                    </div>
                    <input
                      type="text"
                      value={provinceFilter}
                      onChange={(e) => setProvinceFilter(e.target.value)}
                      placeholder={
                        switcherTab === "provinces"
                          ? "Jump to any of Zimbabwe's 10 provinces…"
                          : "Search UZ, NUST, MSU, Victoria Falls, Great Zim…"
                      }
                      className="mb-2 w-full rounded-lg border border-white/15 bg-black/50 px-2.5 py-1.5 text-xs text-white placeholder-[#71717a] focus:border-[#de2010] focus:outline-none"
                    />
                    <div className="max-h-64 overflow-y-auto pr-1">
                      {switcherTab === "provinces"
                        ? filteredProvinces.map((pr) => (
                            <button
                              key={pr.slug}
                              onClick={() => {
                                setProvinceSwitcherOpen(false);
                                setProvinceFilter("");
                                router.push(cityMapHref(pr.slug));
                              }}
                              className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-xs transition ${
                                !isCampus && pr.slug === provinceProfile.slug
                                  ? "bg-[#de2010]/25 text-white"
                                  : "text-[#d4d4d8] hover:bg-white/10"
                              }`}
                            >
                              <div>
                                <span className="font-medium">{pr.capital}</span>
                                <span className="ml-1.5 text-[11px] text-[#9a9891]">{pr.province}</span>
                              </div>
                              <span className="font-mono-tech text-[10px] text-[#71717a]">
                                {airportBadge(pr.airport)}
                              </span>
                            </button>
                          ))
                        : filteredCampuses.map((c) => (
                            <button
                              key={c.id}
                              onClick={() => {
                                setProvinceSwitcherOpen(false);
                                setProvinceFilter("");
                                router.push(`/explore/${c.campusSlug}`);
                              }}
                              className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-xs transition ${
                                campusProfile?.campusSlug === c.campusSlug
                                  ? "bg-[#a855f7]/25 text-white"
                                  : "text-[#d4d4d8] hover:bg-white/10"
                              }`}
                            >
                              <div>
                                <span className="font-medium">{c.shortName}</span>
                                <span className="ml-1.5 text-[11px] text-[#9a9891]">{c.city}</span>
                              </div>
                              <span className="font-mono-tech text-[10px] text-[#a855f7]">
                                3D World
                              </span>
                            </button>
                          ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="relative">
                <div className="flex items-center rounded-xl border border-white/15 bg-[#09090b]/80 px-3 py-2 shadow-xl backdrop-blur-md">
                  <Search className="mr-2 h-4 w-4 text-[#9a9891]" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && searchResults[0]) selectSearchRow(searchResults[0]);
                      else if (e.key === "Escape") setSearchQuery("");
                    }}
                    placeholder={`Search ${activeTitle} streets, places & addresses…`}
                    className="w-full bg-transparent text-xs text-[#f5f4f0] placeholder-[#71717a] focus:outline-none"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="text-[#9a9891] hover:text-white"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                {searchQuery.trim().length >= 2 && (
                  <div className="mt-1.5 overflow-hidden rounded-xl border border-white/15 bg-[#0d0d11]/95 shadow-2xl backdrop-blur-md">
                    {searchResults.length === 0 && !remoteSearching ? (
                      <div className="px-3 py-2 text-[11px] text-[#9a9891]">
                        No street, place, or address matches that yet.
                      </div>
                    ) : searchResults.length === 0 && remoteSearching ? (
                      <div className="px-3 py-2 text-[11px] text-[#9a9891]">
                        Looking up address…
                      </div>
                    ) : (
                      <>
                        {searchResults.map((row) =>
                          row.source === "landmark" ? (
                            <button
                              key={row.landmark.id}
                              onClick={() => handleSelectLandmark(row.landmark)}
                              className="flex w-full items-center justify-between border-b border-white/5 px-3 py-2 text-left text-xs transition last:border-none hover:bg-white/10"
                            >
                              <div>
                                <div className="font-medium text-white">{row.landmark.name}</div>
                                <div className="text-[10px] text-[#9a9891]">
                                  Landmark · {row.landmark.district}
                                </div>
                              </div>
                              <ChevronRight className="h-3.5 w-3.5 text-[#de2010]" />
                            </button>
                          ) : (
                            <button
                              key={row.place.id}
                              onClick={() => handleSelectPlace(row.place)}
                              className="flex w-full items-center justify-between border-b border-white/5 px-3 py-2 text-left text-xs transition last:border-none hover:bg-white/10"
                            >
                              <div>
                                <div className="font-medium text-white">{row.place.name}</div>
                                <div className="text-[10px] capitalize text-[#9a9891]">
                                  {row.place.kind === "street"
                                    ? "Street"
                                    : row.place.kind === "building"
                                    ? "Building"
                                    : row.place.kind === "address"
                                    ? "Address"
                                    : "Place"}
                                  {row.place.detail ? ` · ${row.place.detail}` : ""}
                                </div>
                              </div>
                              <ChevronRight className="h-3.5 w-3.5 text-[#de2010]" />
                            </button>
                          )
                        )}
                        {remoteSearching && (
                          <div className="border-t border-white/5 px-3 py-1.5 text-[10px] text-[#71717a]">
                            Checking live address lookup…
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>

              {provincePlaces.length > 0 && (
                <div className="relative">
                  <button
                    onClick={() => setPlacesDrawerOpen((v) => !v)}
                    className="flex w-full items-center justify-between rounded-xl border border-[#a855f7]/35 bg-[#120e1a]/88 px-3 py-1.5 text-left text-[11px] font-medium text-[#e9d5ff] backdrop-blur-md transition hover:border-[#a855f7]"
                  >
                    <span className="flex items-center gap-1.5">
                      <GraduationCap className="h-3.5 w-3.5 text-[#a855f7]" />
                      Universities &amp; Landmarks in {provinceProfile.province.replace(" Province", "")} ({provincePlaces.length})
                    </span>
                    <ChevronDown className="h-3.5 w-3.5" />
                  </button>

                  {placesDrawerOpen && (
                    <div className="mt-1.5 max-h-60 overflow-y-auto rounded-xl border border-white/15 bg-[#0d0d12]/96 p-2 shadow-2xl backdrop-blur-xl">
                      {provincePlaces.map((pl: ZimbabwePlace) => {
                        const inScene = landmarks.some(
                          (l) => l.name === pl.shortName || l.name === pl.name
                        );
                        return (
                          <div
                            key={pl.id}
                            className="flex items-center justify-between gap-2 border-b border-white/5 py-2 last:border-none"
                          >
                            <div className="min-w-0">
                              <div className="truncate text-xs font-medium text-white">
                                {pl.shortName}
                              </div>
                              <div className="truncate font-mono-tech text-[10px] text-[#9a9891]">
                                {pl.category.toUpperCase()} · {pl.city}
                              </div>
                            </div>
                            {pl.has3DCampus && pl.campusSlug ? (
                              <Link
                                href={`/explore/${pl.campusSlug}`}
                                onClick={() => setPlacesDrawerOpen(false)}
                                className="shrink-0 rounded-md bg-[#a855f7]/25 px-2 py-1 font-mono-tech text-[10px] font-semibold text-[#e9d5ff] hover:bg-[#a855f7] hover:text-white"
                              >
                                3D View →
                              </Link>
                            ) : inScene ? (
                              <button
                                onClick={() => {
                                  setPlacesDrawerOpen(false);
                                  sceneActionsRef.current?.flyToLatLon(pl.lat, pl.lon, [-240, 140, 280]);
                                }}
                                className="shrink-0 rounded-md bg-[#4cb82a]/20 px-2 py-1 font-mono-tech text-[10px] font-semibold text-[#4cb82a] hover:bg-[#4cb82a] hover:text-[#09090b]"
                              >
                                Fly Here →
                              </button>
                            ) : (
                              <Link
                                href="/places"
                                className="shrink-0 rounded-md border border-white/15 px-2 py-1 font-mono-tech text-[10px] text-[#b6b4ad] hover:text-white"
                              >
                                Details
                              </Link>
                            )}
                          </div>
                        );
                      })}
                      {isCampus && (
                        <Link
                          href={cityMapHref(provinceProfile.slug)}
                          className="mt-2 block rounded-lg border border-white/15 bg-white/5 py-1.5 text-center font-mono-tech text-[10px] text-white hover:bg-white/10"
                        >
                          ← Back to {provinceProfile.capital} City View
                        </Link>
                      )}
                    </div>
                  )}
                </div>
              )}

              <div className="-mx-0.5 flex gap-1.5 overflow-x-auto pb-0.5 sm:flex-wrap sm:overflow-visible">
                {isHarare
                  ? Object.entries(HARARE_CAMERA_PRESETS).map(([key, p]) => (
                      <button
                        key={key}
                        onClick={() => {
                          setSelectedLandmark(null);
                          setNavPanelOpen(false);
                          sceneActionsRef.current?.flyToLatLon(p.lat, p.lon, p.offset);
                        }}
                        className="shrink-0 rounded border border-[#2b302b] bg-[#0c0e0c]/90 px-2.5 py-2 text-[11px] font-medium text-[#dadcd7] backdrop-blur-md transition hover:border-[#ffd200] hover:text-[#e9e5db] sm:py-1"
                      >
                        {p.label}
                      </button>
                    ))
                  : landmarks.slice(0, 6).map((lm) => (
                      <button
                        key={lm.id}
                        onClick={() => {
                          handleSelectLandmark(lm);
                          setNavPanelOpen(false);
                        }}
                        className="shrink-0 rounded border border-[#2b302b] bg-[#0c0e0c]/90 px-2.5 py-2 text-[11px] font-medium text-[#dadcd7] backdrop-blur-md transition hover:border-[#ffd200] hover:text-[#e9e5db] sm:py-1"
                      >
                        {lm.name}
                      </button>
                    ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Top-Right Telemetry (Minimizable + Clean View toggle) — hidden while mobile nav sheet is open */}
      {!hudHidden && !(isMobile && navPanelOpen) && (
        <div className="absolute right-3 top-3 z-20 flex flex-col items-end gap-1.5 sm:right-4 sm:top-4 sm:gap-2">
          {telemetryOpen ? (
            <div className="rounded border border-[#2b302b] bg-[#0c0e0c]/92 px-3 py-2 text-right font-mono-tech text-[11px] text-[#dadcd7] backdrop-blur-md">
              <div className="flex items-center justify-end gap-2">
                <span className="text-[#4cb82a]">{hudStats.fps} fps</span>
                <span className="hidden text-[#2b302b] lg:inline">·</span>
                <span className="hidden lg:inline">{hudStats.trisM}M tris</span>
                <span className="hidden text-[#2b302b] lg:inline">·</span>
                <span className="hidden lg:inline">
                  {hudStats.chunks}/{hudStats.totalChunks || (isHarare ? 600 : 140)}
                </span>
                <button
                  type="button"
                  onClick={() => setTelemetryOpen(false)}
                  aria-label="Minimize telemetry"
                  title="Minimize telemetry"
                  className="ml-1 inline-flex h-8 w-8 items-center justify-center rounded border border-[#2b302b] text-[#a4aaa2] hover:border-[#e9e5db]/30 hover:text-[#e9e5db]"
                >
                  <Minus className="h-3 w-3" />
                </button>
              </div>
              <div className="mt-1.5 hidden items-center justify-end gap-2 lg:flex">
                <span className="text-[10px] text-[#a4aaa2]">Render size</span>
                <input
                  type="range"
                  min={0.5}
                  max={1.25}
                  step={0.05}
                  value={renderScale}
                  onChange={(e) => setRenderScale(parseFloat(e.target.value))}
                  className="h-1 w-20 accent-[#ffd200]"
                />
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setTelemetryOpen(true)}
              className="inline-flex h-10 w-10 items-center justify-center rounded border border-[#2b302b] bg-[#0c0e0c]/92 font-mono-tech text-[11px] text-[#4cb82a] backdrop-blur-md hover:border-[#e9e5db]/30 lg:h-auto lg:w-auto lg:gap-2 lg:px-2.5 lg:py-1.5 lg:text-[#dadcd7]"
            >
              <span>{hudStats.fps}</span>
              <Maximize2 className="hidden h-3 w-3 text-[#a4aaa2] lg:inline" />
            </button>
          )}

          <div className="flex flex-col items-end gap-1.5">
            <div className="flex overflow-hidden rounded border border-[#2b302b] bg-[#0c0e0c]/92 backdrop-blur-md">
              {MAP_STYLES.map(({ id, Icon, title }) => (
                <button
                  key={id}
                  type="button"
                  title={title}
                  aria-label={title}
                  onClick={() => sceneActionsRef.current?.setMapStyle(id)}
                  className={`inline-flex h-10 w-10 items-center justify-center transition lg:h-9 lg:w-9 ${
                    mapStyle === id
                      ? "bg-[#0ea5e9] text-white"
                      : "text-[#a4aaa2] hover:text-[#e9e5db]"
                  }`}
                >
                  <Icon
                    className={`h-3.5 w-3.5 ${
                      satLoading && id === mapStyle ? "animate-pulse" : ""
                    }`}
                  />
                </button>
              ))}
            </div>
            <button
              onClick={() =>
                openFeedbackModal({
                  topic: `${provinceProfile.capital} (${provinceProfile.province})`,
                  category: "map-landmark",
                })
              }
              aria-label="Report a problem"
              className="inline-flex h-10 w-10 items-center justify-center rounded border border-[#2b302b] bg-[#0c0e0c]/92 text-[#e9e5db] backdrop-blur-md hover:border-[#ffd200] lg:h-auto lg:w-auto lg:gap-1.5 lg:px-2.5 lg:py-1.5 lg:text-[11px] lg:font-medium"
            >
              <Flag className="h-3.5 w-3.5 text-[#ffd200]" />
              <span className="hidden lg:inline">Report</span>
            </button>
            <button
              onClick={() => {
                setControlsOpen((v) => !v);
                if (isMobile) setNavPanelOpen(false);
              }}
              aria-label={controlsOpen ? "Hide atmosphere" : "Time and weather"}
              className="inline-flex h-10 w-10 items-center justify-center rounded border border-[#2b302b] bg-[#0c0e0c]/92 text-[#e9e5db] backdrop-blur-md hover:border-[#e9e5db]/30 lg:h-auto lg:w-auto lg:gap-1.5 lg:px-2.5 lg:py-1.5 lg:text-[11px] lg:font-medium"
            >
              <SlidersHorizontal className="h-3.5 w-3.5 text-[#ffd200]" />
              <span className="hidden lg:inline">
                {controlsOpen ? "Hide Atmosphere" : "Time & Weather"}
              </span>
            </button>
            <button
              onClick={() => setHudHidden(true)}
              title="Hide all HUD overlays"
              aria-label="Clean view"
              className="inline-flex h-10 w-10 items-center justify-center rounded border border-[#2b302b] bg-[#0c0e0c]/92 text-[#a4aaa2] backdrop-blur-md hover:border-[#e9e5db]/30 hover:text-[#e9e5db] lg:h-auto lg:w-auto lg:gap-1 lg:px-2.5 lg:py-1.5 lg:text-[11px] lg:font-medium"
            >
              <EyeOff className="h-3.5 w-3.5" />
              <span className="hidden lg:inline">Clean View</span>
            </button>
          </div>
        </div>
      )}

      {/* Bottom HUD dock — lifted above Safari / Chrome mobile toolbars */}
      {!hudHidden && (
        <div
          className="pointer-events-none absolute inset-x-3 z-30 flex flex-col gap-2 md:inset-x-4 md:flex-row md:items-end md:justify-between"
          style={{
            bottom: `calc(${browserBottomInset}px + env(safe-area-inset-bottom, 0px) + 0.75rem)`,
          }}
        >
          {/* Active Street / Pedestrian / Ride bar stacks above the dock on mobile */}
          <div className="pointer-events-auto order-1 w-full md:order-2 md:w-auto md:max-w-xl">
            {(controlMode === "street" || controlMode === "pedestrian") && streetInfo && (
              <div className="rounded-xl border border-[#4cb82a]/50 bg-[#09090b]/94 px-3.5 py-2.5 shadow-2xl backdrop-blur-md">
                <div className="flex flex-wrap items-center gap-2.5">
                  <div className="min-w-0 flex-1">
                    <div className="font-mono-tech text-[10px] uppercase tracking-wider text-[#4cb82a]">
                      {controlMode === "pedestrian"
                        ? `Walking with ${streetInfo.personName}`
                        : "Street View · Sidewalk Cam"}
                    </div>
                    <div className="truncate text-xs font-medium text-white">
                      {streetInfo.streetName}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => sceneActionsRef.current?.followNextPedestrian()}
                      className="inline-flex min-h-11 items-center rounded-lg border border-white/15 bg-white/10 px-3 text-[11px] font-medium text-white hover:bg-white/20 sm:min-h-0 sm:py-1.5 sm:px-2.5"
                    >
                      {controlMode === "pedestrian" ? "Next Person" : "Walk with Person"}
                    </button>
                    {controlMode === "pedestrian" && (
                      <button
                        type="button"
                        onClick={() => sceneActionsRef.current?.togglePedestrianFpv()}
                        className="inline-flex min-h-11 items-center rounded-lg border border-[#4cb82a]/40 bg-[#4cb82a]/15 px-3 text-[11px] font-medium text-[#4cb82a] hover:bg-[#4cb82a]/25 sm:min-h-0 sm:py-1.5 sm:px-2.5"
                      >
                        {streetInfo.firstPerson ? "3rd Person" : "1st Person Eye"}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => sceneActionsRef.current?.exitToFly()}
                      className="inline-flex min-h-11 items-center rounded-lg bg-[#de2010] px-3 text-[11px] font-medium text-white sm:min-h-0 sm:py-1.5 sm:px-2.5"
                    >
                      City View
                    </button>
                  </div>
                </div>
              </div>
            )}

            {controlMode === "ride" && rideInfo && (
              <div className="rounded-xl border border-[#ffd200]/40 bg-[#09090b]/94 px-3.5 py-2.5 shadow-2xl backdrop-blur-md">
                <div className="flex flex-wrap items-center gap-2.5">
                  <div className="min-w-0 flex-1">
                    <div className="font-mono-tech text-[10px] uppercase tracking-wider text-[#ffd200]">
                      Onboard · {rideInfo.kind} · {rideInfo.speedKmh} km/h
                    </div>
                    <div className="truncate text-xs font-medium text-white">{rideInfo.route}</div>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => sceneActionsRef.current?.cycleRide()}
                      className="inline-flex min-h-11 items-center rounded-lg border border-white/15 bg-white/10 px-3 text-[11px] font-medium text-white hover:bg-white/20 sm:min-h-0 sm:py-1.5 sm:px-2.5"
                    >
                      Next Vehicle
                    </button>
                    <button
                      type="button"
                      onClick={() => sceneActionsRef.current?.exitToFly()}
                      className="inline-flex min-h-11 items-center rounded-lg bg-[#de2010] px-3 text-[11px] font-medium text-white sm:min-h-0 sm:py-1.5 sm:px-2.5"
                    >
                      Exit
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Bottom-Left Atmosphere & Camera Modes */}
          <div className="pointer-events-auto order-2 w-full max-w-sm md:order-1">
        {controlsOpen ? (
          <div className="rounded border border-[#2b302b] bg-[#0c0e0c]/94 p-3 shadow-2xl backdrop-blur-md sm:p-3.5">
              <div className="mb-2.5 flex items-center justify-between gap-2">
              <div className="grid flex-1 grid-cols-4 gap-1 rounded-lg border border-white/10 bg-white/[0.03] p-1">
                <button
                  onClick={() => sceneActionsRef.current?.exitToFly()}
                  className={`flex items-center justify-center gap-1 rounded-md py-1.5 text-[11px] font-medium transition ${
                    controlMode === "orbit"
                      ? "bg-[#de2010] text-white"
                      : "text-[#b6b4ad] hover:text-white"
                  }`}
                >
                  <Eye className="h-3 w-3" />
                  Fly
                </button>
                <button
                  onClick={() => sceneActionsRef.current?.enterStreetView()}
                  className={`flex items-center justify-center gap-1 rounded-md py-1.5 text-[11px] font-medium transition ${
                    controlMode === "street" || controlMode === "pedestrian"
                      ? "bg-[#4cb82a] text-[#09090b] font-semibold"
                      : "text-[#b6b4ad] hover:text-white"
                  }`}
                >
                  <Footprints className="h-3 w-3" />
                  Street
                </button>
                <button
                  onClick={() => sceneActionsRef.current?.cycleRide("kombi")}
                  className={`flex items-center justify-center gap-1 rounded-md py-1.5 text-[11px] font-medium transition ${
                    controlMode === "ride" && rideInfo?.kind !== "Zambezi Boat"
                      ? "bg-[#ffd200] text-[#09090b]"
                      : "text-[#b6b4ad] hover:text-white"
                  }`}
                >
                  <Bus className="h-3 w-3" />
                  Kombi
                </button>
                <button
                  onClick={() => sceneActionsRef.current?.cycleRide("ferry")}
                  className={`flex items-center justify-center gap-1 rounded-md py-1.5 text-[11px] font-medium transition ${
                    controlMode === "ride" && rideInfo?.kind === "Zambezi Boat"
                      ? "bg-[#38bdf8] text-[#09090b]"
                      : "text-[#b6b4ad] hover:text-white"
                  }`}
                >
                  <Ship className="h-3 w-3" />
                  River
                </button>
              </div>
              <button
                type="button"
                onClick={() => setControlsOpen(false)}
                aria-label="Minimize atmosphere controls"
                title="Minimize controls"
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.03] text-[#9a9891] hover:border-white/30 hover:text-white"
              >
                <Minus className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="space-y-2">
              <div>
                <div className="flex items-center justify-between gap-2 font-mono-tech text-[11px]">
                  <span className="text-[#9a9891]">Season / Date</span>
                  <span className="text-[#f5f4f0]">{formatDayOfYear(dayOfYear)}</span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={365}
                  value={dayOfYear}
                  onChange={(e) => {
                    setFollowDeviceTime(false);
                    setDayOfYear(Number(e.target.value));
                  }}
                  className="mt-1 h-1.5 w-full accent-[#4cb82a]"
                />
              </div>

              <div>
                <div className="flex items-center justify-between gap-2 font-mono-tech text-[11px]">
                  <span className="text-[#9a9891]">
                    {followDeviceTime ? "Device time" : "Manual time"}
                  </span>
                  <span className="text-[#ffd200]">{formatHour(hour)}</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={23.9}
                  step={0.05}
                  value={hour}
                  onChange={(e) => {
                    setFollowDeviceTime(false);
                    setHour(Number(e.target.value));
                  }}
                  className="mt-1 h-1.5 w-full accent-[#de2010]"
                />
                <button
                  type="button"
                  onClick={() => setFollowDeviceTime(true)}
                  className={`mt-2 inline-flex items-center gap-1.5 rounded-lg border px-2 py-1 text-[11px] transition ${
                    followDeviceTime
                      ? "border-[#4cb82a]/50 bg-[#4cb82a]/15 text-[#6ee7b7]"
                      : "border-white/10 bg-white/[0.03] text-[#9a9891] hover:border-[#4cb82a]/40 hover:text-white"
                  }`}
                >
                  <Sun className="h-3 w-3" />
                  {followDeviceTime ? "Following device clock" : "Use device clock"}
                </button>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-1.5">
              {(
                [
                  { id: "typical", label: "typical", icon: Sparkles },
                  { id: "clear", label: "clear", icon: Sun },
                  { id: "haze", label: "dry haze", icon: Wind },
                  { id: "cloudy", label: "cloudy", icon: Cloud },
                  { id: "rain", label: "rain", icon: CloudRain },
                ] as const
              ).map((w) => {
                const Icon = w.icon;
                return (
                  <button
                    key={w.id}
                    onClick={() => setWeather(w.id)}
                    className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] transition ${
                      weather === w.id
                        ? "border-[#de2010] bg-[#de2010]/20 text-white"
                        : "border-white/10 bg-white/[0.03] text-[#9a9891] hover:text-white"
                    }`}
                  >
                    <Icon className="h-3 w-3" />
                    {w.label}
                  </button>
                );
              })}
            </div>

            <p className="mt-2.5 font-mono-tech text-[10px] text-[#71717a]">
              Drag to look/orbit · WASD to walk · Click any walking person or vehicle
            </p>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setControlsOpen(true)}
            className="inline-flex h-11 items-center gap-2 rounded border border-[#2b302b] bg-[#0c0e0c]/92 px-3 font-mono-tech text-[11px] text-[#e9e5db] shadow-xl backdrop-blur-md hover:border-[#ffd200] sm:h-auto sm:py-1.5"
          >
            <SlidersHorizontal className="h-3.5 w-3.5 text-[#ffd200]" />
            <span>
              {followDeviceTime ? "Live · " : ""}
              {formatHour(hour)}
            </span>
            <Maximize2 className="h-3 w-3 text-[#a4aaa2]" />
          </button>
        )}
          </div>
        </div>
      )}

      {/* Selected Landmark Card (Minimizable) — bottom sheet on mobile */}
      {!hudHidden && selectedPlace && !selectedLandmark && (
        <div
          className="absolute inset-x-0 z-30 rounded-t border border-[#2b302b] border-b-0 bg-[#0c0e0c]/96 p-4 shadow-2xl backdrop-blur-md sm:inset-x-auto sm:right-4 sm:w-[calc(100%-2rem)] sm:max-w-sm sm:rounded sm:border-b sm:p-3.5"
          style={{
            bottom: `calc(${browserBottomInset}px + env(safe-area-inset-bottom, 0px))`,
            paddingBottom: "max(1rem, env(safe-area-inset-bottom, 0px))",
          }}
        >
          <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-[#2b302b] sm:hidden" aria-hidden="true" />
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <span className="mono capitalize text-[#ffd200]">{selectedPlace.detail}</span>
              <h3 className="mt-0.5 truncate text-base font-extrabold text-[#e9e5db] sm:text-lg">
                {selectedPlace.name}
              </h3>
            </div>
            <button
              onClick={clearPlace}
              aria-label="Close place card"
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded text-[#a4aaa2] hover:bg-[#e9e5db]/10 hover:text-[#e9e5db] sm:h-8 sm:w-8"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <p className="mt-2 text-sm leading-relaxed text-[#dadcd7] sm:text-xs">
            {selectedPlace.id.startsWith("nominatim-")
              ? "Live OpenStreetMap address lookup for Zimbabwe. The camera is on this spot."
              : "From the OpenStreetMap extract for this map. The camera is on this spot."}
            {selectedPlace.kind === "street" && " The street is outlined in gold."}
          </p>
          <div className="mt-3 flex items-center gap-2 border-t border-[#2b302b] pt-3">
            <button
              onClick={() =>
                sceneActionsRef.current?.enterStreetView(selectedPlace.lat, selectedPlace.lon)
              }
              className="inline-flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded border border-[#4cb82a]/40 bg-[#4cb82a]/15 px-3 text-xs font-semibold text-[#4cb82a] hover:bg-[#4cb82a] hover:text-[#0c0e0c] sm:min-h-0 sm:flex-none sm:py-1.5"
            >
              <Footprints className="h-3.5 w-3.5" />
              Street View
            </button>
          </div>
        </div>
      )}

      {!hudHidden && selectedLandmark && (
        <div
          className="absolute inset-x-0 z-30 rounded-t border border-[#2b302b] border-b-0 bg-[#0c0e0c]/96 p-4 shadow-2xl backdrop-blur-md sm:inset-x-auto sm:right-4 sm:w-[calc(100%-2rem)] sm:max-w-sm sm:rounded sm:border-b sm:p-3.5"
          style={{
            bottom: `calc(${browserBottomInset}px + env(safe-area-inset-bottom, 0px))`,
            paddingBottom: "max(1rem, env(safe-area-inset-bottom, 0px))",
          }}
        >
          <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-[#2b302b] sm:hidden" aria-hidden="true" />
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <span className="mono text-[#ffd200]">
                {selectedLandmark.district} · {selectedLandmark.category}
              </span>
              <h3 className="mt-0.5 truncate text-base font-extrabold text-[#e9e5db] sm:text-lg">
                {selectedLandmark.name}
              </h3>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <button
                onClick={() => setLandmarkMinimized((v) => !v)}
                aria-label={landmarkMinimized ? "Expand landmark card" : "Minimize landmark card"}
                title={landmarkMinimized ? "Expand" : "Minimize"}
                className="inline-flex h-10 w-10 items-center justify-center rounded text-[#a4aaa2] hover:bg-[#e9e5db]/10 hover:text-[#e9e5db] sm:h-8 sm:w-8"
              >
                {landmarkMinimized ? (
                  <Maximize2 className="h-4 w-4" />
                ) : (
                  <Minus className="h-4 w-4" />
                )}
              </button>
              <button
                onClick={() => setSelectedLandmark(null)}
                aria-label="Close landmark card"
                className="inline-flex h-10 w-10 items-center justify-center rounded text-[#a4aaa2] hover:bg-[#e9e5db]/10 hover:text-[#e9e5db] sm:h-8 sm:w-8"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {!landmarkMinimized && (
            <>
              <p className="mt-2 text-sm leading-relaxed text-[#dadcd7] sm:text-xs">
                {selectedLandmark.summary}
              </p>

              <div className="mt-3 border-l-4 border-[#ffd200] bg-[#151815] px-3 py-2.5 text-[12px] text-[#a4aaa2] sm:text-[11px]">
                <div className="font-semibold text-[#4cb82a]">Local vibe &amp; strategy</div>
                <p className="mt-0.5">{selectedLandmark.vibeNote}</p>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-[#2b302b] pt-3">
                <button
                  onClick={() =>
                    sceneActionsRef.current?.enterStreetView(
                      selectedLandmark.lat,
                      selectedLandmark.lon
                    )
                  }
                  className="inline-flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded border border-[#4cb82a]/40 bg-[#4cb82a]/15 px-3 text-xs font-semibold text-[#4cb82a] hover:bg-[#4cb82a] hover:text-[#0c0e0c] sm:min-h-0 sm:flex-none sm:py-1.5"
                >
                  <Footprints className="h-3.5 w-3.5" />
                  Street View
                </button>
                {selectedLandmark.campusSlug && (
                  <Link
                    href={`/explore/${selectedLandmark.campusSlug}`}
                    className="inline-flex min-h-11 items-center gap-1 rounded bg-[#b99cff] px-3 text-xs font-semibold text-[#1c1140] sm:min-h-0 sm:py-1.5"
                  >
                    <GraduationCap className="h-3.5 w-3.5" />
                    3D Campus
                  </Link>
                )}
                <Link
                  href={`/guides/${selectedLandmark.guideSlug}`}
                  className="inline-flex min-h-11 flex-1 items-center justify-center gap-1 rounded bg-[#2b7f07] px-3 text-xs font-semibold text-white hover:bg-[#236a05] sm:min-h-0 sm:flex-none sm:py-1.5"
                >
                  Read Guide
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </>
          )}
        </div>
      )}

      {!hudHidden && !selectedLandmark && (
        <div className="pointer-events-none absolute bottom-3 right-4 z-10 hidden items-center gap-2 rounded-lg border border-white/10 bg-[#09090b]/70 px-2.5 py-1 font-mono-tech text-[10px] text-[#9a9891] backdrop-blur-sm sm:flex">
          <Compass className="h-3 w-3 text-[#de2010]" />
          <span>
            {activeTitle} 3D Voxels · {hudStats.buildingsCount.toLocaleString()} real © OpenStreetMap buildings
          </span>
        </div>
      )}
    </div>
  );
}
