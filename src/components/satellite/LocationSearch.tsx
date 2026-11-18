"use client";

import { useEffect, useState } from "react";
import { Search, X } from "lucide-react";
import { searchPlaces, type MapSearchPlace } from "@/lib/map-search";

const KIND_LABEL: Record<MapSearchPlace["kind"], string> = {
  street: "Street",
  address: "Address",
  building: "Building",
  place: "Place",
};

/** Type-ahead for any street, address or place in Zimbabwe. */
export function LocationSearch({ onPick }: { onPick: (place: MapSearchPlace) => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<MapSearchPlace[]>([]);
  const [searching, setSearching] = useState(false);
  const [active, setActive] = useState(0);

  const q = query.trim();
  const open = q.length >= 3;

  useEffect(() => {
    setResults([]);
    setActive(0);
    if (q.length < 3) {
      setSearching(false);
      return;
    }
    const controller = new AbortController();
    setSearching(true);
    const timer = window.setTimeout(() => {
      searchPlaces(q, { signal: controller.signal })
        .then((places) => {
          if (controller.signal.aborted) return;
          setResults(places);
          setSearching(false);
        })
        .catch(() => {
          if (!controller.signal.aborted) setSearching(false);
        });
    }, 350);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [q]);

  const pick = (place: MapSearchPlace) => {
    setQuery("");
    onPick(place);
  };

  return (
    <div className="relative w-full">
      <div className="flex h-[2.7rem] items-center rounded border border-[#2b302b] bg-[#0c0e0c]/70 px-3 focus-within:border-[#ffd200]">
        <Search className="mr-2 h-4 w-4 shrink-0 text-[#a4aaa2]" />
        <input
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls="watch-location-results"
          aria-label="Search a street, address or place in Zimbabwe"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setActive((i) => Math.min(results.length - 1, i + 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActive((i) => Math.max(0, i - 1));
            } else if (e.key === "Enter" && results[active]) {
              pick(results[active]);
            } else if (e.key === "Escape") {
              setQuery("");
            }
          }}
          placeholder="Find a street, an address, a place"
          className="w-full bg-transparent text-base text-[#e9e5db] placeholder-[#a4aaa2] focus:outline-none"
        />
        {query && (
          <button
            type="button"
            aria-label="Clear search"
            onClick={() => setQuery("")}
            className="text-[#a4aaa2] hover:text-[#e9e5db]"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {open && (
        <ul
          id="watch-location-results"
          role="listbox"
          className="absolute inset-x-0 top-full z-20 mt-1 overflow-hidden rounded border border-[#2b302b] bg-[#0c0e0c] shadow-2xl"
        >
          {results.length === 0 && (
            <li className="px-3 py-2.5 text-xs text-[#a4aaa2]">
              {searching ? "Searching OpenStreetMap…" : "No street, address or place found in Zimbabwe."}
            </li>
          )}
          {results.map((place, i) => (
            <li key={place.id} role="option" aria-selected={i === active}>
              <button
                type="button"
                onClick={() => pick(place)}
                onMouseEnter={() => setActive(i)}
                className={`flex w-full items-baseline justify-between gap-3 px-3 py-2 text-left ${
                  i === active ? "bg-[#151815]" : ""
                }`}
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-[#e9e5db]">
                    {place.name}
                  </span>
                  <span className="block truncate text-[11px] text-[#a4aaa2]">{place.detail}</span>
                </span>
                <span className="mono shrink-0 text-[10px] text-[#ffd200]">
                  {KIND_LABEL[place.kind]}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
