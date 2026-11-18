"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { ALL_REGIONS, RegionChips } from "@/components/RegionChips";
import { ZIMBABWE_PLACES, placeHref, type PlaceCategory } from "@/data/zimbabwe-places";
import { Search, GraduationCap, Mountain, Landmark, Box, MapPin } from "lucide-react";

const CATEGORIES: { id: "all" | PlaceCategory; label: string }[] = [
  { id: "all", label: "All Places" },
  { id: "university", label: "Universities" },
  { id: "nature", label: "Natural Wonders" },
  { id: "culture", label: "Heritage & Culture" },
  { id: "stadium", label: "Stadia" },
  { id: "market", label: "Markets" },
  { id: "transit", label: "Dams & Bridges" },
];

export default function PlacesDirectoryPage() {
  const [category, setCategory] = useState<"all" | PlaceCategory>("all");
  const [region, setRegion] = useState(ALL_REGIONS);
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return ZIMBABWE_PLACES.filter((p) => {
      const mCat = category === "all" || p.category === category;
      const mReg = region === ALL_REGIONS || p.region === region;
      const mQ =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.shortName.toLowerCase().includes(q) ||
        p.province.toLowerCase().includes(q) ||
        p.city.toLowerCase().includes(q) ||
        p.summary.toLowerCase().includes(q);
      return mCat && mReg && mQ;
    });
  }, [category, region, query]);

  const uniCount = ZIMBABWE_PLACES.filter((p) => p.category === "university").length;
  const world3dCount = ZIMBABWE_PLACES.filter((p) => p.has3DCampus).length;

  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <header className="border-b border-[#2b302b] pb-8">
          <p className="font-mono-tech text-xs uppercase tracking-widest text-[#b99cff]">
            ZIMBABWE PLACES · {uniCount} UNIVERSITIES &amp; ICONIC LANDMARKS ({world3dCount} IN 3D)
          </p>
          <h1 className="font-display mt-2 text-3xl font-bold tracking-tight text-[#e9e5db] sm:text-5xl">
            Universities, monuments &amp; natural wonders.
          </h1>
          <p className="mt-3 max-w-2xl text-sm text-[#a4aaa2]">
            Browse Zimbabwe&apos;s flagship universities alongside Victoria Falls, Great Zimbabwe, Matobo Hills, Hwange, Mana Pools, Lake Kariba, and Nyanga—with direct 3D OpenStreetMap voxel views.
          </p>

          <div className="mt-6 flex flex-col gap-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex max-w-md flex-1 items-center rounded border border-[#2b302b] bg-[#151815] px-3.5 py-2.5">
                <Search className="mr-2.5 h-4 w-4 text-[#a4aaa2]" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search UZ, NUST, Victoria Falls, Great Zimbabwe, Hwange…"
                  className="w-full bg-transparent text-sm text-[#e9e5db] placeholder-[#a4aaa2] focus:outline-none"
                />
              </div>

              <RegionChips items={ZIMBABWE_PLACES} value={region} onChange={setRegion} />
            </div>

            <div className="flex flex-wrap gap-1.5">
              {CATEGORIES.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setCategory(c.id)}
                  className={`rounded border px-3 py-1.5 text-xs font-medium transition ${
                    category === c.id
                      ? "border-[#b99cff] bg-[#b99cff]/20 text-[#e9e5db]"
                      : "border-[#2b302b] bg-white/[0.02] text-[#a4aaa2] hover:text-[#e9e5db]"
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>
        </header>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((place) => {
            const isUni = place.category === "university";
            return (
              <div
                key={place.id}
                className="flex flex-col justify-between rounded border border-[#2b302b] bg-[#151815] p-5 transition hover:border-white/25"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 font-mono-tech text-[10px] uppercase ${
                        isUni
                          ? "bg-[#b99cff]/20 text-[#e9d5ff]"
                          : "bg-[#ffd200]/15 text-[#ffd200]"
                      }`}
                    >
                      {isUni ? (
                        <GraduationCap className="h-3 w-3" />
                      ) : place.category === "nature" ? (
                        <Mountain className="h-3 w-3" />
                      ) : (
                        <Landmark className="h-3 w-3" />
                      )}
                      {place.category}
                    </span>
                    <span className="font-mono-tech text-[10px] text-[#a4aaa2]">
                      {place.foundedOrStat}
                    </span>
                  </div>

                  <h2 className="font-display mt-3 text-lg font-semibold text-[#e9e5db]">
                    {place.name}
                  </h2>
                  <div className="mt-0.5 flex items-center gap-1 text-xs text-[#a4aaa2]">
                    <MapPin className="h-3 w-3 text-[#ffd200]" />
                    <span>
                      {place.city} · {place.province}
                    </span>
                  </div>
                  <p className="mt-2.5 text-xs leading-relaxed text-[#a4aaa2]">
                    {place.summary}
                  </p>
                </div>

                <div className="mt-5 flex items-center justify-between border-t border-[#2b302b] pt-3">
                  <Link
                    href={`/guides/${place.guideSlug}`}
                    className="font-mono-tech text-[11px] text-[#a4aaa2] hover:text-[#e9e5db]"
                  >
                    Read guide →
                  </Link>
                  <Link
                    href={placeHref(place)}
                    className={`inline-flex items-center gap-1.5 rounded px-3 py-1.5 font-mono-tech text-[11px] font-semibold transition ${
                      place.has3DCampus
                        ? "bg-[#b99cff] text-[#0c0e0c] hover:bg-[#cdb8ff]"
                        : "bg-white/10 text-[#e9e5db] hover:bg-[#2b7f07] hover:text-white"
                    }`}
                  >
                    <Box className="h-3.5 w-3.5" />
                    {place.has3DCampus
                      ? "Open 3D World"
                      : `View ${place.province.replace(" Province", "")} 3D`}
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
