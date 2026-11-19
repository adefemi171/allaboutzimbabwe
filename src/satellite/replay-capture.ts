import { closeup } from "./closeup";
import type { MatchedPass } from "./types";

type Direction = "down" | "up" | "left" | "right";
type Place = { lat: number; lon: number; label: string };

/** Reveal an archive image as a function of replay time, including reverse seeks. */
export class ReplayCapture {
  private readonly canvas: HTMLCanvasElement;
  private readonly caption: HTMLElement;
  private version = 0;

  constructor(private readonly figure: HTMLElement) {
    this.canvas = figure.querySelector("canvas")!;
    this.caption = figure.querySelector("figcaption")!;
  }

  set(pass: MatchedPass | null, place: Place | null): void {
    const version = ++this.version;
    this.figure.hidden = true;
    const scene = pass?.scene;
    // A daily mosaic or a nearby unmatched capture does not belong to the replay.
    if (!pass || !place || !scene || scene.daily || scene.noradId !== pass.noradId) return;
    this.update(0, "down");
    const cloudy = (scene.cloudCover ?? 0) >= 70;
    const scanLabel = cloudy ? " · " + Math.round(scene.cloudCover!) + "% cloud across scene" : "";
    const canvas = this.canvas;
    const context = canvas.getContext("2d");
    if (!context) return;

    const render = async () => {
      try {
        const found = await closeup(scene, place.lat, place.lon);
        if (version !== this.version) return;
        canvas.width = found.image.width;
        canvas.height = found.image.height;
        context.putImageData(found.image, 0, 0);
        this.caption.textContent = "Matched capture · simulated scan" + scanLabel;
      } catch {
        if (version !== this.version || !scene.thumbnail) return;
        const preview = new Image();
        preview.referrerPolicy = "no-referrer";
        preview.src = scene.thumbnail;
        await preview.decode();
        if (version !== this.version) return;
        canvas.width = preview.naturalWidth;
        canvas.height = preview.naturalHeight;
        context.drawImage(preview, 0, 0);
        this.caption.textContent = "Matched preview · simulated scan" + scanLabel;
      }
      canvas.setAttribute("aria-label", place.label + " captured by " + scene.platform);
      this.figure.hidden = false;
    };
    void render().catch(() => {});
  }

  update(progress: number, direction: Direction): void {
    const horizontal = direction === "right" || direction === "left";
    const lines = horizontal ? this.canvas.width : this.canvas.height;
    const revealed = Math.floor(progress * lines);
    const covered = (100 * (1 - revealed / lines)).toFixed(3) + "%";
    const insets = {
      down: [0, 0, covered, 0],
      up: [covered, 0, 0, 0],
      right: [0, covered, 0, 0],
      left: [0, 0, 0, covered],
    };
    this.canvas.style.clipPath = "inset(" + insets[direction].join(" ") + ")";
  }
}
