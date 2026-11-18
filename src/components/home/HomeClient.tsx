"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { StoryStage } from "@/components/home/StoryStage";
import { RouteTimeline } from "@/components/guides/RouteTimeline";
import { ZIMBABWE_PLACES } from "@/data/zimbabwe-places";
import { ZIMBABWE_PROVINCES } from "@/data/zimbabwe-provinces";
import {
  STORY_SCENES,
  type StoryFrame,
  activeScene,
  elevationFromFrame,
  measureStoryFrame,
} from "@/lib/story-scroll";

const PROVINCE_COUNT = ZIMBABWE_PROVINCES.length;
/** One 3D world per province capital, plus one per campus or landmark that has its own. */
const WORLD_COUNT =
  PROVINCE_COUNT + ZIMBABWE_PLACES.filter((p) => p.has3DCampus && p.campusSlug).length;

export function HomeClient({ harareBuildings }: { harareBuildings: number }) {
  const [frame, setFrame] = useState<StoryFrame>({
    index: 0,
    hold: 0,
    travel: 0,
    past: false,
  });
  const [narrow, setNarrow] = useState(false);
  const [solidHeader, setSolidHeader] = useState(false);
  const [harareClock, setHarareClock] = useState("");

  const globeRef = useRef<HTMLElement>(null);
  const countryRef = useRef<HTMLElement>(null);
  const highveldRef = useRef<HTMLElement>(null);
  const harareRef = useRef<HTMLElement>(null);
  const afterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setHarareClock(
        now.toLocaleTimeString("en-GB", {
          timeZone: "Africa/Harare",
          hour: "2-digit",
          minute: "2-digit",
        })
      );
    };
    updateClock();
    const id = setInterval(updateClock, 15000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 820px)");
    const syncNarrow = () => setNarrow(mq.matches);
    syncNarrow();
    mq.addEventListener("change", syncNarrow);

    let queued = false;
    const render = () => {
      const sections = [
        globeRef.current,
        countryRef.current,
        highveldRef.current,
        harareRef.current,
      ].filter((el): el is HTMLElement => Boolean(el));
      if (!sections.length) return;

      const next = measureStoryFrame(sections, afterRef.current);
      // Scrolling the guides below the story measures the same frame every time.
      setFrame((prev) =>
        prev.index === next.index &&
        prev.hold === next.hold &&
        prev.travel === next.travel &&
        prev.past === next.past
          ? prev
          : next
      );
      setSolidHeader(
        (afterRef.current?.getBoundingClientRect().top ?? 9999) <= 64
      );
    };

    const queue = () => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(() => {
        queued = false;
        render();
      });
    };

    render();
    window.addEventListener("scroll", queue, { passive: true });
    window.addEventListener("resize", queue);
    return () => {
      mq.removeEventListener("change", syncNarrow);
      window.removeEventListener("scroll", queue);
      window.removeEventListener("resize", queue);
    };
  }, []);

  const currentScene = activeScene(frame);
  const elevRatio = elevationFromFrame(frame);
  const elevMetres = Math.round(350 + elevRatio * (2592 - 350));
  const pastStory = frame.past;
  const badgeRef = useRef<HTMLDivElement>(null);
  const showGlobeBadge = currentScene === "globe" && !pastStory && frame.travel < 0.45;

  return (
    <div className="min-h-screen bg-[#0c0e0c] text-[#e9e5db]">
      <Navbar transparent solid={solidHeader} />

      <main id="main" className="relative">
        <StoryStage frame={frame} narrow={narrow} badgeRef={badgeRef} />

        {/* Left directional readability shade matching All About Netherlands */}
        <div
          aria-hidden="true"
          className="pointer-events-none fixed inset-0 z-[1]"
          style={{
            background: narrow
              ? "linear-gradient(0deg, rgb(12 14 12 / 0.94), rgb(12 14 12 / 0.8) 38%, rgb(12 14 12 / 0) 66%)"
              : "linear-gradient(90deg, rgb(12 14 12 / 0.9), rgb(12 14 12 / 0.72) 28%, rgb(12 14 12 / 0) 58%)",
          }}
        />

        {showGlobeBadge && (
          <div
            aria-hidden="true"
            ref={badgeRef}
            className="pointer-events-none fixed left-0 top-0 z-[2] h-[22px] w-[22px]"
          >
            <span className="absolute inset-0 rounded-full border-2 border-[#ffd200] opacity-90 [animation:zw-ping_2.6s_cubic-bezier(0.2,0.6,0.3,1)_infinite]" />
            <span className="absolute inset-0 rounded-full border-2 border-[#ffd200]" />
            {/* On phones the country sits at the screen edge, so only the ring shows. */}
            <span className="absolute bottom-[calc(100%+8px)] left-1/2 hidden -translate-x-1/2 whitespace-nowrap rounded-[3px] bg-[#ffd200] px-2.5 py-1 text-[0.78rem] font-bold tracking-tight text-[#0c0e0c] shadow-[0_2px_10px_rgb(6_14_22/0.45)] md:block">
              Zimbabwe
            </span>
          </div>
        )}

        {/* SCENE 1: GLOBE HERO — one screen; camera holds, then travels on the way out */}
        <section
          ref={globeRef}
          id="globe"
          className="relative z-[2] h-[100lvh] pointer-events-none"
        >
          <div
            className={`sticky top-0 mx-auto grid h-[100svh] w-[min(100%-2*clamp(1rem,3vw,2.5rem),96rem)] pt-16 ${
              narrow ? "content-end pb-[4.4rem]" : "content-center"
            }`}
          >
            <div className="pointer-events-auto max-w-[46rem]">
              <p className="mono text-[#ffd200]">
                17.83°S 31.05°E
                {harareClock ? ` · HARARE ${harareClock}` : ""}
              </p>
              <h1 className="mt-[1.1rem] text-[clamp(2.7rem,6.2vw,5.2rem)] font-black leading-[0.98] tracking-[-0.03em] text-[#e9e5db]">
                The Zimbabwe survival guide
              </h1>
              <p className="mt-[1.1rem] max-w-[31rem] text-[1.2rem] leading-[1.5] text-[#dadcd7]">
                Plain-language guides for living, working, and traveling across Zimbabwe: USD &amp; ZiG money, housing leases, solar &amp; ZESA, Starlink, and a 3D map of all 10 provinces.
              </p>
              <p className="mt-[1.1rem] flex flex-col gap-[0.7rem] pt-2 sm:flex-row sm:flex-wrap">
                <Link href="/guides/moving-to-harare" className="nld-btn justify-center sm:justify-start">
                  Start with the checklist
                </Link>
                <Link href="/guides" className="nld-btn-quiet justify-center sm:justify-start">
                  All guides
                </Link>
              </p>
            </div>

            {!narrow && (
              <p
                aria-hidden="true"
                className="mono absolute bottom-[3.6rem] left-0 flex items-center gap-[0.6rem] text-[#ffd200]"
              >
                <svg
                  width="12"
                  height="16"
                  viewBox="0 0 12 16"
                  className="[animation:zw-nudge_1.8s_ease-in-out_infinite]"
                >
                  <path
                    d="M6 1v13M1.5 9.5 6 14l4.5-4.5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                Scroll to fly in
              </p>
            )}
          </div>
        </section>

        {/* SCENE 2: THE COUNTRY — hold 170lvh like NL */}
        <section
          ref={countryRef}
          id="country"
          className="relative z-[2] h-[170lvh] pointer-events-none"
        >
          <div
            className={`sticky top-0 mx-auto grid h-[100svh] w-[min(100%-2*clamp(1rem,3vw,2.5rem),96rem)] pt-16 ${
              narrow ? "content-end pb-[4.4rem]" : "content-center"
            }`}
          >
            <div className="pointer-events-auto max-w-[31rem] [&>*+*]:mt-[1.1rem]">
              <p className="mono text-[#ffd200]">The country</p>
              <h2 className="text-[clamp(2rem,3.6vw,3.1rem)] font-extrabold leading-[1.04] tracking-[-0.02em] text-[#e9e5db]">
                10 provinces, 15.2 million people, one block at a time
              </h2>
              <p className="mono text-[0.72rem] text-[#a4aaa2]">
                Population: 15,178,979,{" "}
                <a
                  href="https://zimbabwe.unfpa.org/sites/default/files/pub-pdf/2022_population_and_housing_census_preliminary_report_on_population_figures.pdf"
                  className="underline"
                  target="_blank"
                  rel="noreferrer"
                >
                  ZIMSTAT 2022 census
                </a>
              </p>
              <p className="leading-relaxed text-[#dadcd7]">
                From Harare and Bulawayo to Manicaland, Midlands, Masvingo, and Matabeleland North—explore all 10 provincial capitals plus flagship university campuses in real OpenStreetMap 3D voxels.
              </p>
              <p className="text-[#dadcd7]">
                <Link href="/atlas" className="text-[#62b4e8] underline underline-offset-4">
                  Explore all 10 provinces
                </Link>{" "}
                or{" "}
                <Link href="/harare" className="text-[#62b4e8] underline underline-offset-4">
                  open the 3D map
                </Link>{" "}
                to fly around yourself.
              </p>
            </div>
          </div>
        </section>

        {/* SCENE 3: HIGHVELD — long 320lvh; elevation rises while pinned */}
        <section
          ref={highveldRef}
          id="highveld"
          className="relative z-[2] h-[320lvh] pointer-events-none"
        >
          <div
            className={`sticky top-0 mx-auto grid h-[100svh] w-[min(100%-2*clamp(1rem,3vw,2.5rem),96rem)] pt-16 ${
              narrow ? "content-end pb-[4.4rem]" : "content-center"
            }`}
          >
            <div className="pointer-events-auto max-w-[31rem] [&>*+*]:mt-[1.1rem]">
              <p className="mono text-[#ffd200]">Highveld &amp; Zambezi</p>
              <h2 className="text-[clamp(2rem,3.6vw,3.1rem)] font-extrabold leading-[1.04] tracking-[-0.02em] text-[#e9e5db]">
                From the Zambezi gorge to the 2,592m Eastern Highlands
              </h2>
              <p className="leading-relaxed text-[#dadcd7]">
                Zimbabwe&apos;s climate follows its plateau relief: warm lowveld valleys at Kariba and Victoria Falls, crisp Highveld mornings across Harare and Bulawayo, and misty mountain peaks in Nyanga. Keep scrolling to climb the plateau.
              </p>

              <div className="grid grid-cols-[auto_1fr] items-center gap-[1.3rem] pt-[0.6rem]">
                <div
                  aria-hidden="true"
                  className="relative h-32 w-10 overflow-hidden rounded border border-[#2b302b] bg-[#f6f2e8] text-[#0c0e0c] shadow-[0_10px_30px_rgb(0_0_0/0.35)] sm:h-[11.5rem] sm:w-11"
                >
                  <div
                    className="absolute inset-x-0 bottom-0 bg-[#62b4e8]/55 transition-[height] duration-75"
                    style={{ height: `${Math.round(elevRatio * 100)}%` }}
                  />
                  <div className="relative z-10 flex h-full flex-col justify-between p-1.5 font-mono-tech text-[9px] font-bold">
                    <span>2.6k</span>
                    <span>2.0k</span>
                    <span className="border-t border-[#ff5a47] text-[#ff5a47]">1.5k</span>
                    <span>1.0k</span>
                    <span>350m</span>
                  </div>
                </div>
                <div className="grid gap-2">
                  <div className="font-mono-tech text-[clamp(1.8rem,3vw,2.5rem)] font-semibold leading-none tracking-[-0.02em] text-white tabular-nums">
                    +{elevMetres.toLocaleString()} m
                  </div>
                  <p className="max-w-[14rem] text-sm leading-[1.4] text-[#dadcd7]">
                    {elevMetres < 900
                      ? "Zambezi & Lowveld basin · Victoria Falls, Kariba & Gonarezhou"
                      : elevMetres < 1800
                      ? "Central Highveld plateau · Harare (1,490m), Bulawayo & Gweru"
                      : "Eastern Highlands · Mutare, Vumba & Mount Nyangani (2,592m)"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SCENE 4: HARARE STREETS — hold 170lvh */}
        <section
          ref={harareRef}
          id="harare"
          className="relative z-[2] h-[170lvh] pointer-events-none"
        >
          <div
            className={`sticky top-0 mx-auto grid h-[100svh] w-[min(100%-2*clamp(1rem,3vw,2.5rem),96rem)] pt-16 ${
              narrow ? "content-end pb-[4.4rem]" : "content-center"
            }`}
          >
            <div className="pointer-events-auto max-w-[31rem] [&>*+*]:mt-[1.1rem]">
              <p className="mono text-[#ffd200]">Where a move starts</p>
              <h2 className="text-[clamp(2rem,3.6vw,3.1rem)] font-extrabold leading-[1.04] tracking-[-0.02em] text-[#e9e5db]">
                Walk Harare&apos;s avenues, or ride a Kombi across town
              </h2>
              <p className="leading-relaxed text-[#dadcd7]">
                Every 3D province and university world is built from real OpenStreetMap buildings, avenues, jacaranda parks, and walking pedestrians—so you can preview neighborhoods before you sign a lease.
              </p>
              <p className="flex flex-col gap-[0.7rem] pt-2 sm:flex-row sm:flex-wrap">
                <Link href="/harare" className="nld-btn justify-center sm:justify-start">
                  Open Harare 3D map
                </Link>
                <Link href="/places" className="nld-btn-quiet justify-center sm:justify-start">
                  Universities &amp; Victoria Falls
                </Link>
              </p>
            </div>
          </div>
        </section>

        {/* Right-edge Vertical Scene Ticks */}
        <nav
          aria-label="Parts of the introduction"
          className={`fixed right-[clamp(1rem,3vw,2.5rem)] top-1/2 z-[3] hidden -translate-y-1/2 gap-[0.2rem] transition-opacity duration-300 md:grid ${
            pastStory ? "pointer-events-none opacity-0" : "opacity-100"
          }`}
        >
          {STORY_SCENES.map((sc) => {
            const current = currentScene === sc.id;
            return (
              <a
                key={sc.id}
                href={`#${sc.id}`}
                aria-current={current ? "step" : undefined}
                className={`group flex items-center justify-end gap-[0.6rem] py-[0.35rem] font-mono-tech text-[0.66rem] uppercase tracking-[0.08em] no-underline transition-colors ${
                  current ? "text-[#ffd200]" : "text-[#e9e5db]/55 hover:text-[#e9e5db]"
                }`}
              >
                <span
                  className={`transition-opacity ${
                    current ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                  }`}
                >
                  {sc.label}
                </span>
                <span
                  className={`h-[2px] bg-current transition-all ${
                    current ? "w-[1.8rem]" : "w-4"
                  }`}
                />
              </a>
            );
          })}
        </nav>

        {/* Bottom HUD */}
        <p
          className={`fixed bottom-4 left-[clamp(1rem,3vw,2.5rem)] z-[3] hidden font-mono-tech text-[0.69rem] uppercase tracking-[0.07em] text-[#e9e5db]/65 transition-opacity duration-300 md:block ${
            pastStory ? "pointer-events-none opacity-0" : "opacity-100"
          }`}
        >
          Harare <b className="font-medium text-[#e9e5db]">{harareClock || "CAT"}</b> ·{" "}
          {PROVINCE_COUNT} Provinces · {WORLD_COUNT} Real-OSM 3D Worlds
        </p>
        <p
          className={`fixed bottom-4 right-[clamp(1rem,3vw,2.5rem)] z-[3] hidden text-right font-mono-tech text-[0.69rem] uppercase tracking-[0.07em] text-[#e9e5db]/65 transition-opacity duration-300 md:block ${
            pastStory ? "pointer-events-none opacity-0" : "opacity-100"
          }`}
        >
          Buildings © OpenStreetMap ·{" "}
          <Link href="/atlas" className="text-inherit underline hover:text-[#e9e5db]">
            Atlas
          </Link>
        </p>

        {/* BELOW THE FLY-IN */}
        <div
          ref={afterRef}
          className="relative z-[4] border-t border-[#2b302b] bg-[#0c0e0c]"
        >
          <section
            aria-labelledby="steps-title"
            className="mx-auto grid w-[min(100%-2*clamp(1rem,4vw,3rem),72rem)] gap-[clamp(2rem,6vw,6rem)] py-[clamp(4rem,9vw,7.5rem)] md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]"
          >
            <div className="space-y-4 md:sticky md:top-24 md:self-start">
              <p className="mono">The guides</p>
              <h2
                id="steps-title"
                className="text-[clamp(1.9rem,3.4vw,2.8rem)] font-extrabold leading-[1.08] tracking-[-0.02em] text-[#e9e5db]"
              >
                A move, in the order it happens
              </h2>
              <p className="leading-relaxed text-[#dadcd7]">
                Start at the top and work down. Each guide covers what to do, what to bring, what it costs in USD or ZiG, and which official portals to use.
              </p>
              <p className="border-l-4 border-[#ffd200] bg-[#151815] px-4 py-3 text-[0.93rem] leading-relaxed text-[#a4aaa2]">
                Updated November 2026 across all 10 Zimbabwean provinces. Spot an outdated rent, fare, or rule? Use{" "}
                <strong className="text-[#e9e5db]">Report a problem</strong> on any guide.
              </p>
            </div>

            <RouteTimeline headingLevel={3} />
          </section>

          <section className="mx-auto grid w-[min(100%-2*clamp(1rem,4vw,3rem),72rem)] items-center gap-[clamp(2rem,6vw,6rem)] border-t border-[#2b302b] py-[clamp(3rem,7vw,5.5rem)] md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
            <div className="space-y-4">
              <p className="mono">The 3D map</p>
              <h2 className="text-[clamp(1.9rem,3.4vw,2.8rem)] font-extrabold leading-[1.08] tracking-[-0.02em] text-[#e9e5db]">
                Look around before you choose where to live
              </h2>
              <p className="leading-relaxed text-[#dadcd7]">
                Fly to Harare, Bulawayo, Mutare, Gweru, Masvingo, Victoria Falls, or Great Zimbabwe—switch time of day, walk sidewalks at street level, or ride a Kombi.
              </p>
              <p className="flex flex-wrap gap-[0.7rem] pt-1">
                <Link href="/harare" className="nld-btn">
                  Open the map
                </Link>
                <Link href="/atlas" className="nld-btn-quiet">
                  All 10 provinces
                </Link>
                <Link href="/tools" className="nld-btn-quiet">
                  Rent &amp; solar tools
                </Link>
              </p>
            </div>

            <dl className="m-0 grid grid-cols-2 gap-px border border-[#2b302b] bg-[#2b302b]">
              <div className="bg-[#0c0e0c] px-[1.3rem] py-[1.2rem]">
                <dt className="mono">Provinces mapped</dt>
                <dd className="mt-[0.35rem] font-mono-tech text-[clamp(1.25rem,2.2vw,1.7rem)] font-semibold tracking-[-0.02em] text-[#e9e5db] tabular-nums">
                  {PROVINCE_COUNT} / {PROVINCE_COUNT}
                </dd>
              </div>
              <div className="bg-[#0c0e0c] px-[1.3rem] py-[1.2rem]">
                <dt className="mono">3D voxel worlds</dt>
                <dd className="mt-[0.35rem] font-mono-tech text-[clamp(1.25rem,2.2vw,1.7rem)] font-semibold tracking-[-0.02em] text-[#ffd200] tabular-nums">
                  {WORLD_COUNT}
                </dd>
              </div>
              <div className="bg-[#0c0e0c] px-[1.3rem] py-[1.2rem]">
                <dt className="mono">Harare OSM buildings</dt>
                <dd className="mt-[0.35rem] font-mono-tech text-[clamp(1.25rem,2.2vw,1.7rem)] font-semibold tracking-[-0.02em] text-[#e9e5db] tabular-nums">
                  {harareBuildings.toLocaleString("en-US")}
                </dd>
              </div>
              <div className="bg-[#0c0e0c] px-[1.3rem] py-[1.2rem]">
                <dt className="mono">Annual sunshine</dt>
                <dd className="mt-[0.35rem] font-mono-tech text-[clamp(1.25rem,2.2vw,1.7rem)] font-semibold tracking-[-0.02em] text-[#4cb82a] tabular-nums">
                  3,000+ hrs
                </dd>
              </div>
            </dl>
          </section>

          <Footer />
        </div>
      </main>
    </div>
  );
}
