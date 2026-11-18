// The satellite page: pick a place, find the passes over it and the
// pictures that match, and show any of them on the globe.
//
// The markup is components/satellite/SatellitePage.tsx, which starts this
// when the page is entered and calls what it returns when the page is left.

import { loadGlobeCatalog, loadSearchCatalog } from "../catalog";
import { addDaily } from "../gibs";
import { SatelliteGlobe } from "../globe";
import { matchPasses } from "../match";
import { storePassTrack } from "../pass-track";
import { defaultWindow, watchers } from "../passes";
import { findPasses } from "../pool";
import { LABEL_COPY } from "../profile";
import { describeScene, searchScenes } from "../scenes";
import { formatAway, formatClock, formatWhen } from "../time";
import { ROWS, Timeline } from "../timeline";
import { trackOfPass } from "../track";
import type { GpRecord, MatchedPass, PassLabel, SatKind } from "../types";
import { Gallery } from "./gallery";
import { cityMapFor, findPlace, inZimbabwe, type WatchPlace } from "./places";
import { closeScene, openScene } from "./scene-dialog";
import { closeTimelapse, openTimelapse } from "./timelapse";

/**
 * The search box found a street, an address or a place. It tells the page
 * with this event on the page's root, a { lat, lon, label } as its detail.
 */
export const WATCH_EVENT = "sat:watch";

const BADGE: Record<PassLabel, string> = {
  watched: "◆",
  likely: "◇",
  could: "□",
  overhead: "+",
};

/** Which passes head the list. */
const RANK: Record<PassLabel, number> = { watched: 0, likely: 1, could: 2, overhead: 3 };

const KIND_COPY: Record<SatKind, string> = {
  imaging: "Takes pictures of the ground",
  radar: "Sees the ground by radar, through cloud and at night",
  weather: "Watches the weather",
  crew: "Has people on board",
  other: "Not known to take pictures",
};

/** Kilometres on the ground for one degree at the centre of the Earth. */
const KM_PER_DEGREE = 111.2;

/** The place the page is about. One of the site's own places has an id. */
interface Focus {
  lat: number;
  lon: number;
  label: string;
  id?: string;
  /** The visitor's own position: kept out of the address bar. */
  own?: boolean;
}

/** "17.829°S 31.052°E" */
function coordinates(lat: number, lon: number): string {
  const part = (value: number, plus: string, minus: string) =>
    `${Math.abs(value).toFixed(3)}°${value < 0 ? minus : plus}`;
  return `${part(lat, "N", "S")} ${part(lon, "E", "W")}`;
}

/**
 * The street or place nearest a spot in Zimbabwe, if OpenStreetMap knows
 * one (src/app/api/geocode). Elsewhere, or on failure, there is no name.
 */
async function nameOf(lat: number, lon: number, signal: AbortSignal): Promise<string | null> {
  if (!inZimbabwe({ lat, lon })) return null;
  try {
    const response = await fetch(`/api/geocode?lat=${lat.toFixed(5)}&lon=${lon.toFixed(5)}`, {
      signal,
    });
    if (!response.ok) return null;
    const data = (await response.json()) as { name?: string | null };
    return data.name || null;
  } catch {
    return null;
  }
}

type Filter = "all" | "photo" | SatKind;

function focusOn(place: WatchPlace): Focus {
  return { lat: place.lat, lon: place.lon, label: place.name, id: place.id };
}

/** The place a link asks for: "?place=bulawayo", or "?at=-17.92,25.86&name=Victoria%20Falls". */
function focusFromUrl(): Focus | null {
  const params = new URL(window.location.href).searchParams;
  const place = findPlace(params.get("place") ?? "");
  if (place) return focusOn(place);
  const [lat, lon] = (params.get("at") ?? "").split(",").map(Number);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  if (Math.abs(lat) > 90 || Math.abs(lon) > 180) return null;
  return { lat, lon, label: params.get("name") || coordinates(lat, lon) };
}

/** The same place as a query string, for the address bar. */
function queryFor(focus: Focus): string {
  return focus.id
    ? `?place=${encodeURIComponent(focus.id)}`
    : `?at=${focus.lat.toFixed(5)},${focus.lon.toFixed(5)}&name=${encodeURIComponent(focus.label)}`;
}

/**
 * Start the page inside its root element. Returns what ends it: the globe
 * and its drawing loop, the workers and requests under way, every listener.
 */
export function startSatellitePage(root: HTMLElement): () => void {
  const $ = <T extends HTMLElement>(selector: string) => root.querySelector<T>(selector);
  const $$ = <T extends HTMLElement>(selector: string) => root.querySelectorAll<T>(selector);
  const setText = (selector: string, text: string) => {
    const element = $(selector);
    if (element) element.textContent = text;
  };

  const canvas = $<HTMLCanvasElement>("[data-sat-canvas]");
  const report = $("[data-sat-report]");
  const status = $("[data-sat-status]");
  const progress = $<HTMLProgressElement>("[data-sat-progress]");
  const card = $("[data-sat-pass]");
  const tip = $("[data-sat-tip]");
  const strip = $<HTMLCanvasElement>("[data-sat-timeline-canvas]");
  const pictures = $("[data-sat-gallery]");
  if (!canvas || !report || !status || !progress || !card || !tip || !strip || !pictures) {
    return () => {};
  }

  /** Ends every listener of the page at once, and tells late answers they are late. */
  const life = new AbortController();
  const listen = { signal: life.signal };

  /** The label that follows the pointer, or nothing. */
  const hint = (text: string | null, x = 0, y = 0) => {
    tip.hidden = !text;
    if (!text) return;
    tip.textContent = text;
    tip.style.left = `${x}px`;
    tip.style.top = `${y}px`;
  };

  const globe = new SatelliteGlobe(canvas, {
    onHover(hovered) {
      hint(
        hovered && `${hovered.name} · ${Math.round(hovered.altitudeKm)} km up`,
        hovered?.x,
        hovered?.y,
      );
    },
    onTime(date, live) {
      const what = live ? "Now" : date.getTime() > Date.now() ? "Still to come" : "Replay";
      setText("[data-sat-clock]", `${what} · ${formatClock(date)}`);
    },
    onPick(lat, lon) {
      const spot: Focus = { lat, lon, label: coordinates(lat, lon) };
      void run(spot);
      void nameOf(lat, lon, life.signal).then((name) => {
        if (!name || focus !== spot || life.signal.aborted) return;
        spot.label = name;
        setText("[data-sat-where]", name);
        link(spot);
      });
    },
  });
  const timeline = new Timeline(strip, {
    onPick: (pass) => select(pass),
    onHover: (pass, x, y) => hint(pass && `${pass.name} · ${formatWhen(pass.time)}`, x, y),
  });
  const gallery = new Gallery(pictures, {
    onOpen: (shot) => focus && openScene(shot.scene, focus),
    onReplay: (shot) => {
      select(shot);
      canvas.scrollIntoView({ block: "nearest", behavior: "smooth" });
    },
  });

  let catalog: { search: GpRecord[]; globe: GpRecord[] } | null = null;
  let abort: AbortController | null = null;
  let focus: Focus | null = null;
  let matched: MatchedPass[] = [];
  let filter: Filter = "all";
  let selected: MatchedPass | null = null;
  let span = defaultWindow();

  const busy = (text: string, done = 0) => {
    status.textContent = text;
    status.hidden = !text;
    progress.hidden = !text;
    progress.value = done;
  };

  // --------------------------------------------------------- one pass --

  const select = (pass: MatchedPass | null) => {
    selected = pass;
    globe.showPass(pass);
    timeline.select(pass?.id ?? null);
    if (pass) gallery.show(pass);
    for (const item of $$("[data-pass-id]")) {
      item.classList.toggle("is-active", item.dataset.passId === pass?.id);
    }
    card.hidden = !pass;
    if (!pass) return;
    setText("[data-sat-pass-name]", pass.name);
    setText("[data-sat-pass-label]", `${LABEL_COPY[pass.label]} · ${KIND_COPY[pass.kind]}`);
    setText("[data-sat-pass-when]", `${formatWhen(pass.time)} · ${formatAway(pass.time)}`);
    setText("[data-sat-pass-height]", `${Math.round(pass.altitudeKm)} km up`);
    setText(
      "[data-sat-pass-near]",
      `${Math.round(pass.angleDeg * KM_PER_DEGREE)} km from straight overhead`,
    );
    const photo = $<HTMLButtonElement>("[data-sat-pass-photo]");
    if (photo) photo.hidden = !pass.scene;
    const draw = $<HTMLButtonElement>("[data-sat-pass-map]");
    if (draw) draw.hidden = !focus || !cityMapFor(focus);
  };

  $("[data-sat-pass-photo]")?.addEventListener(
    "click",
    () => {
      if (selected?.scene && focus) openScene(selected.scene, focus);
    },
    listen,
  );
  $("[data-sat-pass-replay]")?.addEventListener("click", () => globe.replayPass(), listen);
  $("[data-sat-pass-now]")?.addEventListener("click", () => select(null), listen);
  // Where the place lies in a 3D city map, that map can draw the pass.
  $("[data-sat-pass-map]")?.addEventListener(
    "click",
    () => {
      const pass = selected;
      const cityMap = focus && cityMapFor(focus);
      const record = pass && catalog?.search.find((each) => Number(each.NORAD_CAT_ID) === pass.noradId);
      const track = pass && record && focus && trackOfPass(record, pass, focus);
      if (!cityMap || !track) return;
      storePassTrack(track);
      window.location.href = `${cityMap}?satTrack=1`;
    },
    listen,
  );

  const passItem = (pass: MatchedPass): HTMLLIElement => {
    const item = document.createElement("li");
    const button = document.createElement("button");
    button.type = "button";
    button.className = "sat__item";
    button.dataset.passId = pass.id;
    button.classList.toggle("is-active", pass.id === selected?.id);

    const badge = document.createElement("span");
    badge.className = `sat__badge sat__badge--${pass.label}`;
    badge.textContent = BADGE[pass.label];
    badge.title = LABEL_COPY[pass.label];

    const meta = document.createElement("span");
    meta.className = "sat__meta";
    const name = document.createElement("strong");
    name.textContent = pass.name;
    const when = document.createElement("span");
    when.textContent = `${formatWhen(pass.time)} · ${formatAway(pass.time)}`;
    const what = document.createElement("span");
    what.textContent = pass.scene ? describeScene(pass.scene) : LABEL_COPY[pass.label];
    meta.append(name, when, what);

    button.append(badge, meta);
    button.addEventListener("click", () => {
      select(pass);
      // On a phone the globe is above the list, out of sight.
      canvas.scrollIntoView({ block: "nearest", behavior: "smooth" });
    });
    item.append(button);
    return item;
  };

  // ---------------------------------------------------------- the lists --

  const fits = (pass: MatchedPass, kind: Filter) =>
    kind === "all" || (kind === "photo" ? !!pass.scene : pass.kind === kind);

  const renderLists = () => {
    const shown = matched.filter((pass) => fits(pass, filter));
    // The next pass first. Of those gone by, the ones most likely to have
    // looked come first, and the latest of each.
    const upcoming = shown.filter((pass) => pass.upcoming);
    const past = shown
      .filter((pass) => !pass.upcoming)
      .sort((a, b) => RANK[a.label] - RANK[b.label] || b.time.localeCompare(a.time));
    const fill = (name: string, passes: MatchedPass[], limit: number) => {
      $(`[data-sat-${name}]`)?.replaceChildren(...passes.slice(0, limit).map(passItem));
      const note = $(`[data-sat-${name}-note]`);
      if (!note) return;
      note.hidden = passes.length > 0 && passes.length <= limit;
      note.textContent = passes.length
        ? `Showing the first ${limit} of ${passes.length}. Narrow it down with the buttons above.`
        : "Nothing here.";
    };
    fill("upcoming", upcoming, 40);
    fill("past", past, 80);
    if (focus) timeline.set(shown, focus, span);

    for (const chip of $$<HTMLButtonElement>("[data-sat-filter]")) {
      const kind = chip.dataset.satFilter as Filter;
      const count = matched.filter((pass) => fits(pass, kind)).length;
      chip.setAttribute("aria-pressed", String(kind === filter));
      chip.hidden = kind !== "all" && count === 0;
      const counter = chip.querySelector("span");
      if (counter) counter.textContent = String(count);
    }
  };

  for (const chip of $$<HTMLButtonElement>("[data-sat-filter]")) {
    chip.addEventListener(
      "click",
      () => {
        filter = chip.dataset.satFilter as Filter;
        renderLists();
      },
      listen,
    );
  }

  // ---------------------------------------------------------- one place --

  /** Put the place in the address bar, and its 3D city map, if it has one, in the link. */
  const link = (place: Focus) => {
    history.replaceState(null, "", `${window.location.pathname}${place.own ? "" : queryFor(place)}`);
    const cityMap = cityMapFor(place);
    const mapLink = $<HTMLAnchorElement>("[data-sat-map-link]");
    if (mapLink && cityMap) mapLink.href = cityMap;
    const mapNote = $("[data-sat-map-note]");
    if (mapNote) mapNote.hidden = !cityMap;
  };

  const run = async (next: Focus) => {
    abort?.abort();
    abort = new AbortController();
    const { signal } = abort;
    const place = (focus = next);

    report.hidden = false;
    setText("[data-sat-where]", place.label);
    setText("[data-sat-headline]", "");
    setText("[data-sat-summary]", "");
    busy("Looking up orbits…");
    matched = [];
    filter = "all";
    span = defaultWindow();
    select(null);
    renderLists();
    gallery.set([], place);
    for (const block of $$("[data-sat-block]")) {
      block.hidden = true;
    }

    globe.setPlace(place.lat, place.lon);
    link(place);

    try {
      if (!catalog) {
        const [search, dots] = await Promise.all([
          loadSearchCatalog(signal),
          loadGlobeCatalog(signal),
        ]);
        if (life.signal.aborted) return;
        catalog = { search: search.records, globe: dots };
        globe.setCatalog(catalog.globe);
      }
      const records = catalog.search;

      const [passes, scenes] = await Promise.all([
        findPasses(records, place.lat, place.lon, {
          window: span,
          signal,
          onProgress: (done, total) => busy("Checking a week of orbits…", done / total),
        }),
        // Without the archive there are still the passes.
        searchScenes(place.lat, place.lon, { signal }).catch(() => null),
      ]);
      if (signal.aborted) return;

      matched = matchPasses(passes, scenes ?? [], records);
      addDaily(matched, place.lat, place.lon);
      const past = matched.filter((pass) => !pass.upcoming);
      const photos = matched.filter((pass) => pass.scene).length;
      const upcoming = matched.length - past.length;
      const satellites = new Set(past.map((pass) => pass.noradId)).size;
      busy("");
      setText(
        "[data-sat-headline]",
        `In the last 7 days, ${satellites} satellites passed over ${place.label}.`,
      );
      setText(
        "[data-sat-summary]",
        `${photos} of their pictures of it are public` +
          (scenes ? "" : " (the Sentinel and Landsat archive could not be reached)") +
          (upcoming ? `, and ${upcoming} more passes come in the next 2 days.` : "."),
      );
      for (const label of ROWS) {
        setText(
          `[data-sat-count="${label}"]`,
          String(past.filter((pass) => pass.label === label).length),
        );
      }
      gallery.set(matched, place);

      const always = watchers(records, place.lat, place.lon).map((profile) => profile.name);
      setText(
        "[data-sat-always]",
        `${always.join(", ")}. Weather satellites that hang 35,786 km over the equator and photograph this side of the Earth every few minutes.`,
      );
      const blocks: Record<string, boolean> = {
        always: always.length > 0,
        lapse: true,
        timeline: true,
        passes: true,
      };
      for (const block of $$("[data-sat-block]")) {
        block.hidden = !blocks[block.dataset.satBlock ?? ""];
      }
      renderLists();
    } catch {
      if (!signal.aborted) busy("Could not finish the orbit search. Try again in a moment.");
    }
  };

  // ------------------------------------------------------------ choosing --

  const pick = (id: string): boolean => {
    const place = findPlace(id);
    if (place) void run(focusOn(place));
    return !!place;
  };
  for (const button of $$<HTMLButtonElement>("[data-sat-pick]")) {
    button.addEventListener("click", () => pick(button.dataset.satPick ?? ""), listen);
  }
  // What the search box found (components/satellite/LocationSearch.tsx): a
  // street, an address or a place anywhere in Zimbabwe.
  root.addEventListener(
    WATCH_EVENT,
    (event) => {
      const { lat, lon, label } = (event as CustomEvent<Focus>).detail;
      void run({ lat, lon, label });
    },
    listen,
  );

  const locate = $<HTMLButtonElement>("[data-sat-locate]");
  if (locate && "geolocation" in navigator) {
    locate.hidden = false;
    locate.addEventListener(
      "click",
      () => {
        navigator.geolocation.getCurrentPosition(
          ({ coords }) => {
            if (life.signal.aborted) return;
            void run({
              lat: coords.latitude,
              lon: coords.longitude,
              label: "Where you are",
              own: true,
            });
          },
          () => (locate.textContent = "Your location is not available"),
          { maximumAge: 600_000, timeout: 10_000 },
        );
      },
      listen,
    );
  }
  $("[data-sat-lapse]")?.addEventListener(
    "click",
    () => {
      if (focus) openTimelapse(focus);
    },
    listen,
  );

  const zooms: Record<string, number> = { in: 0.7, out: 1 / 0.7 };
  for (const button of $$<HTMLButtonElement>("[data-sat-zoom]")) {
    button.addEventListener(
      "click",
      () => globe.zoomBy(zooms[button.dataset.satZoom ?? ""] ?? 1),
      listen,
    );
  }
  const day = $<HTMLInputElement>("[data-sat-day]");
  if (day) {
    globe.setDayPicture(day.checked);
    day.addEventListener("change", () => globe.setDayPicture(day.checked), listen);
  }

  const start = focusFromUrl();
  if (start) void run(start);
  else pick("harare");

  return () => {
    life.abort();
    abort?.abort();
    closeScene();
    closeTimelapse();
    gallery.dispose();
    timeline.dispose();
    globe.dispose();
    hint(null);
    card.hidden = true;
  };
}
