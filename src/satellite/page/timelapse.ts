// A place through the years: the dialog with the data-lapse attribute in
// components/satellite/SatellitePage.tsx.

import { closeup, type Closeup } from "../closeup";
import { SENTINEL_2, searchScenes } from "../scenes";
import { formatWhen } from "../time";
import { drawCloseup } from "./scene-dialog";

/** The archive starts in the middle of 2017. */
const FIRST_YEAR = 2017;
/** Side of a frame in pixels of 10 m. Smaller than a close-up: there are many. */
const SIDE = 512;
const FRAME_MS = 1100;

interface Frame {
  year: number;
  when: string;
  found: Closeup;
}

let running: AbortController | null = null;
/** Stops the time-lapse that is open, if one is. */
let stop: (() => void) | null = null;

/** Shut the dialog and stop fetching and playing, as when the page is left. */
export function closeTimelapse(): void {
  stop?.();
  const dialog = document.querySelector<HTMLDialogElement>("[data-lapse]");
  if (dialog?.open) dialog.close();
}

/**
 * The clearest picture of a dry season that has the place in it. From May
 * to the middle of September the sky over Zimbabwe is seldom clouded.
 */
async function dryMonthsOf(
  year: number,
  lat: number,
  lon: number,
  signal: AbortSignal,
): Promise<Frame | null> {
  const scenes = await searchScenes(lat, lon, {
    signal,
    collections: [SENTINEL_2],
    from: new Date(Date.UTC(year, 4, 1)),
    to: new Date(Math.min(Date.UTC(year, 8, 15), Date.now())),
    maxCloud: 20,
    limit: 4,
  });
  for (const scene of scenes) {
    if (signal.aborted) return null;
    try {
      return { year, when: scene.datetime, found: await closeup(scene, lat, lon, SIDE) };
    } catch {
      // The strip missed the place: the next clearest may not have.
    }
  }
  return null;
}

export function openTimelapse(place: { lat: number; lon: number; label: string }): void {
  const dialog = document.querySelector<HTMLDialogElement>("[data-lapse]");
  if (!dialog) return;
  const $ = <T extends HTMLElement>(name: string) =>
    dialog.querySelector<T>(`[data-lapse-${name}]`)!;
  const canvas = $<HTMLCanvasElement>("canvas");
  const pin = $("pin");
  const note = $("note");
  const play = $<HTMLButtonElement>("play");

  stop?.();
  const { signal } = (running = new AbortController());
  // This year only once its dry season is under way.
  const now = new Date();
  const last = now.getUTCFullYear() - (now.getUTCMonth() < 6 ? 1 : 0);
  const years = Array.from({ length: last - FIRST_YEAR + 1 }, (_, i) => FIRST_YEAR + i);
  const frames = new Map<number, Frame>();
  let shown = 0;
  let playing = true;
  let waiting = years.length;

  const buttons = new Map(
    years.map((year) => {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = String(year);
      button.disabled = true;
      button.onclick = () => {
        setPlaying(false);
        show(year);
      };
      return [year, button];
    }),
  );
  $("years").replaceChildren(play, ...buttons.values());
  $("label").textContent = `${place.label} · year by year`;
  canvas.width = canvas.height = SIDE;
  pin.hidden = true;

  const tell = () => {
    const frame = frames.get(shown);
    const progress = waiting ? `Fetching ${waiting} more years from the archive. ` : "";
    note.textContent = frame
      ? `${progress}${formatWhen(frame.when)}, ${frame.year}: the clearest picture Sentinel-2 took in the dry season, 5 km across.`
      : waiting
        ? "Looking up the clearest dry-season picture of every year since 2017…"
        : "The archive has no clear dry-season picture of this place.";
  };
  const show = (year: number) => {
    const frame = frames.get(year);
    if (!frame) return;
    shown = year;
    drawCloseup(canvas, pin, frame.found);
    pin.hidden = false;
    for (const [each, button] of buttons) button.setAttribute("aria-pressed", String(each === year));
    tell();
  };
  const setPlaying = (on: boolean) => {
    playing = on;
    play.textContent = on ? "Pause" : "Play";
    play.setAttribute("aria-pressed", String(on));
  };
  play.onclick = () => setPlaying(!playing);
  setPlaying(true);
  tell();

  const timer = window.setInterval(() => {
    const have = [...frames.keys()].sort();
    if (playing && have.length > 1) show(have[(have.indexOf(shown) + 1) % have.length]);
  }, FRAME_MS);
  const halt = () => {
    window.clearInterval(timer);
    running?.abort();
    dialog.removeEventListener("close", halt);
    if (stop === halt) stop = null;
  };
  stop = halt;
  dialog.addEventListener("close", halt);
  if (!dialog.open) dialog.showModal();

  // Two at a time: quick enough, and light on a phone's line.
  const queue = [...years];
  const work = async () => {
    for (let year = queue.shift(); year && !signal.aborted; year = queue.shift()) {
      const frame = await dryMonthsOf(year, place.lat, place.lon, signal).catch(() => null);
      if (signal.aborted) return;
      waiting--;
      if (frame) {
        frames.set(year, frame);
        buttons.get(year)!.disabled = false;
        if (!shown) show(year);
      }
      tell();
    }
  };
  void Promise.all([work(), work()]);
}
