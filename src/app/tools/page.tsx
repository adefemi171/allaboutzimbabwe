"use client";

import { useMemo, useState } from "react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { openFeedbackModal } from "@/components/FeedbackWidget";
import { Home, Zap, Bus, Info, Flag } from "lucide-react";

const CITY_RENT_PRESETS = [
  { name: "Harare — Borrowdale / Mount Pleasant", defaultRent: 1600, levy: 120, depositMonths: 1, adminPct: 5 },
  { name: "Harare — Avondale / Belgravia", defaultRent: 950, levy: 85, depositMonths: 1, adminPct: 5 },
  { name: "Harare — The Avenues / CBD", defaultRent: 620, levy: 65, depositMonths: 1, adminPct: 5 },
  { name: "Harare — Bluff Hill / Westgate", defaultRent: 700, levy: 60, depositMonths: 1, adminPct: 5 },
  { name: "Bulawayo — Suburbs / Kumalo", defaultRent: 900, levy: 55, depositMonths: 1, adminPct: 5 },
  { name: "Bulawayo — Hillside / Burnside", defaultRent: 800, levy: 45, depositMonths: 1, adminPct: 5 },
  { name: "Victoria Falls — Low Density", defaultRent: 900, levy: 80, depositMonths: 1, adminPct: 5 },
  { name: "Mutare — Murambi / Greenside", defaultRent: 450, levy: 40, depositMonths: 1, adminPct: 5 },
  { name: "Gweru — Kopje / Windsor Park", defaultRent: 380, levy: 35, depositMonths: 1, adminPct: 5 },
  { name: "Masvingo — Rhodene / Target Kopje", defaultRent: 360, levy: 30, depositMonths: 1, adminPct: 5 },
];

/** Legal cap on a lease-preparation fee: 5% of the first month's rent (Rent Regulations 2007, s.27). */
const LEASE_FEE_CAP_PCT = 5;

const CHECKED = "November 2026";

const RENT_SOURCES = [
  {
    label: "Propzone: rent regulations (5% lease-fee cap, one-month deposit)",
    url: "https://www.propzone.co.zw/en/knowledge-base/landlord-tenant/being-landlord-zimbabwe-rent-regulations-tenant-screening-eviction/",
  },
  {
    label: "Property.co.zw 2025 rental guide",
    url: "https://www.property.co.zw/blog/how-do-rentals-work-in-zimbabwe-2025-guide-for-tenants-and-landlords",
  },
  {
    label: "Property.co.zw: costs beyond rent",
    url: "https://www.property.co.zw/blog/renting-in-zimbabwe-the-true-costs-beyond-monthly-rent",
  },
  {
    label: "Property.co.zw Bulawayo listings",
    url: "https://www.property.co.zw/property-for-rent/bulawayo",
  },
  {
    label: "Property.co.zw Mount Pleasant listings",
    url: "https://www.property.co.zw/houses-for-rent/harare-north/mount-pleasant",
  },
  {
    label: "Property.co.zw Avenues listings",
    url: "https://www.property.co.zw/flats-apartments-for-rent/harare-cbd/avenues",
  },
];

const SOLAR_SOURCES = [
  {
    label: "Global Solar Atlas: Bulawayo",
    url: "https://api.globalsolaratlas.info/data/lta?loc=-20.15,28.5833",
  },
  {
    label: "Global Solar Atlas: Harare",
    url: "https://api.globalsolaratlas.info/data/lta?loc=-17.8292,31.0522",
  },
  {
    label: "Global Solar Atlas: Mutare",
    url: "https://api.globalsolaratlas.info/data/lta?loc=-18.9707,32.6709",
  },
  {
    label: "The Herald: 304 days without load shedding (28 Oct 2026)",
    url: "https://www.heraldonline.co.zw/zim-nears-one-year-without-load-shedding/",
  },
  {
    label: "Propzone: installed solar prices in Harare (Jul 2026)",
    url: "https://www.propzone.co.zw/en/knowledge-base/market-investment/solar-power-harare-homes-sizing-cost/",
  },
];

const TRANSIT_SOURCES = [
  { label: "City Link fares", url: "https://www.citylinkcoaches.co.zw/routes-fares" },
  { label: "Rome2rio: Harare–Bulawayo", url: "https://www.rome2rio.com/s/Harare/Bulawayo" },
  { label: "Harare–Victoria Falls", url: "https://www.rome2rio.com/s/Harare/Victoria-Falls" },
  { label: "Harare–Mutare", url: "https://www.rome2rio.com/s/Harare/Mutare" },
  { label: "Harare–Masvingo", url: "https://www.rome2rio.com/s/Harare/Masvingo" },
  { label: "Harare–Beitbridge", url: "https://www.rome2rio.com/s/Harare/Beitbridge" },
  { label: "Seat61 (rail)", url: "https://seat61.com/Zimbabwe.htm" },
  {
    label: "Great Zimbabwe Guide (coach operators)",
    url: "https://www.greatzimbabweguide.com/coach-bus-and-shuttle-transfers-in-zimbabwe/",
  },
  { label: "The Anchor (highway progress)", url: "https://www.theanchor.co.zw/?p=10622" },
  { label: "Post on Sunday (kombi fares)", url: "https://postonsunday.co.zw/?p=9882" },
  { label: "Numbeo Harare", url: "https://www.numbeo.com/cost-of-living/in/Harare" },
  { label: "Numbeo Bulawayo", url: "https://www.numbeo.com/cost-of-living/in/Bulawayo" },
  {
    label: "Equity Axis (e-hailing operators)",
    url: "https://equityaxis.net/post/19447/2026/9/zimbabwe-gives-indrive-tap-go-and-bolt-five-months-to-build-a-sustainable-ride-hailing-model",
  },
  {
    label: "Zambia Immigration (KAZA Univisa)",
    url: "https://www.zambiaimmigration.gov.zm/kaza-univisa/",
  },
];

const TRANSIT_CORRIDORS = [
  {
    route: "Harare (HRE) ↔ Bulawayo (BUQ) · A5 Highway / Domestic Air",
    duration: "~55 min flight / ~6h coach",
    detail: "440 km via Gweru",
    transitTip:
      "fastjet flies daily; Air Zimbabwe is listed on Fridays only. Coaches (City Link, CAG Travellers, Eagle Liner, Bravo Tours, Extracity) leave from Roadport; driving takes about 4.5 hours.",
    fareEstimate: "$20–$35 coach (City Link $35) · flights from about €150 (Rome2rio estimate; check the airline)",
  },
  {
    route: "Harare (HRE) ↔ Victoria Falls (VFA) · Zambezi Corridor",
    duration: "~70 min flight / 13.5–16h coach",
    detail: "878 km via Bulawayo",
    transitTip:
      "Flying direct into Victoria Falls (VFA) saves a full day on the road: fastjet flies daily and Air Zimbabwe six days a week. The KAZA Univisa ($50) is issued at VFA.",
    fareEstimate: "coach about €25–€52 · flights from about €160 (Rome2rio estimates; check the airline)",
  },
  {
    route: "Harare ↔ Mutare (Eastern Highlands) · A3 Highway",
    duration: "~2.5h drive / ~4.5h coach",
    detail: "263 km via Marondera & Rusape",
    transitTip:
      "Tarred highway via Marondera and Rusape. CAG runs five coach departures a day from Mbare Musika. Fares rise at holidays.",
    fareEstimate: "$10–$18 intercity coach",
  },
  {
    route: "Harare ↔ Masvingo ↔ Beitbridge · A4 (R1) Highway",
    duration: "3h 45m coach to Masvingo / 7h+ to Beitbridge",
    detail: "292 km to Masvingo · 582 km to Beitbridge",
    transitTip:
      "Rehabilitated and widened corridor to Great Zimbabwe and the South African border: 550 of 580 km was complete by April 2026. Only short sections are four-lane.",
    fareEstimate: "coach about €30–€45 to Masvingo · €40–€55 to Beitbridge (Rome2rio estimates)",
  },
  {
    route: "Bulawayo ↔ Victoria Falls · NRZ sleeper train",
    duration: "Weekly, overnight (about 15h)",
    detail: "472 km",
    transitTip:
      "The only passenger train running (restarted October 2025). Leaves Bulawayo Friday 19:00, arrives Saturday 10:00; returns from Victoria Falls Sunday 19:00. No catering, and it often runs 1–4 hours late. Harare–Bulawayo passenger trains are not running.",
    fareEstimate: "$18 first-class berth · $9 economy · $5 bedding",
  },
  {
    route: "Urban: Harare & Bulawayo Kombis / inDrive / Bolt",
    duration: "Harare $1–$2 a trip",
    detail: "Bulawayo $0.50–$1",
    transitTip:
      "Kombis carry most commuters; ZUPCO service is limited. For door-to-door trips use inDrive (you bid a fare) or Bolt (the app sets the fare). Harare kombi fares reach $3 at peak.",
    fareEstimate: "$1–$2 kombi in Harare · $0.50–$1 in Bulawayo and Mutare · Harare taxis from about $4 plus $2/km (Numbeo)",
  },
];

function SourcesNote({
  note,
  sources,
}: {
  note?: string;
  sources: { label: string; url: string }[];
}) {
  return (
    <p className="mt-5 border-t border-[#2b302b] pt-3 text-[11px] leading-relaxed text-[#a4aaa2]">
      Figures checked {CHECKED}. {note ? `${note} ` : ""}Sources:{" "}
      {sources.map((src, i) => (
        <span key={src.url}>
          {i > 0 ? " · " : ""}
          <a
            href={src.url}
            target="_blank"
            rel="noreferrer"
            className="underline underline-offset-2 hover:text-[#e9e5db]"
          >
            {src.label}
          </a>
        </span>
      ))}
    </p>
  );
}

function formatUsd(n: number): string {
  return "$" + Math.round(n).toLocaleString("en-US");
}

export default function ToolsPage() {
  const [presetIdx, setPresetIdx] = useState(1);
  const [monthlyRent, setMonthlyRent] = useState(CITY_RENT_PRESETS[1].defaultRent);
  const [depositMonths, setDepositMonths] = useState(CITY_RENT_PRESETS[1].depositMonths);
  const [adminPct, setAdminPct] = useState(CITY_RENT_PRESETS[1].adminPct);
  const [monthlyLevy, setMonthlyLevy] = useState(CITY_RENT_PRESETS[1].levy);

  const rentBreakdown = useMemo(() => {
    const deposit = monthlyRent * depositMonths;
    const adminFee = (monthlyRent * adminPct) / 100;
    const totalDayOne = monthlyRent + deposit + adminFee + monthlyLevy;
    const ongoingMonthly = monthlyRent + monthlyLevy;
    return { deposit, adminFee, totalDayOne, ongoingMonthly };
  }, [monthlyRent, depositMonths, adminPct, monthlyLevy]);

  const [regionSun, setRegionSun] = useState<"matabeleland" | "highveld" | "eastern">("highveld");
  const [acCount, setAcCount] = useState(0);
  const [fridges, setFridges] = useState(1);
  const [laptopsStarlink, setLaptopsStarlink] = useState(2);
  const [zesaHours, setZesaHours] = useState(22);

  const solarSizing = useMemo(() => {
    const peakWatts = acCount * 1100 + fridges * 200 + laptopsStarlink * 95 + 320;
    const backupHours = Math.max(4, 24 - zesaHours);
    const avgWatts = acCount * 650 + fridges * 110 + laptopsStarlink * 85 + 220;
    const neededKwh = (avgWatts * backupHours) / 1000;
    const recommendedKva = peakWatts <= 1800 ? 3 : peakWatts <= 3600 ? 5 : peakWatts <= 6500 ? 8 : 10;
    const batteryKwh = Math.ceil(neededKwh / 5) * 5;
    // Global Solar Atlas worst-month PV yield, kWh per kWp per day:
    // Bulawayo (Dec) 4.43, Harare (Jan) 4.11, Mutare (Dec) 4.46.
    const sunYieldFactor =
      regionSun === "matabeleland" ? 4.4 : regionSun === "highveld" ? 4.1 : 4.4;
    const panelsKw = Math.max(2, Math.ceil(neededKwh / sunYieldFactor));
    const estCostUsd = recommendedKva * 190 + batteryKwh * 290 + panelsKw * 210 + 350;
    return { peakWatts, backupHours, recommendedKva, batteryKwh, panelsKw, estCostUsd, sunYieldFactor };
  }, [acCount, fridges, laptopsStarlink, zesaHours, regionSun]);

  const [corridorIdx, setCorridorIdx] = useState(0);

  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <header className="flex flex-col justify-between gap-4 border-b border-[#2b302b] pb-8 sm:flex-row sm:items-end">
          <div>
            <p className="font-mono-tech text-xs uppercase tracking-widest text-[#ffd200]">
              ALL ABOUT ZIMBABWE · INTERACTIVE TOOLS
            </p>
            <h1 className="font-display mt-2 text-3xl font-bold tracking-tight text-[#e9e5db] sm:text-5xl">
              Zimbabwe survival calculators.
            </h1>
            <p className="mt-3 max-w-2xl text-sm text-[#a4aaa2]">
              Model Day-1 USD move-in rent across Harare, Bulawayo, Victoria Falls &amp; Mutare, size a quiet lithium solar rig for ZESA outages, and plan intercity air, highway or rail travel.
            </p>
          </div>
          <button
            onClick={() =>
              openFeedbackModal({
                topic: "Survival Tools / Calculators",
                category: "outdated-cost",
              })
            }
            className="inline-flex shrink-0 items-center gap-1.5 rounded border border-[#2b302b] bg-[#151815] px-3 py-2 text-xs font-medium text-[#dadcd7] hover:border-[#ffd200] hover:text-[#e9e5db]"
          >
            <Flag className="h-3.5 w-3.5 text-[#ffd200]" />
            Spot wrong pricing? Report it
          </button>
        </header>

        <div className="mt-10 space-y-12">
          <section
            id="rent-calc"
            className="rounded border border-[#2b302b] bg-[#151815] p-6 sm:p-8"
          >
            <div className="flex items-center gap-2.5">
              <Home className="h-5 w-5 text-[#ffd200]" />
              <h2 className="font-display text-2xl font-semibold text-[#e9e5db]">
                Zimbabwe True Rent &amp; Move-In Calculator (USD)
              </h2>
            </div>
            <p className="mt-1 text-xs text-[#a4aaa2]">
              Rent is paid monthly on a lease that normally runs 12 months. By law the most a landlord can ask upfront is one month&apos;s rent, a one-month refundable deposit, and a lease fee of up to {LEASE_FEE_CAP_PCT}% of the first month&apos;s rent; an estate/borehole levy may come on top.
            </p>

            <div className="mt-6 grid gap-8 lg:grid-cols-12">
              <div className="space-y-4 lg:col-span-7">
                <div>
                  <label className="font-mono-tech text-[11px] uppercase text-[#a4aaa2]">
                    City &amp; Suburb Preset
                  </label>
                  <select
                    value={presetIdx}
                    onChange={(e) => {
                      const i = Number(e.target.value);
                      setPresetIdx(i);
                      setMonthlyRent(CITY_RENT_PRESETS[i].defaultRent);
                      setMonthlyLevy(CITY_RENT_PRESETS[i].levy);
                      setDepositMonths(CITY_RENT_PRESETS[i].depositMonths);
                      setAdminPct(CITY_RENT_PRESETS[i].adminPct);
                    }}
                    className="mt-1.5 w-full rounded border border-[#2b302b] bg-[#0c0e0c] px-3 py-2.5 text-sm text-[#e9e5db] focus:border-[#ffd200] focus:outline-none"
                  >
                    {CITY_RENT_PRESETS.map((d, i) => (
                      <option key={d.name} value={i}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <div className="flex justify-between font-mono-tech text-xs">
                    <span className="text-[#a4aaa2]">Monthly Base Rent (USD)</span>
                    <span className="text-[#e9e5db]">{formatUsd(monthlyRent)} / mo</span>
                  </div>
                  <input
                    type="range"
                    min={150}
                    max={4000}
                    step={25}
                    value={monthlyRent}
                    onChange={(e) => setMonthlyRent(Number(e.target.value))}
                    className="mt-1.5 h-1.5 w-full accent-[#ffd200]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-mono-tech text-[11px] text-[#a4aaa2]">
                      Security Deposit ({depositMonths} mo)
                    </label>
                    <input
                      type="range"
                      min={0}
                      max={2}
                      step={0.5}
                      value={depositMonths}
                      onChange={(e) => setDepositMonths(Number(e.target.value))}
                      className="mt-1 h-1.5 w-full accent-[#ffd200]"
                    />
                  </div>
                  <div>
                    <label className="font-mono-tech text-[11px] text-[#a4aaa2]">
                      Lease Fee ({adminPct}%, legal cap {LEASE_FEE_CAP_PCT}%)
                    </label>
                    <input
                      type="range"
                      min={0}
                      max={25}
                      value={adminPct}
                      onChange={(e) => setAdminPct(Number(e.target.value))}
                      className="mt-1 h-1.5 w-full accent-[#ffd200]"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between font-mono-tech text-xs">
                    <span className="text-[#a4aaa2]">Monthly Complex / Borehole Levy</span>
                    <span className="text-[#e9e5db]">{formatUsd(monthlyLevy)} / mo</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={350}
                    step={5}
                    value={monthlyLevy}
                    onChange={(e) => setMonthlyLevy(Number(e.target.value))}
                    className="mt-1.5 h-1.5 w-full accent-[#4cb82a]"
                  />
                </div>
              </div>

              <div className="flex flex-col justify-between rounded border border-[#2b302b] bg-[#0c0e0c] p-5 lg:col-span-5">
                <div className="space-y-2.5 font-mono-tech text-xs">
                  <div className="flex justify-between text-[#a4aaa2]">
                    <span>First Month Rent</span>
                    <span>{formatUsd(monthlyRent)}</span>
                  </div>
                  <div className="flex justify-between text-[#a4aaa2]">
                    <span>Security Deposit ({depositMonths} mo)</span>
                    <span>{formatUsd(rentBreakdown.deposit)}</span>
                  </div>
                  <div className="flex justify-between text-[#a4aaa2]">
                    <span>Lease Fee ({adminPct}%)</span>
                    <span>{formatUsd(rentBreakdown.adminFee)}</span>
                  </div>
                  <div className="flex justify-between text-[#a4aaa2]">
                    <span>Monthly Borehole &amp; Rates Levy</span>
                    <span>{formatUsd(monthlyLevy)}</span>
                  </div>
                </div>

                <div className="mt-5 border-t border-[#2b302b] pt-4">
                  <div className="font-mono-tech text-[10px] uppercase tracking-wider text-[#a4aaa2]">
                    Total Day-1 Move-In Cash (USD)
                  </div>
                  <div className="font-display mt-1 text-3xl font-bold text-[#ffd200]">
                    {formatUsd(rentBreakdown.totalDayOne)}
                  </div>
                  <div className="mt-1 font-mono-tech text-xs text-[#4cb82a]">
                    Ongoing monthly burn: {formatUsd(rentBreakdown.ongoingMonthly)} / mo
                  </div>
                  {(adminPct > LEASE_FEE_CAP_PCT || depositMonths > 1) && (
                    <div className="mt-2 text-[11px] leading-relaxed text-[#ffd200]">
                      Above the legal maximum
                      {adminPct > LEASE_FEE_CAP_PCT ? ` (lease fee over ${LEASE_FEE_CAP_PCT}%)` : ""}
                      {depositMonths > 1 ? " (deposit over one month)" : ""}. Some agents still
                      ask for it.
                    </div>
                  )}
                </div>
              </div>
            </div>
            <SourcesNote
              note="Agents commonly quote a flat US$50–200 admin fee instead of a percentage. Bulawayo presets were set from 7–8 listings; the 15 Bulawayo rentals listed in November 2026 ran from $400 to $2,000 a month. The Victoria Falls and Masvingo presets are unsourced estimates: no long-term listings were found."
              sources={RENT_SOURCES}
            />
          </section>

          <section
            id="solar-calc"
            className="rounded border border-[#2b302b] bg-[#151815] p-6 sm:p-8"
          >
            <div className="flex items-center gap-2.5">
              <Zap className="h-5 w-5 text-[#4cb82a]" />
              <h2 className="font-display text-2xl font-semibold text-[#e9e5db]">
                ZESA &amp; Solar Inverter Sizing Calculator
              </h2>
            </div>
            <p className="mt-1 text-xs text-[#a4aaa2]">
              Size a quiet LiFePO4 lithium + hybrid solar system. The three regions differ by under 10% in the worst month, so the region changes the result only slightly. The default of 22 grid hours reflects 2026, when ZESA reported no scheduled load shedding; lower it to model a drought year. Sizing always keeps at least 4 hours of backup.
            </p>

            <div className="mt-6 grid gap-8 lg:grid-cols-12">
              <div className="space-y-4 lg:col-span-7">
                <div className="flex flex-wrap gap-2">
                  {(
                    [
                      { id: "matabeleland", label: "Bulawayo / Matabeleland" },
                      { id: "highveld", label: "Harare / Highveld" },
                      { id: "eastern", label: "Mutare / Eastern Highlands" },
                    ] as const
                  ).map((reg) => (
                    <button
                      key={reg.id}
                      onClick={() => setRegionSun(reg.id)}
                      className={`rounded border px-3 py-1.5 text-xs transition ${
                        regionSun === reg.id
                          ? "border-[#4cb82a] bg-[#4cb82a]/15 text-[#e9e5db]"
                          : "border-[#2b302b] bg-[#0c0e0c] text-[#a4aaa2] hover:text-[#e9e5db]"
                      }`}
                    >
                      {reg.label}
                    </button>
                  ))}
                </div>

                <div>
                  <div className="flex justify-between font-mono-tech text-xs">
                    <span className="text-[#a4aaa2]">Daily ZESA Grid Supply (hours)</span>
                    <span className="text-[#e9e5db]">{zesaHours} hrs/day</span>
                  </div>
                  <input
                    type="range"
                    min={2}
                    max={24}
                    value={zesaHours}
                    onChange={(e) => setZesaHours(Number(e.target.value))}
                    className="mt-1.5 h-1.5 w-full accent-[#4cb82a]"
                  />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="font-mono-tech text-[11px] text-[#a4aaa2]">
                      Inverter ACs ({acCount})
                    </label>
                    <input
                      type="range"
                      min={0}
                      max={4}
                      value={acCount}
                      onChange={(e) => setAcCount(Number(e.target.value))}
                      className="mt-1 h-1.5 w-full accent-[#ffd200]"
                    />
                  </div>
                  <div>
                    <label className="font-mono-tech text-[11px] text-[#a4aaa2]">
                      Fridges ({fridges})
                    </label>
                    <input
                      type="range"
                      min={0}
                      max={3}
                      value={fridges}
                      onChange={(e) => setFridges(Number(e.target.value))}
                      className="mt-1 h-1.5 w-full accent-[#ffd200]"
                    />
                  </div>
                  <div>
                    <label className="font-mono-tech text-[11px] text-[#a4aaa2]">
                      Starlink/Laptops ({laptopsStarlink})
                    </label>
                    <input
                      type="range"
                      min={1}
                      max={6}
                      value={laptopsStarlink}
                      onChange={(e) => setLaptopsStarlink(Number(e.target.value))}
                      className="mt-1 h-1.5 w-full accent-[#ffd200]"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 rounded border border-[#2b302b] bg-[#0c0e0c] p-5 font-mono-tech lg:col-span-5">
                <div>
                  <div className="text-[10px] text-[#a4aaa2]">HYBRID INVERTER</div>
                  <div className="font-display mt-1 text-2xl font-bold text-[#e9e5db]">
                    {solarSizing.recommendedKva} kVA
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-[#a4aaa2]">LIFEPO4 BATTERY</div>
                  <div className="font-display mt-1 text-2xl font-bold text-[#4cb82a]">
                    {solarSizing.batteryKwh} kWh
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-[#a4aaa2]">SOLAR ARRAY</div>
                  <div className="mt-1 text-sm text-[#e9e5db]">{solarSizing.panelsKw} kWp panels</div>
                </div>
                <div>
                  <div className="text-[10px] text-[#a4aaa2]">EST. BUDGET (USD)</div>
                  <div className="mt-1 text-sm text-[#ffd200]">
                    {formatUsd(solarSizing.estCostUsd)}
                  </div>
                </div>
                <div className="col-span-2 text-[10px] leading-relaxed text-[#a4aaa2]">
                  Covers {solarSizing.backupHours} h without grid at{" "}
                  {solarSizing.sunYieldFactor} kWh per kWp per day (worst-month yield).
                </div>
              </div>
            </div>
            <SourcesNote
              note="Budget is a rough estimate; installed prices in Harare were $1,000–$2,800 for 3 kVA and $2,500–$5,500 for 5 kVA in July 2026."
              sources={SOLAR_SOURCES}
            />
          </section>

          <section
            id="commute-calc"
            className="rounded border border-[#2b302b] bg-[#151815] p-6 sm:p-8"
          >
            <div className="flex items-center gap-2.5">
              <Bus className="h-5 w-5 text-[#ffd200]" />
              <h2 className="font-display text-2xl font-semibold text-[#e9e5db]">
                Zimbabwe Intercity &amp; Urban Transit Planner
              </h2>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {TRANSIT_CORRIDORS.map((c, idx) => (
                <button
                  key={c.route}
                  onClick={() => setCorridorIdx(idx)}
                  className={`rounded border p-4 text-left transition ${
                    corridorIdx === idx
                      ? "border-[#ffd200] bg-[#191411]"
                      : "border-[#2b302b] bg-[#0c0e0c] hover:border-white/25"
                  }`}
                >
                  <div className="text-sm font-semibold text-[#e9e5db]">{c.route}</div>
                  <div className="mt-2 flex gap-4 font-mono-tech text-[11px]">
                    <span className="text-[#ffd200]">{c.duration}</span>
                    <span className="text-[#4cb82a]">{c.detail}</span>
                  </div>
                </button>
              ))}
            </div>

            <div className="mt-4 rounded border border-[#2b302b] bg-[#0c0e0c] p-4">
              <div className="flex items-start gap-2.5 text-xs text-[#dadcd7]">
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-[#4cb82a]" />
                <div>
                  <div className="font-semibold text-[#e9e5db]">
                    {TRANSIT_CORRIDORS[corridorIdx].route}
                  </div>
                  <p className="mt-1 text-[#a4aaa2]">
                    {TRANSIT_CORRIDORS[corridorIdx].transitTip}
                  </p>
                  <div className="mt-2 font-mono-tech text-[11px] text-[#ffd200]">
                    Typical fare: {TRANSIT_CORRIDORS[corridorIdx].fareEstimate}
                  </div>
                </div>
              </div>
            </div>
            <SourcesNote
              note="Euro figures are Rome2rio estimates, not operator tariffs."
              sources={TRANSIT_SOURCES}
            />
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}
