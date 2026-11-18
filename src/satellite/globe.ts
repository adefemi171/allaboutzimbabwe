// The globe on the satellite page: the Earth as it looks from orbit, lit
// by the sun where it really is, with the satellites of the catalogue
// moving around it. Picking a pass turns the clock back to it and shows
// the satellite, its path, and the strip of ground it could see.
//
// Pictures: NASA Blue Marble by day and Black Marble by night, served by
// the site (scripts/fetch-earth.mjs). Over that lie the clouds a weather
// satellite saw on the day in question, and around the place itself its
// whole picture of that day, both straight from NASA GIBS (gibs.ts).

import * as THREE from "three";
import { isLiteDevice } from "@/lib/device";
import { GLOBE_LAYER, gibsPicture } from "./gibs";
import { profileOf } from "./profile";
import { lookAt, placeEcef, toSatrec, type SatRec } from "./sgp4";
import { subSolar } from "./sun";
import { utcDay } from "./time";
import type { GpRecord, Pass, SatKind } from "./types";

const RAD = Math.PI / 180;
const EARTH_KM = 6371;
const MIN_DIST = 1.15;
const MAX_DIST = 12;
/** A replay starts this long before the closest approach, and runs this fast. */
const LEAD_MS = 4 * 60_000;
const REPLAY_SPEED = 45;
/** Half the size of the day's picture around the place, degrees. */
const DAY_REACH = { lat: 11, lon: 18 };

const KIND_COLOUR: Record<SatKind, number> = {
  imaging: 0xffd200,
  radar: 0xff7a59,
  weather: 0x62b4e8,
  crew: 0xffffff,
  other: 0x8fa3b5,
};

export interface Hovered {
  name: string;
  kind: SatKind;
  altitudeKm: number;
  /** Where on the page the satellite is. */
  x: number;
  y: number;
}

export interface GlobeEvents {
  /** The pointer is on a satellite, or left it. */
  onHover(hovered: Hovered | null): void;
  /** The moment the globe shows, and whether that is the present. */
  onTime(date: Date, live: boolean): void;
  /** A spot on the ground was clicked or tapped. */
  onPick(lat: number, lon: number): void;
}

/** A point on a globe of the given radius. East is towards -z, as three.js maps a sphere. */
function point(lat: number, lon: number, radius = 1): THREE.Vector3 {
  const p = lat * RAD;
  const l = lon * RAD;
  return new THREE.Vector3(
    radius * Math.cos(p) * Math.cos(l),
    radius * Math.sin(p),
    -radius * Math.cos(p) * Math.sin(l),
  );
}

const LIGHT_GLSL = /* glsl */ `
uniform vec3 uSun;
// How much daylight a spot gets, and how brightly it is lit.
float daylight(vec3 n) { return smoothstep(-0.12, 0.2, dot(n, uSun)); }
float sunlight(vec3 n) { return mix(0.4, 1.2, pow(clamp(dot(n, uSun), 0.0, 1.0), 0.6)); }
`;

const SURFACE_VERTEX = /* glsl */ `
varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vWorld;
void main() {
  vUv = uv;
  vNormal = normalize(position);
  vWorld = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const EARTH_FRAGMENT = /* glsl */ `
uniform sampler2D uDay;
uniform sampler2D uNight;
uniform sampler2D uClouds;
uniform float uCloud;
uniform float uLoaded;
varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vWorld;
${LIGHT_GLSL}
void main() {
  vec3 n = normalize(vNormal);
  // Until the pictures arrive the globe is a plain dark blue.
  vec3 land = mix(vec3(0.02, 0.06, 0.11), texture2D(uDay, vUv).rgb, uLoaded);
  vec3 lights = texture2D(uNight, vUv).rgb * uLoaded;
  // The day's mosaic shows land and sea as well. Only what is near white
  // in it is cloud (or ice, which is as white).
  vec3 seen = texture2D(uClouds, vUv).rgb;
  float cloud = smoothstep(0.2, 0.75, min(seen.r, min(seen.g, seen.b))) * uCloud;
  // By night clouds only dim the lights under them.
  vec3 dark = lights * 1.5 * (1.0 - 0.6 * cloud) + land * 0.04 + vec3(0.01, 0.012, 0.018) * cloud;
  vec3 lit = mix(land, seen * 1.15, cloud) * sunlight(n);
  vec3 colour = mix(dark, lit, daylight(n));
  // The air, thickest towards the edge of the disc.
  float rim = pow(1.0 - max(dot(n, normalize(cameraPosition - vWorld)), 0.0), 3.0);
  colour += vec3(0.25, 0.5, 1.0) * rim * (0.12 + 0.5 * daylight(n));
  gl_FragColor = vec4(colour, 1.0);
  #include <colorspace_fragment>
}
`;

const DAY_FRAGMENT = /* glsl */ `
uniform sampler2D uMap;
uniform float uOpacity;
varying vec2 vUv;
varying vec3 vNormal;
${LIGHT_GLSL}
void main() {
  vec3 n = normalize(vNormal);
  vec3 seen = texture2D(uMap, vUv).rgb;
  // The picture fades out towards its edge, where the satellite has not
  // been yet (those parts are black), and on the night side.
  float edge = 1.0 - smoothstep(0.5, 1.0, length(vUv * 2.0 - 1.0));
  float there = smoothstep(0.03, 0.09, max(seen.r, max(seen.g, seen.b)));
  gl_FragColor = vec4(seen * sunlight(n), uOpacity * edge * there * daylight(n));
  #include <colorspace_fragment>
}
`;

const AIR_FRAGMENT = /* glsl */ `
varying vec3 vNormal;
varying vec3 vWorld;
${LIGHT_GLSL}
void main() {
  vec3 n = normalize(vNormal);
  // Only the back of the shell is drawn, so this is a ring around the
  // globe: strongest right at its edge, fading outwards.
  float t = clamp(-dot(n, normalize(cameraPosition - vWorld)) / 0.3, 0.0, 1.0);
  gl_FragColor = vec4(vec3(0.3, 0.58, 1.0) * t * t * (0.15 + 0.6 * daylight(n)), 1.0);
}
`;

const DOT_VERTEX = /* glsl */ `
attribute vec3 aColour;
attribute float aSize;
uniform float uPixels;
varying vec3 vColour;
void main() {
  vColour = aColour;
  gl_PointSize = aSize * uPixels;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const DOT_FRAGMENT = /* glsl */ `
varying vec3 vColour;
void main() {
  float r = length(gl_PointCoord - 0.5);
  float alpha = 1.0 - smoothstep(0.32, 0.5, r);
  if (alpha < 0.02) discard;
  gl_FragColor = vec4(vColour, alpha);
  #include <colorspace_fragment>
}
`;

interface Satellite {
  noradId: number;
  name: string;
  kind: SatKind;
  halfAngleDeg: number;
  satrec: SatRec;
  altitudeKm: number;
  lat: number;
  lon: number;
}

function line(colour: number, opacity: number, loop = false): THREE.Line {
  const material = new THREE.LineBasicMaterial({ color: colour, transparent: true, opacity });
  const made = loop
    ? new THREE.LineLoop(new THREE.BufferGeometry(), material)
    : new THREE.Line(new THREE.BufferGeometry(), material);
  made.visible = false;
  made.frustumCulled = false;
  return made;
}

export class SatelliteGlobe {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(40, 1, 0.01, 200);
  private sun = { value: new THREE.Vector3(1, 0, 0) };
  private earth: THREE.ShaderMaterial;
  private day: THREE.Mesh<THREE.BufferGeometry, THREE.ShaderMaterial> | null = null;
  private dayKey = "";
  private cloudDay = "";
  private showDay = true;
  private dots: THREE.Points | null = null;
  private pixels = { value: 1 };
  private marker = new THREE.Group();
  private track = line(0x62b4e8, 0.9);
  private drop = line(0xffd200, 0.7);
  private footprint = line(0xffd200, 0.95, true);

  private satellites: Satellite[] = [];
  private selected: Satellite | null = null;
  private place = { lat: -17.83, lon: 31.05 };
  private placed = false;

  /** Where the camera is over the Earth, and where it is going. */
  private view = { lat: -10, lon: 25, dist: 3.4 };
  private goal = { lat: -10, lon: 25, dist: 3.4 };
  /** A pass being replayed: the clock runs from `from` up to `until` and holds. */
  private replay: { from: number; until: number; started: number } | null = null;
  private lastMoved = 0;
  /** The moment the satellites were last drawn for. */
  private shown = NaN;
  private pointer: [number, number] | null = null;

  /** A phone gets smaller pictures: it has less memory and often a slower line. */
  private phone = window.matchMedia("(max-width: 720px)").matches;
  /** Phones and tablets draw fewer pixels, and nothing at all while out of sight. */
  private lite = isLiteDevice();
  private inView = true;
  private frame = 0;
  private disposed = false;
  /** Ends the listeners when the page is left. */
  private life = new AbortController();
  private observers: { disconnect(): void }[] = [];

  constructor(
    private canvas: HTMLCanvasElement,
    private events: GlobeEvents,
  ) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, this.lite ? 1.5 : 2));
    this.renderer.setClearColor(0x05090e);
    this.pixels.value = this.renderer.getPixelRatio();

    // The pictures are wide. Without their mipmaps the coasts shimmer.
    const picture = (file: string) => {
      const texture = new THREE.TextureLoader().load(
        `/data/${file}`,
        () => (this.earth.uniforms.uLoaded.value = 1),
      );
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = this.renderer.capabilities.getMaxAnisotropy();
      return texture;
    };
    this.earth = new THREE.ShaderMaterial({
      uniforms: {
        uSun: this.sun,
        uDay: { value: picture(this.phone ? "earth-day-2048.jpg" : "earth-day.jpg") },
        uNight: { value: picture("earth-night.jpg") },
        uClouds: { value: new THREE.Texture() },
        uCloud: { value: 0 },
        uLoaded: { value: 0 },
      },
      vertexShader: SURFACE_VERTEX,
      fragmentShader: EARTH_FRAGMENT,
    });
    this.scene.add(new THREE.Mesh(new THREE.SphereGeometry(1, 128, 96), this.earth));

    this.scene.add(
      new THREE.Mesh(
        new THREE.SphereGeometry(1.04, 96, 64),
        new THREE.ShaderMaterial({
          uniforms: { uSun: this.sun },
          vertexShader: SURFACE_VERTEX,
          fragmentShader: AIR_FRAGMENT,
          side: THREE.BackSide,
          transparent: true,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        }),
      ),
    );

    this.scene.add(this.stars(), this.marker, this.track, this.drop, this.footprint);
    this.buildMarker();
    this.bindInput();
    this.observeSize();
    if (this.lite) {
      const watcher = new IntersectionObserver(([entry]) => (this.inView = entry.isIntersecting));
      watcher.observe(canvas);
      this.observers.push(watcher);
    }

    const tick = (now: number) => {
      this.frame = requestAnimationFrame(tick);
      if (!document.hidden && this.inView) this.step(now);
    };
    this.frame = requestAnimationFrame(tick);
  }

  /**
   * Stop drawing and give everything back: the frame loop, the listeners
   * and observers, the pictures and shapes on the graphics card, and the
   * WebGL context itself. The globe cannot be used after this.
   */
  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    cancelAnimationFrame(this.frame);
    this.life.abort();
    for (const observer of this.observers) observer.disconnect();
    this.pointer = null;

    // Pictures still on their way are dropped as they land (see the loaders).
    this.cloudDay = this.dayKey = "";
    this.dropDay();
    for (const name of ["uDay", "uNight", "uClouds"]) this.earth.uniforms[name].value.dispose();
    this.scene.traverse((thing) => {
      const { geometry, material } = thing as THREE.Mesh;
      geometry?.dispose();
      for (const each of [material ?? []].flat()) each.dispose();
    });
    this.scene.clear();
    this.dots = null;
    this.renderer.dispose();

    // A canvas whose context is lost cannot be drawn on again, so the
    // context goes only once the canvas has left the page. Where the page
    // is set up again on the same canvas (React does that in development),
    // the next globe takes the context over instead.
    const { canvas } = this;
    const context = this.renderer.getContext();
    window.setTimeout(() => {
      if (!canvas.isConnected) context.getExtension("WEBGL_lose_context")?.loseContext();
    }, 0);
  }

  // ------------------------------------------------------------- public --

  /** Mark the place the page is about, and turn the globe to it. */
  setPlace(lat: number, lon: number): void {
    this.place = { lat, lon };
    this.marker.position.copy(point(lat, lon, 1.003));
    this.marker.lookAt(point(lat, lon, 2));
    // Seen from a little nearer the equator, so more of the land around shows.
    this.goal = { lat: lat * 0.8, lon, dist: Math.min(this.goal.dist, 2.7) };
    if (!this.placed) this.view = { ...this.goal, dist: 3.4 };
    this.placed = true;
    this.showPass(null);
  }

  /** The satellites to show as dots. */
  setCatalog(records: GpRecord[]): void {
    this.satellites = [];
    for (const record of records) {
      const satrec = toSatrec(record);
      if (!satrec) continue;
      const { noradId, name, kind, halfAngleDeg } = profileOf(record);
      this.satellites.push({ noradId, name, kind, halfAngleDeg, satrec, altitudeKm: 0, lat: 0, lon: 0 });
    }
    const count = this.satellites.length;
    const colours = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    this.satellites.forEach((satellite, i) => {
      new THREE.Color(KIND_COLOUR[satellite.kind]).toArray(colours, i * 3);
      sizes[i] = satellite.kind === "other" ? 4 : 6;
    });
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(count * 3), 3));
    geometry.setAttribute("aColour", new THREE.BufferAttribute(colours, 3));
    geometry.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));

    if (this.dots) {
      this.scene.remove(this.dots);
      this.dots.geometry.dispose();
      (this.dots.material as THREE.Material).dispose();
    }
    this.dots = new THREE.Points(
      geometry,
      new THREE.ShaderMaterial({
        uniforms: { uPixels: this.pixels },
        vertexShader: DOT_VERTEX,
        fragmentShader: DOT_FRAGMENT,
        transparent: true,
      }),
    );
    this.dots.frustumCulled = false;
    this.scene.add(this.dots);
    this.lastMoved = 0;
    this.shown = NaN;
  }

  /**
   * Turn the clock to a pass and play the minutes up to its closest
   * approach. Null goes back to the present.
   */
  showPass(pass: Pass | null): void {
    this.selected = pass
      ? (this.satellites.find((satellite) => satellite.noradId === pass.noradId) ?? null)
      : null;
    const shown = !!this.selected;
    this.track.visible = this.drop.visible = this.footprint.visible = shown;
    if (!pass || !this.selected) {
      this.replay = null;
      this.loadDay(new Date(Date.now() - 86400000));
      return;
    }

    const until = new Date(pass.time).getTime();
    this.replay = { from: until - LEAD_MS, until, started: performance.now() };
    // The path for a quarter of an hour either side, over the turning Earth.
    const place = placeEcef(this.place.lat, this.place.lon);
    const path: THREE.Vector3[] = [];
    for (let minutes = -14; minutes <= 14; minutes += 0.5) {
      const look = lookAt(this.selected.satrec, new Date(until + minutes * 60_000), place);
      if (look) path.push(point(look.lat, look.lon, 1 + look.altitudeKm / EARTH_KM));
    }
    this.track.geometry.setFromPoints(path);
    // A pass still to come has no picture of its day yet.
    if (!pass.upcoming) this.loadDay(new Date(until));
    this.goal = {
      lat: (this.place.lat + pass.lat) / 2,
      lon: this.place.lon + (((pass.lon - this.place.lon + 540) % 360) - 180) / 2,
      dist: Math.min(this.goal.dist, 2.1),
    };
  }

  /** Play the selected pass again from the start. */
  replayPass(): void {
    if (this.replay) this.replay.started = performance.now();
  }

  /** Show or hide the weather satellite's clouds and picture of the day. */
  setDayPicture(shown: boolean): void {
    this.showDay = shown;
  }

  zoomBy(factor: number): void {
    this.goal.dist = THREE.MathUtils.clamp(this.goal.dist * factor, MIN_DIST, MAX_DIST);
  }

  // -------------------------------------------------------------- scene --

  private stars(): THREE.Points {
    const positions = new Float32Array(1800 * 3);
    for (let i = 0; i < positions.length; i += 3) {
      point(Math.asin(Math.random() * 2 - 1) / RAD, Math.random() * 360, 90).toArray(positions, i);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    return new THREE.Points(
      geometry,
      new THREE.PointsMaterial({ color: 0x8fa3b5, size: 1.4, sizeAttenuation: false }),
    );
  }

  /** The place: a dot with a ring round it, lying on the ground. */
  private buildMarker(): void {
    const material = new THREE.MeshBasicMaterial({ color: 0xffd200, side: THREE.DoubleSide });
    this.marker.add(
      new THREE.Mesh(new THREE.CircleGeometry(0.004, 24), material),
      new THREE.Mesh(new THREE.RingGeometry(0.009, 0.0105, 48), material),
    );
  }

  /** The clouds of a day, all round the globe. */
  private loadClouds(day: string): void {
    if (day === this.cloudDay) return;
    this.cloudDay = day;
    const width = this.phone ? 2048 : 4096;
    const loader = new THREE.TextureLoader();
    loader.crossOrigin = "anonymous";
    loader.load(gibsPicture(GLOBE_LAYER, day, [-180, -90, 180, 90], width, width / 2), (texture) => {
      if (this.disposed || day !== this.cloudDay) return texture.dispose();
      texture.colorSpace = THREE.SRGBColorSpace;
      const clouds = this.earth.uniforms.uClouds;
      clouds.value.dispose();
      clouds.value = texture;
      this.earth.uniforms.uCloud.value = 0;
    });
  }

  /**
   * What a weather satellite (VIIRS on NOAA-20) saw on a day: its clouds
   * over the whole globe, and around the place the picture itself.
   */
  private loadDay(date: Date): void {
    this.loadClouds(utcDay(date));
    const { lat, lon } = this.place;
    const south = Math.max(-90, lat - DAY_REACH.lat);
    const north = Math.min(90, lat + DAY_REACH.lat);
    const west = lon - DAY_REACH.lon;
    const east = lon + DAY_REACH.lon;
    const key = `${utcDay(date)}:${lat.toFixed(2)}:${lon.toFixed(2)}`;
    if (key === this.dayKey) return;
    this.dayKey = key;

    const url = gibsPicture(
      GLOBE_LAYER,
      utcDay(date),
      [west, south, east, north],
      this.phone ? 1080 : 1800,
      this.phone ? 660 : 1100,
    );
    const loader = new THREE.TextureLoader();
    loader.crossOrigin = "anonymous";
    loader.load(url, (texture) => {
      if (this.disposed || key !== this.dayKey) return texture.dispose();
      texture.colorSpace = THREE.SRGBColorSpace;
      this.dropDay();

      // A patch of the sphere, a hair above the surface.
      const across = 48;
      const down = 32;
      const positions: number[] = [];
      const uvs: number[] = [];
      const indices: number[] = [];
      for (let j = 0; j <= down; j++) {
        for (let i = 0; i <= across; i++) {
          const u = i / across;
          const v = j / down;
          positions.push(...point(south + (north - south) * v, west + (east - west) * u, 1.0015));
          uvs.push(u, v);
          if (i < across && j < down) {
            const a = j * (across + 1) + i;
            indices.push(a, a + 1, a + across + 2, a, a + across + 2, a + across + 1);
          }
        }
      }
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
      geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
      geometry.setIndex(indices);
      this.day = new THREE.Mesh(
        geometry,
        new THREE.ShaderMaterial({
          uniforms: { uSun: this.sun, uMap: { value: texture }, uOpacity: { value: 0 } },
          vertexShader: SURFACE_VERTEX,
          fragmentShader: DAY_FRAGMENT,
          transparent: true,
          depthWrite: false,
        }),
      );
      this.scene.add(this.day);
    });
  }

  private dropDay(): void {
    if (!this.day) return;
    this.scene.remove(this.day);
    this.day.geometry.dispose();
    this.day.material.uniforms.uMap.value.dispose();
    this.day.material.dispose();
    this.day = null;
  }

  // -------------------------------------------------------------- input --

  private bindInput(): void {
    const { signal } = this.life;
    const pointers = new Map<number, { x: number; y: number }>();
    const spread = () => {
      const [a, b] = [...pointers.values()];
      return Math.hypot(b.x - a.x, b.y - a.y) || 1;
    };
    let pinch = 1;
    /** Where and when a lone pointer went down: a press that stays put is a pick. */
    let press: { x: number; y: number; at: number } | null = null;

    const listen = <K extends keyof HTMLElementEventMap>(
      type: K,
      handler: (event: HTMLElementEventMap[K]) => void,
      options?: AddEventListenerOptions,
    ) => this.canvas.addEventListener(type, handler, { ...options, signal });

    listen("pointerdown", (event) => {
      this.canvas.setPointerCapture(event.pointerId);
      pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      press =
        pointers.size === 1 ? { x: event.clientX, y: event.clientY, at: event.timeStamp } : null;
      if (pointers.size === 2) pinch = spread();
    });
    listen("pointermove", (event) => {
      const held = pointers.get(event.pointerId);
      if (!held) {
        if (event.pointerType === "mouse") this.pointer = [event.clientX, event.clientY];
        return;
      }
      const dx = event.clientX - held.x;
      const dy = event.clientY - held.y;
      held.x = event.clientX;
      held.y = event.clientY;
      if (pointers.size >= 2) {
        const now = spread();
        this.zoomBy(pinch / now);
        pinch = now;
        return;
      }
      // The ground under the pointer follows it, at any zoom.
      const perPixel = ((this.view.dist - 1) * 40) / this.canvas.clientHeight;
      this.goal.lon -= dx * perPixel;
      this.goal.lat = THREE.MathUtils.clamp(this.goal.lat + dy * perPixel, -85, 85);
    });
    const release = (event: PointerEvent) => pointers.delete(event.pointerId);
    listen("pointerup", (event) => {
      release(event);
      const still =
        press &&
        event.timeStamp - press.at < 600 &&
        Math.hypot(event.clientX - press.x, event.clientY - press.y) < 6;
      press = null;
      const spot = still && this.groundAt(event.clientX, event.clientY);
      if (spot) this.events.onPick(spot.lat, spot.lon);
    });
    listen("pointercancel", release);
    listen("pointerleave", () => {
      this.pointer = null;
      this.events.onHover(null);
    });
    listen(
      "wheel",
      (event) => {
        event.preventDefault();
        // Pinch on a trackpad arrives as a wheel event with ctrl held.
        const delta = event.deltaMode === 1 ? event.deltaY * 30 : event.deltaY;
        this.zoomBy(Math.exp(delta * (event.ctrlKey ? 0.01 : 0.0014)));
      },
      { passive: false },
    );
    listen("keydown", (event) => {
      const turn = (this.goal.dist - 1) * 8;
      const actions: Record<string, () => void> = {
        ArrowLeft: () => (this.goal.lon -= turn),
        ArrowRight: () => (this.goal.lon += turn),
        ArrowUp: () => (this.goal.lat = Math.min(85, this.goal.lat + turn)),
        ArrowDown: () => (this.goal.lat = Math.max(-85, this.goal.lat - turn)),
        "+": () => this.zoomBy(0.8),
        "=": () => this.zoomBy(0.8),
        "-": () => this.zoomBy(1.25),
      };
      const action = actions[event.key];
      if (!action || event.metaKey || event.ctrlKey || event.altKey) return;
      event.preventDefault();
      action();
    });
  }

  private observeSize(): void {
    const resize = () => {
      const width = this.canvas.clientWidth || 1;
      const height = this.canvas.clientHeight || 1;
      this.renderer.setSize(width, height, false);
      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();
    };
    resize();
    const watcher = new ResizeObserver(resize);
    watcher.observe(this.canvas);
    this.observers.push(watcher);
  }

  /** The spot on the ground under a point of the page, if the Earth is there. */
  private groundAt(x: number, y: number): { lat: number; lon: number } | null {
    const rect = this.canvas.getBoundingClientRect();
    const ray = new THREE.Raycaster();
    ray.setFromCamera(
      new THREE.Vector2(
        ((x - rect.left) / rect.width) * 2 - 1,
        1 - ((y - rect.top) / rect.height) * 2,
      ),
      this.camera,
    );
    const hit = ray.ray.intersectSphere(
      new THREE.Sphere(new THREE.Vector3(), 1),
      new THREE.Vector3(),
    );
    return hit && { lat: Math.asin(hit.y) / RAD, lon: Math.atan2(-hit.z, hit.x) / RAD };
  }

  /** The satellite nearest the pointer, if one is close and in front of the Earth. */
  private hovered(): Hovered | null {
    if (!this.pointer || !this.dots) return null;
    const rect = this.canvas.getBoundingClientRect();
    const positions = this.dots.geometry.getAttribute("position");
    const at = new THREE.Vector3();
    const eye = this.camera.position;
    let best: Hovered | null = null;
    let nearest = 14;
    this.satellites.forEach((satellite, i) => {
      at.fromBufferAttribute(positions, i);
      // Hidden if the line of sight to it dips below the surface.
      const along = at.clone().sub(eye);
      const reach = along.length();
      const t = THREE.MathUtils.clamp(-eye.dot(along) / (reach * reach), 0, 1);
      if (eye.clone().addScaledVector(along, t).length() < 1) return;
      at.project(this.camera);
      const x = rect.left + ((at.x + 1) / 2) * rect.width;
      const y = rect.top + ((1 - at.y) / 2) * rect.height;
      const away = Math.hypot(x - this.pointer![0], y - this.pointer![1]);
      if (away < nearest) {
        nearest = away;
        best = { name: satellite.name, kind: satellite.kind, altitudeKm: satellite.altitudeKm, x, y };
      }
    });
    return best;
  }

  // --------------------------------------------------------------- loop --

  /** The moment the globe shows: now, or a point in the replay. */
  private clock(now: number): number {
    if (!this.replay) return Date.now();
    const { from, until, started } = this.replay;
    return Math.min(until, from + (now - started) * REPLAY_SPEED);
  }

  private moveSatellites(date: Date): void {
    if (!this.dots) return;
    const place = placeEcef(this.place.lat, this.place.lon);
    const positions = this.dots.geometry.getAttribute("position") as THREE.BufferAttribute;
    this.satellites.forEach((satellite, i) => {
      const look = lookAt(satellite.satrec, date, place);
      if (!look) return;
      satellite.lat = look.lat;
      satellite.lon = look.lon;
      satellite.altitudeKm = look.altitudeKm;
      point(look.lat, look.lon, 1 + look.altitudeKm / EARTH_KM).toArray(positions.array, i * 3);
    });
    positions.needsUpdate = true;
  }

  /** The line from the selected satellite to the ground, and the ground it can see. */
  private drawSelected(): void {
    const satellite = this.selected;
    if (!satellite) return;
    const { lat, lon, altitudeKm, halfAngleDeg } = satellite;
    this.drop.geometry.setFromPoints([
      point(lat, lon, 1 + altitudeKm / EARTH_KM),
      point(lat, lon, 1.002),
    ]);
    // A circle on the ground, the field of view around the point below.
    const centre = point(lat, lon);
    const east = new THREE.Vector3(0, 1, 0).cross(centre).normalize();
    const north = centre.clone().cross(east);
    const reach = halfAngleDeg * RAD;
    const ring: THREE.Vector3[] = [];
    for (let k = 0; k < 64; k++) {
      const a = (k / 64) * Math.PI * 2;
      ring.push(
        centre
          .clone()
          .multiplyScalar(Math.cos(reach))
          .addScaledVector(east, Math.sin(reach) * Math.cos(a))
          .addScaledVector(north, Math.sin(reach) * Math.sin(a))
          .multiplyScalar(1.002),
      );
    }
    this.footprint.geometry.setFromPoints(ring);
  }

  private step(now: number): void {
    const time = this.clock(now);
    const date = new Date(time);
    // Live, the satellites barely move in half a second. A replay that
    // has reached its end stands still.
    if (this.replay ? time !== this.shown : now - this.lastMoved > 500) {
      this.lastMoved = now;
      this.shown = time;
      this.moveSatellites(date);
      this.drawSelected();
      const sun = subSolar(date);
      this.sun.value.copy(point(sun.lat, sun.lon));
      this.events.onTime(date, !this.replay);
    }

    // Ease the camera towards its goal, the short way round.
    const { view, goal } = this;
    const a = 0.12;
    view.lat += (goal.lat - view.lat) * a;
    view.lon += ((((goal.lon - view.lon) % 360) + 540) % 360 - 180) * a;
    view.dist *= Math.exp(Math.log(goal.dist / view.dist) * a);
    this.camera.position.copy(point(view.lat, view.lon, view.dist));
    this.camera.lookAt(0, 0, 0);

    const worn = this.showDay ? 1 : 0;
    const cloud = this.earth.uniforms.uCloud;
    if (this.earth.uniforms.uClouds.value.image) cloud.value += (worn - cloud.value) * 0.08;
    if (this.day) {
      const opacity = this.day.material.uniforms.uOpacity;
      opacity.value += (worn - opacity.value) * 0.08;
    }
    // The ring round the place breathes, so the eye finds it.
    this.marker.children[1].scale.setScalar(1 + 0.35 * (0.5 + 0.5 * Math.sin(now / 420)));

    if (this.pointer) this.events.onHover(this.hovered());
    this.renderer.render(this.scene, this.camera);
  }
}
