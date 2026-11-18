// A satellite picture shown large: the dialog with the data-scene
// attribute in components/satellite/SatellitePage.tsx.

import { closeup, type Closeup } from "../closeup";
import { describeScene } from "../scenes";
import { formatWhen } from "../time";
import type { Scene } from "../types";

type View = "closeup" | "frame";

let loading: AbortController | null = null;

/** Put a close-up on its canvas, and the ring on the place in it. */
export function drawCloseup(canvas: HTMLCanvasElement, pin: HTMLElement, found: Closeup): void {
  canvas.width = found.image.width;
  canvas.height = found.image.height;
  canvas.getContext("2d")?.putImageData(found.image, 0, 0);
  pin.style.left = `${(found.x / found.image.width) * 100}%`;
  pin.style.top = `${(found.y / found.image.height) * 100}%`;
}

/** Shut the dialog and drop a close-up on its way, as when the page is left. */
export function closeScene(): void {
  loading?.abort();
  loading = null;
  const dialog = document.querySelector<HTMLDialogElement>("[data-scene]");
  if (dialog?.open) dialog.close();
}

/**
 * Show a scene large. Where the archive holds the full picture, the
 * dialog opens on a close-up of the place; the whole frame is one press away.
 */
export function openScene(scene: Scene, place: { lat: number; lon: number; label: string }): void {
  const dialog = document.querySelector<HTMLDialogElement>("[data-scene]");
  if (!dialog) return;
  const $ = <T extends HTMLElement>(name: string) =>
    dialog.querySelector<T>(`[data-scene-${name}]`)!;
  const canvas = $<HTMLCanvasElement>("canvas");
  const close = $("closeup");
  const img = $<HTMLImageElement>("img");
  const pin = $("pin");
  const note = $("note");
  const views = $("views");
  const buttons = [...views.querySelectorAll<HTMLButtonElement>("button")];

  const title = `${describeScene(scene)} · ${formatWhen(scene.datetime)}`;
  const record = document.createElement("a");
  record.href = scene.href;
  record.target = "_blank";
  record.rel = "noopener noreferrer";
  record.textContent = "Archive record";
  $("label").textContent = title;
  img.alt = `${place.label} seen by ${title}`;
  if (scene.thumbnail) img.src = scene.thumbnail;
  else img.removeAttribute("src");

  loading?.abort();
  const { signal } = (loading = new AbortController());
  dialog.addEventListener("close", () => loading?.abort(), { once: true });
  let detail: "loading" | "ready" | "failed" = scene.visual ? "loading" : "failed";

  const show = (view: View) => {
    const near = view === "closeup";
    for (const button of buttons) {
      button.setAttribute("aria-pressed", String(button.dataset.sceneView === view));
    }
    close.hidden = !near || detail !== "ready";
    // The frame stands in while the close-up loads.
    img.hidden = !close.hidden || !scene.thumbnail;
    const text =
      near && detail === "loading"
        ? "Fetching the close-up from the archive. Meanwhile, the whole frame."
        : near && detail === "ready"
          ? `${place.label}, 8 km across at 10 m to the pixel, as the satellite saw it. The ring marks the spot.`
          : scene.daily
            ? `${place.label} in the middle of the satellite's picture of that day, 240 km across.`
            : scene.thumbnail
              ? "The whole frame the satellite took, about 110 km across."
              : "The archive has no preview of this scene to show here.";
    note.replaceChildren(`${text} `, record);
  };
  for (const button of buttons) {
    button.onclick = () => show(button.dataset.sceneView as View);
  }

  views.hidden = !scene.visual;
  show("closeup");
  if (!dialog.open) dialog.showModal();
  if (!scene.visual) return;

  closeup(scene, place.lat, place.lon)
    .then((found) => {
      if (signal.aborted) return;
      drawCloseup(canvas, pin, found);
      detail = "ready";
      show("closeup");
    })
    .catch(() => {
      if (signal.aborted) return;
      // Outside the frame, or the archive would not answer: the frame stays.
      detail = "failed";
      views.hidden = true;
      show("frame");
    });
}
