// The week at a place on one strip: every pass as a mark, a row for each
// kind of pass, daylight behind them. Pressing a mark picks that pass.

import type { SearchWindow } from "./passes";
import { sunHeight } from "./sun";
import { ZONE } from "./time";
import type { MatchedPass, PassLabel } from "./types";

/** The rows, top to bottom. */
export const ROWS: PassLabel[] = ["watched", "likely", "could", "overhead"];

/** Room under the rows for the names of the days, CSS pixels. */
const DAYS_BAND = 16;
/** How near the pointer has to be to a mark, CSS pixels. */
const GRASP = 7;

const dayFormat = new Intl.DateTimeFormat("en-GB", {
  timeZone: ZONE,
  weekday: "short",
  day: "numeric",
});
const hourFormat = new Intl.DateTimeFormat("en-GB", {
  timeZone: ZONE,
  hourCycle: "h23",
  hour: "2-digit",
});

export interface TimelineEvents {
  onPick(pass: MatchedPass): void;
  /** The pointer is on a pass, at this spot on the page, or left it. */
  onHover(pass: MatchedPass | null, x: number, y: number): void;
}

export class Timeline {
  private passes: MatchedPass[] = [];
  private place = { lat: 0, lon: 0 };
  private window: SearchWindow = { startMs: 0, endMs: 1, nowMs: 0 };
  private selected: string | null = null;
  private queued = false;
  private frame = 0;
  private observer: ResizeObserver;
  /** Ends the listeners when the page is left. */
  private life = new AbortController();

  constructor(
    private canvas: HTMLCanvasElement,
    events: TimelineEvents,
  ) {
    const { signal } = this.life;
    this.observer = new ResizeObserver(() => this.queue());
    this.observer.observe(canvas);
    canvas.addEventListener(
      "pointermove",
      (event) => {
        const pass = this.passAt(event);
        canvas.style.cursor = pass ? "pointer" : "";
        events.onHover(pass, event.clientX, canvas.getBoundingClientRect().top);
      },
      { signal },
    );
    canvas.addEventListener("pointerleave", () => events.onHover(null, 0, 0), { signal });
    canvas.addEventListener(
      "click",
      (event) => {
        const pass = this.passAt(event);
        if (pass) events.onPick(pass);
      },
      { signal },
    );
  }

  /** Stop watching the canvas. The timeline cannot be used after this. */
  dispose(): void {
    this.life.abort();
    this.observer.disconnect();
    cancelAnimationFrame(this.frame);
    this.queued = true;
  }

  set(passes: MatchedPass[], place: { lat: number; lon: number }, window: SearchWindow): void {
    this.passes = passes;
    this.place = place;
    this.window = window;
    this.queue();
  }

  select(id: string | null): void {
    this.selected = id;
    this.queue();
  }

  private queue(): void {
    if (this.queued) return;
    this.queued = true;
    this.frame = requestAnimationFrame(() => {
      this.queued = false;
      this.draw();
    });
  }

  private x(ms: number): number {
    const { startMs, endMs } = this.window;
    return ((ms - startMs) / (endMs - startMs)) * this.canvas.clientWidth;
  }

  private y(label: PassLabel): number {
    const rows = this.canvas.clientHeight - DAYS_BAND;
    return ((ROWS.indexOf(label) + 0.5) / ROWS.length) * rows;
  }

  private passAt(event: MouseEvent): MatchedPass | null {
    const rect = this.canvas.getBoundingClientRect();
    const px = event.clientX - rect.left;
    const py = event.clientY - rect.top;
    let best: MatchedPass | null = null;
    let nearest = Infinity;
    for (const pass of this.passes) {
      const dx = Math.abs(this.x(Date.parse(pass.time)) - px);
      if (dx > GRASP) continue;
      // Of the marks at this moment, the one in the row under the pointer.
      const away = dx + Math.abs(this.y(pass.label) - py) * 0.5;
      if (away < nearest) {
        nearest = away;
        best = pass;
      }
    }
    return best;
  }

  private draw(): void {
    const { canvas } = this;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    const context = canvas.getContext("2d");
    if (!context || !width || !height) return;
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);

    const style = getComputedStyle(canvas);
    const colour = (name: string) => style.getPropertyValue(name).trim();
    const signal = colour("--signal");
    const text = colour("--text");
    const muted = colour("--muted");
    const { startMs, endMs, nowMs } = this.window;
    const rows = height - DAYS_BAND;

    // Daylight at the place, as a paler band behind the marks.
    context.fillStyle = text;
    context.globalAlpha = 0.07;
    const step = 10 * 60_000;
    for (let ms = startMs; ms < endMs; ms += step) {
      if (sunHeight(new Date(ms + step / 2), this.place.lat, this.place.lon) > 0) {
        context.fillRect(this.x(ms), 0, this.x(ms + step) - this.x(ms) + 0.5, rows);
      }
    }

    // The days, named where there is room.
    context.font = `10px ${style.fontFamily}`;
    context.textBaseline = "bottom";
    const dayWidth = this.x(startMs + 86400_000);
    for (let ms = Math.ceil(startMs / 3600_000) * 3600_000; ms < endMs; ms += 3600_000) {
      if (hourFormat.format(ms) !== "00") continue;
      const x = Math.round(this.x(ms)) + 0.5;
      context.globalAlpha = 0.25;
      context.fillStyle = muted;
      context.fillRect(x, 0, 1, height);
      context.globalAlpha = 1;
      // Not under the word "now".
      const clear = x < this.x(nowMs) - 44 || x > this.x(nowMs) + 30;
      if (dayWidth > 44 && clear) {
        context.fillText(dayFormat.format(ms).toUpperCase(), x + 5, height - 1);
      }
    }

    const marks: Record<PassLabel, (x: number, y: number) => void> = {
      watched(x, y) {
        context.fillStyle = signal;
        context.beginPath();
        context.moveTo(x, y - 5);
        context.lineTo(x + 4, y);
        context.lineTo(x, y + 5);
        context.lineTo(x - 4, y);
        context.fill();
      },
      likely(x, y) {
        context.fillStyle = text;
        context.fillRect(x - 0.75, y - 4, 1.5, 8);
      },
      could(x, y) {
        context.fillStyle = muted;
        context.fillRect(x - 0.5, y - 3, 1, 6);
      },
      overhead(x, y) {
        context.fillStyle = muted;
        context.fillRect(x - 1, y - 1, 2, 2);
      },
    };
    let chosen: MatchedPass | null = null;
    for (const pass of this.passes) {
      if (pass.id === this.selected) chosen = pass;
      // What is still to come is fainter than what has happened.
      context.globalAlpha = pass.upcoming ? 0.45 : pass.label === "watched" ? 1 : 0.8;
      marks[pass.label](this.x(Date.parse(pass.time)), this.y(pass.label));
    }

    context.globalAlpha = 1;
    context.fillStyle = signal;
    context.fillRect(Math.round(this.x(nowMs)), 0, 1, rows);
    context.textAlign = this.x(nowMs) > width - 40 ? "right" : "left";
    context.fillText("NOW", this.x(nowMs) + (context.textAlign === "left" ? 5 : -5), height - 1);
    context.textAlign = "left";

    if (chosen) {
      const x = this.x(Date.parse(chosen.time));
      const y = this.y(chosen.label);
      context.strokeStyle = signal;
      context.lineWidth = 1.5;
      context.beginPath();
      context.arc(x, y, 8, 0, Math.PI * 2);
      context.stroke();
    }
  }
}
