"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { LocationSearch } from "@/components/satellite/LocationSearch";
import { QUICK_PICKS } from "@/satellite/page/places";
import { startSatellitePage, WATCH_EVENT } from "@/satellite/page/satellite";
import "./satellite.css";

const FILTERS = [
  ["all", "All"],
  ["photo", "With a photo"],
  ["imaging", "Cameras"],
  ["radar", "Radar"],
  ["weather", "Weather"],
  ["crew", "Crewed"],
];
/** The rows of the timeline, as in src/satellite/timeline.ts. */
const ROWS = [
  ["watched", "Photo"],
  ["likely", "Likely"],
  ["could", "Could"],
  ["overhead", "Overhead"],
];
const TABS = [
  ["all", "All"],
  ["detail", "Detail"],
  ["weather", "Weather"],
];
const LEGEND = [
  ["imaging", "Camera"],
  ["radar", "Radar"],
  ["weather", "Weather"],
  ["crew", "Crewed"],
  ["other", "Other"],
];

/**
 * The satellite page. This is only its markup: src/satellite/page/satellite.ts
 * finds the parts by their data attributes and fills them in, so nothing
 * here is state and nothing here renders twice.
 */
export function SatellitePage() {
  const root = useRef<HTMLElement>(null);

  // The page script hands back what stops it: the globe, the workers, the listeners.
  useEffect(() => (root.current ? startSatellitePage(root.current) : undefined), []);

  return (
    <>
      <main id="main" className="sat" ref={root}>
        <div className="sat__stage">
          <div className="sat__viewport">
            <div className="sat__globe">
              <canvas
                data-sat-canvas
                tabIndex={0}
                role="application"
                aria-label="The Earth with the satellites around it. Arrow keys turn it, plus and minus zoom. Press a spot to see which satellites passed over it."
              />

              <p className="sat__clock mono" data-sat-clock />

              <figure className="sat__capture" data-sat-replay-capture hidden>
                <canvas role="img"></canvas>
                <figcaption></figcaption>
              </figure>

              <div className="sat__tools">
                <ul className="sat__legend" aria-label="What the dots are">
                  {LEGEND.map(([kind, label]) => (
                    <li key={kind} className={`sat__dot sat__dot--${kind}`}>
                      {label}
                    </li>
                  ))}
                </ul>
                <label className="sat__day">
                  <input type="checkbox" data-sat-day defaultChecked aria-label="Show today’s clouds on the globe" />
                  <span>Clouds of the day</span>
                </label>
                <div className="sat__zoom" role="group" aria-label="Zoom">
                  <button type="button" data-sat-zoom="in" aria-label="Zoom in">
                    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
                      <path
                        d="M8 3v10M3 8h10"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                      />
                    </svg>
                  </button>
                  <button type="button" data-sat-zoom="out" aria-label="Zoom out">
                    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
                      <path d="M3 8h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                    </svg>
                  </button>
                </div>
              </div>

              <p className="sat__tip mono" data-sat-tip hidden />
            </div>
            <article className="sat__pass sat__card" data-sat-pass hidden>
              <p className="mono" data-sat-pass-label />
              <h2 data-sat-pass-name />
              <dl>
                <div>
                  <dt className="mono">Closest</dt>
                  <dd data-sat-pass-when />
                </div>
                <div>
                  <dt className="mono">Passed</dt>
                  <dd data-sat-pass-near />
                </div>
              </dl>
              <div className="sat__replay" data-sat-replay hidden>
                <p className="sat__replay-status">
                  <strong data-sat-replay-phase></strong>
                  <span data-sat-replay-altitude></span>
                </p>
                <input className="sat__replay-scrubber" type="range" min="0" max="1000" defaultValue={0} data-sat-replay-progress aria-label="Replay time" />
                <div className="sat__replay-controls">
                  <button type="button" data-sat-replay-playback>Pause</button>
                  <button type="button" data-sat-replay-closest>Closest approach</button>
                  <button type="button" data-sat-replay-follow aria-pressed="false">Follow spacecraft</button>
                </div>
                <p className="sat__replay-scale">Illustrated spacecraft, enlarged for visibility</p>
              </div>
              <p className="sat__actions">
                <button type="button" className="is-main" data-sat-pass-photo>
                  See the photo
                </button>
                <button type="button" data-sat-pass-replay>
                  Restart
                </button>
                <button type="button" data-sat-pass-now>
                  Back to now
                </button>
                <button type="button" data-sat-pass-map hidden>
                  Draw on city map
                </button>
              </p>
            </article>
          </div>

          <section
            className="sat__timeline"
            data-sat-block="timeline"
            aria-label="The week on a timeline"
            hidden
          >
            <ul className="sat__rows mono">
              {ROWS.map(([label, name]) => (
                <li key={label} className={`sat__row sat__row--${label}`}>
                  {name} <span data-sat-count={label} />
                </li>
              ))}
            </ul>
            {/* The same passes are in the lists, for those who cannot use this. */}
            <canvas data-sat-timeline-canvas aria-hidden="true" />
          </section>
        </div>

        <div className="sat__panel">
          <header className="sat__intro">
            <h1>Satellite explorer</h1>
            <p className="sat__lede">
            Search for a place or pick one on the globe to see imagery and satellite passes.
            </p>
          </header>

          <div className="sat__search">
            <LocationSearch
              onPick={(place) =>
                root.current?.dispatchEvent(
                  new CustomEvent(WATCH_EVENT, {
                    detail: { lat: place.lat, lon: place.lon, label: place.name },
                  }),
                )
              }
            />
            <ul className="sat__picks">
              {QUICK_PICKS.map((place) => (
                <li key={place.id}>
                  <button type="button" data-sat-pick={place.id}>
                    {place.name}
                  </button>
                </li>
              ))}
              <li>
                <button type="button" data-sat-locate hidden>
                  Where I am
                </button>
              </li>
            </ul>
          </div>

          <section className="sat__report sat__card" data-sat-report hidden>
            <h2 data-sat-where />
            <p className="mono" data-sat-status role="status">
              Looking up orbits…
            </p>
            <progress className="sat__progress" data-sat-progress max={1} value={0} />
            <p className="sat__summary" data-sat-summary />

            <div className="sat__gallery" data-sat-gallery hidden>
              <h3 className="sat__gallery-title">Satellite imagery</h3>
              <div className="sat__gallery-bar">
                <div className="sat__tabs" role="group" aria-label="Image type">
                  {TABS.map(([tab, label]) => (
                    <button key={tab} type="button" data-gallery-tab={tab} aria-pressed="false">
                      {label}
                    </button>
                  ))}
                </div>
                <p className="mono" data-gallery-count />
                <button type="button" data-gallery-step="-1" aria-label="Previous picture">
                  <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true">
                    <path
                      d="M10 3 5 8l5 5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
                <button type="button" data-gallery-step="1" aria-label="Next picture">
                  <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true">
                    <path
                      d="m6 3 5 5-5 5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              </div>
              <button
                type="button"
                className="sat__picture"
                data-gallery-open
                aria-label="Show this picture large"
              >
                <span className="sat__square">
                  <canvas data-gallery-canvas hidden />
                  {/* The archives' own previews, at addresses only known once the page runs. */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img data-gallery-img alt="" referrerPolicy="no-referrer" decoding="async" hidden />
                  <span className="sat__pin" data-gallery-pin hidden />
                </span>
                <span className="sat__picture-message" data-gallery-placeholder hidden />
                <span className="sat__tag mono" data-gallery-tag />
                <span className="sat__picture-action" aria-hidden="true">View larger ↗</span>
              </button>
              <div className="sat__caption">
                <p>
                  <strong data-gallery-name />
                  <span data-gallery-what />
                </p>
                <button type="button" data-gallery-replay>
                  Replay
                </button>
              </div>
            </div>

            <div className="sat__block" data-sat-block="lapse" hidden>
              <button type="button" className="sat__lapse" data-sat-lapse>
                <strong className="mono">Time-lapse</strong>
                <span>This place, year by year</span>
              </button>
            </div>

            <div className="sat__block" data-sat-block="always" hidden>
              <h3 className="mono">Always watching</h3>
              <p className="sat__note" data-sat-always />
            </div>

            <div className="sat__block" data-sat-block="passes" hidden>
              <div className="sat__filters" role="group" aria-label="Which passes to list">
                {FILTERS.map(([kind, label]) => (
                  <button key={kind} type="button" data-sat-filter={kind} aria-pressed="false">
                    {label} <span />
                  </button>
                ))}
              </div>
              <h3 className="mono">Upcoming</h3>
              <ul className="sat__list" data-sat-upcoming />
              <p className="sat__note" data-sat-upcoming-note hidden />
              <h3 className="mono">This week</h3>
              <ul className="sat__list" data-sat-past />
              <p className="sat__note" data-sat-past-note hidden />
            </div>

            <p className="sat__credit">
              Times are Zimbabwe time (CAT, UTC+2). Orbits Celestrak · SGP4 via satellite.js ·
              Photos Sentinel / Landsat via Element84 Earth Search · Globe, clouds and daily
              pictures NASA Blue Marble, Black Marble, VIIRS and MODIS via GIBS · Place names
              OpenStreetMap · <Link href="/about#data">Sources</Link>
              {/* The page script points the link at the 3D map of the city the place lies in. */}
              <span data-sat-map-note hidden>
                {" "}
                · Also on the <a data-sat-map-link>3D city map</a>
              </span>
            </p>
          </section>
        </div>
      </main>

      {/* A satellite picture shown large: src/satellite/page/scene-dialog.ts. */}
      <dialog className="scene" data-scene>
        <form method="dialog" className="scene__bar">
          <p className="mono" data-scene-label />
          <button type="submit">Close</button>
        </form>
        <div className="scene__views" role="group" aria-label="What to show" data-scene-views>
          <button type="button" data-scene-view="closeup" aria-pressed="true">
            Close-up
          </button>
          <button type="button" data-scene-view="frame" aria-pressed="false">
            Whole frame
          </button>
        </div>
        <div className="scene__picture">
          <div className="scene__closeup" data-scene-closeup hidden>
            <canvas data-scene-canvas />
            <span className="scene__pin" data-scene-pin aria-hidden="true" />
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img data-scene-img alt="" referrerPolicy="no-referrer" hidden />
        </div>
        <p className="scene__note" data-scene-note role="status" />
      </dialog>

      {/* One place through the years: src/satellite/page/timelapse.ts. */}
      <dialog className="scene" data-lapse>
        <form method="dialog" className="scene__bar">
          <p className="mono" data-lapse-label />
          <button type="submit">Close</button>
        </form>
        <div className="scene__views" role="group" aria-label="Which year to show" data-lapse-years>
          <button type="button" data-lapse-play aria-pressed="true">
            Play
          </button>
        </div>
        <div className="scene__picture">
          <div className="scene__closeup">
            <canvas data-lapse-canvas />
            <span className="scene__pin" data-lapse-pin aria-hidden="true" hidden />
          </div>
        </div>
        <p className="scene__note" data-lapse-note role="status" />
      </dialog>
    </>
  );
}
