// The pictures of a place, one at a time, at the head of the satellite
// page: the closest look first. Pressing the picture shows it large.

import { closeup } from "../closeup";
import { formatAway, formatWhen } from "../time";
import type { MatchedPass, Scene } from "../types";
import { drawCloseup } from "./scene-dialog";

type Tab = "all" | "detail" | "weather";
type Place = { lat: number; lon: number; label: string };
/** A pass that left a picture. */
type Shot = MatchedPass & { scene: Scene };

/** Leafing through quickly should not fetch every close-up on the way. */
const SETTLE_MS = 300;

/**
 * A close-up costs 2 to 10 MB of the archive's tiles. A phone shows the
 * archive's small preview and fetches the close-up only when the picture is
 * pressed open, as globe.ts gives a phone smaller pictures.
 */
const PHONE = "(max-width: 720px)";

export interface GalleryEvents {
  onOpen(shot: Shot): void;
  onReplay(shot: Shot): void;
}

/** The sharpest first, then the clearest, then the latest. Last, what cannot be shown. */
function order(a: Shot, b: Shot): number {
  const cloud = (shot: Shot) => Math.round((shot.scene.cloudCover ?? 0) / 20);
  return (
    Number(!a.scene.thumbnail) - Number(!b.scene.thumbnail) ||
    a.scene.metres - b.scene.metres ||
    cloud(a) - cloud(b) ||
    b.time.localeCompare(a.time)
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
        if (shot) events.onOpen(shot);
      },
      { signal },
    );
    this.part("replay").addEventListener(
      "click",
      () => {
        const shot = this.shown[this.index];
        if (shot) events.onReplay(shot);
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

  set(passes: MatchedPass[], place: Place): void {
    this.shots = passes.filter((pass): pass is Shot => !!pass.scene).sort(order);
    this.place = place;
    this.tab = "all";
    this.index = 0;
    this.render();
  }

  /** Turn to the picture of a pass, if it left one. */
  show(pass: MatchedPass): void {
    let index = this.shown.findIndex((shot) => shot.id === pass.id);
    if (index < 0 && this.shots.some((shot) => shot.id === pass.id)) {
      this.tab = "all";
      index = this.shots.findIndex((shot) => shot.id === pass.id);
    }
    if (index < 0 || index === this.index) return;
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
    const shot = this.shown[this.index];
    if (!shot) return;
    const { scene } = shot;

    this.part("count").textContent = `${this.index + 1} / ${this.shown.length}`;
    this.part("name").textContent = `${scene.platform} · ${formatWhen(scene.datetime)}`;
    const cloud = scene.daily
      ? "daily mosaic"
      : scene.cloudCover === null
        ? ""
        : scene.cloudCover < 10
          ? "clear"
          : `${Math.round(scene.cloudCover)}% cloud`;
    this.part("what").textContent = [`${scene.metres} m`, formatAway(scene.datetime), cloud]
      .filter(Boolean)
      .join(" · ");

    const canvas = this.part<HTMLCanvasElement>("canvas");
    const img = this.part<HTMLImageElement>("img");
    const pin = this.part("pin");
    const tag = this.part("tag");
    canvas.hidden = true;
    img.hidden = !scene.thumbnail;
    if (scene.thumbnail) img.src = scene.thumbnail;
    img.alt = `${this.place.label} seen by ${scene.platform}`;
    // A daily picture is cut with the place in its middle.
    pin.hidden = !scene.daily;
    pin.style.left = pin.style.top = "50%";
    const phone = window.matchMedia(PHONE).matches;
    tag.textContent = scene.daily
      ? "240 km across"
      : phone && scene.visual
        ? "Whole frame · tap for close-up"
        : scene.thumbnail
          ? "Whole frame"
          : "No preview";

    window.clearTimeout(this.settle);
    if (!scene.visual || phone) return;
    this.settle = window.setTimeout(() => {
      closeup(scene, this.place.lat, this.place.lon)
        .then((found) => {
          if (this.shown[this.index] !== shot) return;
          drawCloseup(canvas, pin, found);
          canvas.hidden = pin.hidden = false;
          img.hidden = true;
          tag.textContent = shot === this.shots[0] ? "Closest look" : "8 km across";
        })
        // Outside the frame, or the archive would not answer: the frame stays.
        .catch(() => {});
    }, SETTLE_MS);
  }
}
