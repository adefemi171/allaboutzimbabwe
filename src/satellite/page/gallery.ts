// The pictures of a place, one at a time, at the head of the satellite
// page: the closest look first. Pressing the picture shows it large.

import { closeup } from "../closeup";
import { formatAway, formatWhen } from "../time";
import type { MatchedPass, Scene } from "../types";
import { drawCloseup } from "./scene-dialog";

type Tab = "all" | "detail" | "weather";
type Place = { lat: number; lon: number; label: string };
/** A capture may be available even when no predicted pass matches it. */
interface Shot {
  scene: Scene;
  pass: MatchedPass | null;
  archived?: boolean;
  relatedPass?: MatchedPass;
}

/** Leafing through quickly should not fetch every close-up on the way. */
const SETTLE_MS = 300;

/**
 * A close-up costs 2 to 10 MB of the archive's tiles. A phone shows the
 * archive's small preview and fetches the close-up only when the picture is
 * pressed open, as globe.ts gives a phone smaller pictures.
 */
const PHONE = "(max-width: 720px)";

export interface GalleryEvents {
  onOpen(scene: Scene): void;
  onReplay(pass: MatchedPass, selectPhoto: boolean): void;
}

/** Favor useful ground detail, then regional imagery over heavily clouded scenes. */
function order(a: Shot, b: Shot): number {
  const priority = ({ scene }: Shot) => {
    if (!scene.thumbnail) return 4;
    if (scene.daily || scene.cloudCover === null) return 2;
    if (scene.cloudCover >= 70) return 3;
    return scene.cloudCover <= 25 ? 0 : 1;
  };
  const cloudBand = ({ scene }: Shot) => Math.floor((scene.cloudCover ?? 100) / 15);
  return (
    priority(a) - priority(b) ||
    a.scene.metres - b.scene.metres ||
    cloudBand(a) - cloudBand(b) ||
    b.scene.datetime.localeCompare(a.scene.datetime)
  );
}

export class Gallery {
  private shots: Shot[] = [];
  private shown: Shot[] = [];
  private index = 0;
  private tab: Tab = "all";
  private place: Place = { lat: 0, lon: 0, label: "" };
  private settle = 0;
  /** Ends the listeners when the page is left. */
  private life = new AbortController();

  constructor(
    private root: HTMLElement,
    events: GalleryEvents,
  ) {
    const { signal } = this.life;
    for (const button of this.all<HTMLButtonElement>("tab")) {
      button.addEventListener(
        "click",
        () => {
          this.tab = button.dataset.galleryTab as Tab;
          this.index = 0;
          this.render();
        },
        { signal },
      );
    }
    for (const button of this.all<HTMLButtonElement>("step")) {
      button.addEventListener(
        "click",
        () => {
          const count = this.shown.length;
          this.index = (this.index + Number(button.dataset.galleryStep) + count) % count;
          this.render();
        },
        { signal },
      );
    }
    this.part("open").addEventListener(
      "click",
      () => {
        const shot = this.shown[this.index];
        if (shot) events.onOpen(shot.scene);
      },
      { signal },
    );
    this.part("replay").addEventListener(
      "click",
      () => {
        const shot = this.shown[this.index];
        if (shot?.pass) events.onReplay(shot.pass, true);
        else if (shot?.relatedPass) events.onReplay(shot.relatedPass, false);
      },
      { signal },
    );
  }

  /** Stop listening, and let a close-up on its way go unshown. */
  dispose(): void {
    this.life.abort();
    window.clearTimeout(this.settle);
    this.shots = this.shown = [];
  }

  private part<T extends HTMLElement>(name: string): T {
    return this.root.querySelector<T>(`[data-gallery-${name}]`)!;
  }

  private all<T extends HTMLElement>(name: string): T[] {
    return [...this.root.querySelectorAll<T>(`[data-gallery-${name}]`)];
  }

  set(
    passes: MatchedPass[],
    place: Place,
    scenes: Scene[] = [],
    clearLook: Scene | null = null,
  ): number {
    const shotsByScene = new Map<string, Shot>();
    for (const pass of passes) {
      if (pass.scene) shotsByScene.set(pass.scene.id, { scene: pass.scene, pass });
    }
    for (const scene of scenes) {
      if (!shotsByScene.has(scene.id) && scene.thumbnail) shotsByScene.set(scene.id, { scene, pass: null });
    }
    const recentCount = shotsByScene.size;
    if (clearLook && !shotsByScene.has(clearLook.id)) {
      shotsByScene.set(clearLook.id, { scene: clearLook, pass: null, archived: true });
    }
    // A capture can show a known satellite without matching a predicted pass.
    // Offer a replay of that satellite's nearest past pass as a separate action.
    const pastBySatellite = new Map<number, MatchedPass[]>();
    for (const pass of passes) {
      if (pass.upcoming) continue;
      const past = pastBySatellite.get(pass.noradId);
      if (past) past.push(pass);
      else pastBySatellite.set(pass.noradId, [pass]);
    }
    for (const shot of shotsByScene.values()) {
      const { noradId, datetime } = shot.scene;
      if (shot.pass || noradId === null) continue;
      const captured = Date.parse(datetime);
      let closest = Infinity;
      for (const pass of pastBySatellite.get(noradId) ?? []) {
        const distance = Math.abs(Date.parse(pass.time) - captured);
        if (distance >= closest) continue;
        shot.relatedPass = pass;
        closest = distance;
      }
    }
    this.shots = [...shotsByScene.values()].sort(order);
    this.place = place;
    this.tab = "all";
    this.index = 0;
    this.render();
    return recentCount;
  }

  /** Turn to the picture of a pass, if it left one. */
  show(pass: MatchedPass): void {
    const previous = this.shown[this.index];
    let index = this.shown.findIndex((shot) => shot.pass?.id === pass.id);
    if (index < 0 && this.shots.some((shot) => shot.pass?.id === pass.id)) {
      this.tab = "all";
      index = this.shots.findIndex((shot) => shot.pass?.id === pass.id);
    }
    if (index < 0 || previous?.pass?.id === pass.id) return;
    this.index = index;
    this.render();
  }

  private render(): void {
    const fits = (shot: Shot, tab: Tab) =>
      tab === "all" || (tab === "weather") === shot.scene.daily;
    this.shown = this.shots.filter((shot) => fits(shot, this.tab));
    this.root.hidden = this.shots.length === 0;
    for (const button of this.all<HTMLButtonElement>("tab")) {
      const tab = button.dataset.galleryTab as Tab;
      button.setAttribute("aria-pressed", String(tab === this.tab));
      button.hidden = !this.shots.some((shot) => fits(shot, tab));
    }
    window.clearTimeout(this.settle);
    const shot = this.shown[this.index];
    if (!shot) return;
    for (const button of this.all<HTMLButtonElement>("step")) {
      button.disabled = this.shown.length < 2;
    }
    const { scene, pass, archived } = shot;

    this.part("count").textContent = `${this.index + 1} / ${this.shown.length}`;
    this.part("name").textContent = `${scene.platform} · ${formatWhen(scene.datetime)}`;
    const cloud = scene.daily
      ? "daily mosaic"
      : scene.cloudCover === null
        ? ""
        : scene.cloudCover < 10
          ? "clear"
          : `${Math.round(scene.cloudCover)}% cloud across scene`;
    this.part("what").textContent = [`${scene.metres} m per pixel`, formatAway(scene.datetime), cloud]
      .filter(Boolean)
      .join(" · ");

    const replay = this.part<HTMLButtonElement>("replay");
    replay.hidden = !(pass || shot.relatedPass);
    replay.textContent = pass ? "Replay" : "Replay another pass";
    replay.title = shot.relatedPass
      ? `${shot.relatedPass.name} · ${formatWhen(shot.relatedPass.time)}`
      : "";

    const canvas = this.part<HTMLCanvasElement>("canvas");
    const img = this.part<HTMLImageElement>("img");
    const pin = this.part("pin");
    const tag = this.part("tag");
    const placeholder = this.part("placeholder");
    const open = this.part("open");
    const label = archived ? "Clear archive view" : scene.daily ? "Regional mosaic" : "Full scene";
    const detail = scene.visual && (scene.cloudCover ?? 0) < 70 && (!window.matchMedia(PHONE).matches || !scene.thumbnail || archived);
    canvas.hidden = pin.hidden = img.hidden = true;
    pin.style.left = pin.style.top = "50%";
    img.alt = `${this.place.label} seen by ${scene.platform}`;
    tag.hidden = true;
    placeholder.hidden = false;
    placeholder.textContent = scene.thumbnail || detail ? "Loading imagery…" : "Preview unavailable";
    open.setAttribute("aria-label", `Open ${scene.platform} imagery of ${this.place.label}`);

    const preview = () => {
      if (this.shown[this.index] !== shot || !canvas.hidden || !img.complete) return;
      const ready = Boolean(img.naturalWidth);
      img.hidden = !ready;
      pin.hidden = !ready || !scene.daily;
      tag.hidden = !ready;
      tag.textContent = label;
      placeholder.hidden = ready;
      placeholder.textContent = "Preview unavailable. Try another image.";
    };
    img.onload = img.onerror = preview;
    if (scene.thumbnail) {
      img.src = scene.thumbnail;
      preview();
    } else {
      img.removeAttribute("src");
    }

    if (!detail) return;
    this.settle = window.setTimeout(() => {
      closeup(scene, this.place.lat, this.place.lon)
        .then((found) => {
          if (this.shown[this.index] !== shot) return;
          drawCloseup(canvas, pin, found);
          canvas.hidden = pin.hidden = false;
          img.hidden = true;
          tag.hidden = false;
          placeholder.hidden = true;
          tag.textContent = archived ? "Clear archive view" : `8 km across`;
        })
        .catch(() => {
          if (this.shown[this.index] !== shot || placeholder.hidden) return;
          placeholder.textContent = "Preview unavailable. Try another image.";
        });
    }, SETTLE_MS);
  }
}
