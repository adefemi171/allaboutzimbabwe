"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { ZimbabweGlobe } from "@/components/home/ZimbabweGlobe";
import {
  airportBadge,
  cityMapHref,
  DATA_CHECKED,
  ZIMBABWE_PROVINCES,
  type ZimbabweProvinceProfile,
} from "@/data/zimbabwe-provinces";
import { ALL_REGIONS, RegionChips } from "@/components/RegionChips";
import { getPlacesForProvince, placeHref } from "@/data/zimbabwe-places";
import { ArrowRight, Box, Plane, Zap, Wifi, Search, Bus, GraduationCap, Users } from "lucide-react";

export default function AtlasPage() {
  const [selectedProvince, setSelectedProvince] = useState<ZimbabweProvinceProfile>(
    () => ZIMBABWE_PROVINCES.find((p) => p.slug === "harare") || ZIMBABWE_PROVINCES[0]
  );
  const [regionFilter, setRegionFilter] = useState(ALL_REGIONS);
  const [search, setSearch] = useState("");

  const visibleProvinces = useMemo(() => {
    const q = search.trim().toLowerCase();
    return ZIMBABWE_PROVINCES.filter((p) => {
      const matchRegion = regionFilter === ALL_REGIONS || p.region === regionFilter;
      const matchQ =
        !q ||
        p.province.toLowerCase().includes(q) ||
        p.capital.toLowerCase().includes(q) ||
        p.tagline.toLowerCase().includes(q);
      return matchRegion && matchQ;
    });
  }, [regionFilter, search]);

  const provincePlaces = getPlacesForProvince(selectedProvince.slug);

  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="mb-10 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="font-mono-tech text-xs uppercase tracking-widest text-[#4cb82a]">
              ZIMBABWE NATIONAL ATLAS · ALL 10 PROVINCES
            </p>
            <h1 className="font-display mt-2 text-3xl font-bold tracking-tight text-[#e9e5db] sm:text-5xl">
              Every provincial capital in 3D voxels.
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-[#a4aaa2]">
              Explore Zimbabwe&apos;s 10 provinces—compare USD rents where listing data exists, solar yield, internet, and jump directly into each capital&apos;s real OpenStreetMap 3D voxel diorama.
            </p>
          </div>
          <Link
            href="/feedback"
            className="inline-flex shrink-0 items-center gap-2 rounded border border-[#2b302b] bg-[#151815] px-4 py-2.5 text-xs font-semibold text-[#e9e5db] hover:border-[#ffd200]"
          >
            Report Missing / Wrong Province Info
          </Link>
        </div>

        <div className="grid items-center gap-8 rounded border border-[#2b302b] bg-[#151815] p-6 lg:grid-cols-12">
          <div className="lg:col-span-6">
            <ZimbabweGlobe
              selectedProvince={selectedProvince}
              onSelectProvince={setSelectedProvince}
            />
          </div>
          <div className="lg:col-span-6">
            <span className="font-mono-tech text-[11px] uppercase tracking-wider text-[#ffd200]">
              {selectedProvince.region} · {selectedProvince.province}
            </span>
            <h2 className="font-display mt-1 text-3xl font-bold text-[#e9e5db]">
              {selectedProvince.capital}
            </h2>
            <p className="mt-2 text-sm text-[#a4aaa2]">{selectedProvince.tagline}</p>

            <div className="mt-5 grid grid-cols-2 gap-3 font-mono-tech text-xs">
              <div className="col-span-2 rounded border border-[#2b302b] bg-[#151815] p-3">
                <div className="flex items-center gap-1.5 text-[10px] text-[#a4aaa2]">
                  <Plane className="h-3.5 w-3.5 text-[#ffd200]" />
                  AIRPORT
                </div>
                <div className="mt-1 text-[#e9e5db]">
                  {selectedProvince.airport.code
                    ? `${airportBadge(selectedProvince.airport)} · ${selectedProvince.airport.name}`
                    : selectedProvince.airport.name}
                </div>
                <div className="mt-1 text-[11px] leading-relaxed text-[#a4aaa2]">
                  {selectedProvince.airport.note}
                </div>
              </div>
              <div className="rounded border border-[#2b302b] bg-[#151815] p-3">
                <div className="flex items-center gap-1.5 text-[10px] text-[#a4aaa2]">
                  <Users className="h-3.5 w-3.5 text-[#ffd200]" />
                  POPULATION
                </div>
                <div className="mt-1 text-[#e9e5db]">{selectedProvince.populationLabel}</div>
                {selectedProvince.capitalElevationM !== undefined && (
                  <div className="mt-1 text-[11px] text-[#a4aaa2]">
                    {selectedProvince.capital} elevation ~
                    {selectedProvince.capitalElevationM.toLocaleString("en-US")} m
                  </div>
                )}
              </div>
              <div className="rounded border border-[#2b302b] bg-[#151815] p-3">
                <div className="flex items-center gap-1.5 text-[10px] text-[#a4aaa2]">
                  <Zap className="h-3.5 w-3.5 text-[#ffd200]" />
                  POWER &amp; SOLAR
                </div>
                <div className="mt-1 text-[#e9e5db]">{selectedProvince.powerScore}</div>
              </div>
              <div className="rounded border border-[#2b302b] bg-[#151815] p-3">
                <div className="flex items-center gap-1.5 text-[10px] text-[#a4aaa2]">
                  <Wifi className="h-3.5 w-3.5 text-[#4cb82a]" />
                  INTERNET / FIBER
                </div>
                <div className="mt-1 text-[#e9e5db]">{selectedProvince.fiberStatus}</div>
              </div>
              <div className="rounded border border-[#2b302b] bg-[#151815] p-3">
                <div className="flex items-center gap-1.5 text-[10px] text-[#a4aaa2]">
                  <Bus className="h-3.5 w-3.5 text-[#38bdf8]" />
                  LOCAL TRANSIT
                </div>
                <div className="mt-1 text-[#e9e5db]">{selectedProvince.transitLabel}</div>
              </div>
            </div>

            <div className="mt-4 rounded border border-[#2b302b] bg-white/[0.02] p-3 font-mono-tech text-xs">
              <span className="text-[#a4aaa2]">USD Rent Benchmark: </span>
              <span className="text-[#ffd200]">{selectedProvince.rentMonthlyRange}</span>
              {selectedProvince.salePriceRange && (
                <div className="mt-1.5">
                  <span className="text-[#a4aaa2]">Houses for sale: </span>
                  <span className="text-[#ffd200]">{selectedProvince.salePriceRange}</span>
                </div>
              )}
            </div>

            <p className="mt-3 font-mono-tech text-[10px] leading-relaxed text-[#a4aaa2]">
              Sources (checked {DATA_CHECKED}):{" "}
              {selectedProvince.sources.map((s, i) => (
                <span key={s.url}>
                  {i > 0 && " · "}
                  <a
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#e9e5db] underline decoration-[#2b302b] underline-offset-2 hover:decoration-[#ffd200]"
                  >
                    {s.label}
                  </a>
                </span>
              ))}
            </p>

            {provincePlaces.length > 0 && (
              <div className="mt-4">
                <div className="mb-2 flex items-center gap-1.5 font-mono-tech text-[10px] uppercase tracking-wider text-[#b99cff]">
                  <GraduationCap className="h-3.5 w-3.5" />
                  Universities &amp; Key Landmarks in {selectedProvince.province}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {provincePlaces.map((pl) => (
                    <Link
                      key={pl.id}
                      href={placeHref(pl)}
                      className="rounded border border-[#2b302b] bg-white/[0.04] px-2.5 py-1 text-[11px] text-[#e9e5db] hover:border-[#b99cff] hover:text-[#e9e5db]"
                    >
                      {pl.shortName}
                      {pl.has3DCampus ? " · 3D" : ""}
                    </Link>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href={cityMapHref(selectedProvince.slug)}
                className="inline-flex items-center gap-1.5 rounded bg-[#2b7f07] px-4 py-2 text-xs font-semibold text-white hover:bg-[#236a05]"
              >
                <Box className="h-3.5 w-3.5" />
                Explore {selectedProvince.capital} in 3D Voxels
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
              <Link
                href="/guides"
                className="inline-flex items-center gap-1.5 rounded border border-[#2b302b] bg-[#151815] px-4 py-2 text-xs font-medium text-[#e9e5db] hover:bg-white/10"
              >
                Survival Guides
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-12 flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <h2 className="font-display text-2xl font-semibold text-[#e9e5db]">
              All 10 Provinces ({visibleProvinces.length})
            </h2>
            <p className="text-xs text-[#a4aaa2]">
              Every provincial capital includes a live 3D OpenStreetMap voxel map.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center rounded border border-[#2b302b] bg-[#151815] px-3 py-1.5">
              <Search className="mr-2 h-3.5 w-3.5 text-[#a4aaa2]" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Filter province or capital…"
                className="w-44 bg-transparent text-xs text-[#e9e5db] placeholder-[#a4aaa2] focus:outline-none"
              />
            </div>

            <RegionChips
              items={ZIMBABWE_PROVINCES}
              value={regionFilter}
              onChange={setRegionFilter}
            />
          </div>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visibleProvinces.map((pr) => {
            return (
              <div
                key={pr.slug}
                onClick={() => setSelectedProvince(pr)}
                className={`cursor-pointer rounded border p-5 transition ${
                  pr.slug === selectedProvince.slug
                    ? "border-[#ffd200] bg-[#171412]"
                    : "border-[#2b302b] bg-[#151815] hover:border-white/25"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span
                      className="font-mono-tech text-[10px] uppercase tracking-wider"
                      style={{ color: pr.accentColor }}
                    >
                      {pr.region}
                    </span>
                    <h3 className="font-display mt-0.5 text-lg font-semibold text-[#e9e5db]">
                      {pr.capital}
                    </h3>
                    <div className="text-xs text-[#a4aaa2]">{pr.province}</div>
                  </div>
                  <span
                    title={pr.airport.note}
                    className="shrink-0 rounded border border-[#2b302b] bg-[#151815] px-2 py-0.5 text-right font-mono-tech text-[10px] text-[#a4aaa2]"
                  >
                    {airportBadge(pr.airport)}
                  </span>
                </div>

                <p className="mt-2.5 line-clamp-2 text-xs leading-relaxed text-[#a4aaa2]">
                  {pr.tagline}
                </p>

                <div className="mt-4 flex items-center justify-between border-t border-[#2b302b] pt-3">
                  <span className="font-mono-tech text-[10px] text-[#4cb82a]">
                    {pr.rentMonthlyRange}
                  </span>
                  <Link
                    href={cityMapHref(pr.slug)}
                    onClick={(e) => e.stopPropagation()}
                    className="inline-flex items-center gap-1 rounded-md bg-white/10 px-2.5 py-1 font-mono-tech text-[10px] font-semibold text-[#e9e5db] transition hover:bg-[#2b7f07] hover:text-white"
                  >
                    <Box className="h-3 w-3" />
                    3D Voxels →
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </main>
      <Footer />
    </>
  );
}
