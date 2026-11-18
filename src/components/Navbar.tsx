"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Menu, X, Search } from "lucide-react";
import { SURVIVAL_GUIDES } from "@/data/guides";
import { ZIMBABWE_PROVINCES, cityMapHref } from "@/data/zimbabwe-provinces";
import { ZIMBABWE_PLACES, placeHref } from "@/data/zimbabwe-places";

const NAV_ITEMS = [
  { href: "/guides", label: "Guides" },
  { href: "/harare", label: "Map" },
  { href: "/satellite", label: "Satellite view" },
  { href: "/atlas", label: "Provinces" },
  { href: "/places", label: "Places" },
  { href: "/tools", label: "Tools" },
  { href: "/about", label: "About" },
];

const EXTRA_MOBILE = [
  { href: "/newsletter", label: "Newsletter" },
  { href: "/contact", label: "Contact" },
];

/** The Zimbabwe Bird on its pillar, as in the favicon. */
function BirdMark({ size = 32 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="16 6 36 56"
      aria-hidden="true"
      focusable="false"
      className="shrink-0"
    >
      <g fill="#ffd200">
        <path d="M28.5 34h3v13h-3zm4.5 0h3v13h-3z" />
        <circle cx="37" cy="13" r="5.5" />
        <path d="M41 10.5 49 14.5 41 16.5z" />
        <path d="M33 16c-7 3-10 12-8 21l5 4c6-3 10-11 9-19-.5-3-2-5.5-6-6z" />
        <path d="M25.5 34 18.5 46h5l6-6z" />
        <rect x="23" y="46" width="20" height="4" rx="1" />
        <path d="M26.5 50h13v6h-13z" />
        <rect x="22" y="56" width="22" height="3.5" rx="1" />
      </g>
      <path
        d="M36.5 21c0 7-3 13-7.5 17M26.5 53l2.2-2 2.2 2 2.1-2 2.2 2 2.1-2 2.2 2"
        fill="none"
        stroke="#0c0e0c"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

interface SearchResult {
  title: string;
  subtitle: string;
  kind: string;
  href: string;
}

function SearchResultItems({
  results,
  onPick,
  roomy = false,
}: {
  results: SearchResult[];
  onPick: (href: string) => void;
  /** Larger touch targets for the mobile menu. */
  roomy?: boolean;
}) {
  return results.map((res) => (
    <li key={`${res.kind}-${res.title}`}>
      <button
        type="button"
        onClick={() => onPick(res.href)}
        className={
          roomy
            ? "grid w-full grid-cols-[1fr_auto] gap-x-2 rounded px-3 py-3 text-left hover:bg-[#151815]"
            : "grid w-full grid-cols-[1fr_auto] items-baseline gap-x-3 rounded px-2.5 py-2 text-left transition hover:bg-[#e9e5db]/10"
        }
      >
        <span
          className={
            roomy
              ? "text-[0.95rem] font-semibold text-[#e9e5db]"
              : "truncate text-sm font-semibold text-[#e9e5db]"
          }
        >
          {res.title}
        </span>
        <span className="mono text-[10px] text-[#ffd200]">{res.kind}</span>
        <small className="col-span-2 truncate text-xs text-[#a4aaa2]">{res.subtitle}</small>
      </button>
    </li>
  ));
}

export function Navbar({
  transparent = false,
  solid = false,
}: {
  transparent?: boolean;
  solid?: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const mobileSearchRef = useRef<HTMLInputElement>(null);
  const searchBoxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (open) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [open]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === "/" &&
        document.activeElement?.tagName !== "INPUT" &&
        document.activeElement?.tagName !== "TEXTAREA"
      ) {
        e.preventDefault();
        if (window.matchMedia("(max-width: 767px)").matches) {
          setOpen(true);
          requestAnimationFrame(() => mobileSearchRef.current?.focus());
        } else {
          searchInputRef.current?.focus();
        }
      } else if (e.key === "Escape") {
        setSearchFocused(false);
        setOpen(false);
        searchInputRef.current?.blur();
      }
    };
    const onPointerDown = (e: MouseEvent) => {
      if (searchBoxRef.current && !searchBoxRef.current.contains(e.target as Node)) {
        setSearchFocused(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("mousedown", onPointerDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("mousedown", onPointerDown);
    };
  }, []);

  const searchResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const out: SearchResult[] = [];

    for (const g of SURVIVAL_GUIDES) {
      if (
        g.title.toLowerCase().includes(q) ||
        g.shortTitle.toLowerCase().includes(q) ||
        g.summary.toLowerCase().includes(q)
      ) {
        out.push({
          title: g.shortTitle,
          subtitle: g.summary,
          kind: "Guide",
          href: `/guides/${g.slug}`,
        });
      }
    }
    for (const pl of ZIMBABWE_PLACES) {
      if (
        pl.name.toLowerCase().includes(q) ||
        pl.shortName.toLowerCase().includes(q) ||
        pl.city.toLowerCase().includes(q) ||
        pl.province.toLowerCase().includes(q)
      ) {
        out.push({
          title: pl.name,
          subtitle: `${pl.city} · ${pl.province}`,
          kind: pl.has3DCampus ? "3D Place" : pl.category,
          href: placeHref(pl),
        });
      }
    }
    for (const pr of ZIMBABWE_PROVINCES) {
      if (
        pr.capital.toLowerCase().includes(q) ||
        pr.province.toLowerCase().includes(q) ||
        pr.region.toLowerCase().includes(q)
      ) {
        out.push({
          title: `${pr.capital} (${pr.province})`,
          subtitle: pr.tagline,
          kind: "Province 3D",
          href: cityMapHref(pr.slug),
        });
      }
    }
    return out.slice(0, 8);
  }, [query]);

  const isActive = (href: string) =>
    pathname === href ||
    (href === "/harare" && pathname.startsWith("/explore")) ||
    pathname.startsWith(href + "/");

  // `transparent` floats the header over the page; `solid` gives a floating header its opaque bar.
  const headerSurface =
    transparent && !solid
      ? "fixed inset-x-0 top-0 border-transparent bg-gradient-to-b from-[#0c0e0c]/90 to-transparent"
      : `${
          transparent ? "fixed inset-x-0" : "sticky"
        } top-0 border-b border-[#2b302b] bg-[#0c0e0c]/92 backdrop-blur-md`;

  const goResult = (href: string) => {
    setQuery("");
    setSearchFocused(false);
    setOpen(false);
    router.push(href);
  };

  const mobileMenu =
    open
      ? createPortal(
          <div
            className="fixed inset-0 z-[80] flex flex-col bg-[#0c0e0c] md:hidden"
            style={{
              paddingTop: "env(safe-area-inset-top)",
              paddingBottom: "env(safe-area-inset-bottom)",
            }}
            role="dialog"
            aria-modal="true"
            aria-label="Site menu"
          >
            <div className="flex h-16 shrink-0 items-center justify-between gap-3 border-b border-[#2b302b] px-4">
              <Link
                href="/"
                prefetch={false}
                aria-label="All About Zimbabwe, home"
                onClick={() => setOpen(false)}
                className="inline-flex items-center gap-2.5 text-[1.05rem] font-extrabold tracking-tight text-[#e9e5db]"
              >
                <BirdMark />
                Zimbabwe
              </Link>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close menu"
                className="inline-flex h-11 w-11 items-center justify-center rounded border border-[#2b302b] text-[#e9e5db]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="shrink-0 border-b border-[#2b302b] px-4 py-3">
              <label className="relative block">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#a4aaa2]" />
                <input
                  ref={mobileSearchRef}
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search guides and places"
                  aria-label="Search guides and places"
                  className="h-12 w-full rounded border border-[#2b302b] bg-[#151815] pl-10 pr-3 text-base text-[#e9e5db] placeholder-[#a4aaa2] focus:border-[#ffd200] focus:outline-none"
                />
              </label>
              {query.trim().length > 0 && (
                <ul className="mt-2 max-h-[32vh] space-y-0.5 overflow-y-auto">
                  {searchResults.length === 0 ? (
                    <li className="px-2 py-3 text-sm text-[#a4aaa2]">No matches.</li>
                  ) : (
                    <SearchResultItems results={searchResults} onPick={goResult} roomy />
                  )}
                </ul>
              )}
            </div>

            <nav aria-label="Mobile" className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
              {[...NAV_ITEMS, ...EXTRA_MOBILE].map((item) => {
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    prefetch={false}
                    onClick={() => setOpen(false)}
                    aria-current={active ? "page" : undefined}
                    className={`flex min-h-12 items-center rounded px-4 text-[1.05rem] font-semibold ${
                      active
                        ? "bg-[#151815] text-[#ffd200]"
                        : "text-[#e9e5db] active:bg-[#151815]"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>,
          document.body
        )
      : null;

  return (
    <>
      <header
        className={`z-40 h-16 w-full transition-colors duration-200 ${headerSurface}`}
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        <div aria-hidden="true" className="zw-stripe absolute inset-x-0 bottom-0 h-[5px]" />
        <div className="mx-auto flex h-16 w-[min(100%-2*clamp(1rem,3vw,2.5rem),96rem)] items-center gap-4 sm:gap-6">
          <Link
            href="/"
            prefetch={false}
            aria-label="All About Zimbabwe, home"
            className="inline-flex items-center gap-2.5 whitespace-nowrap text-[1.05rem] font-extrabold tracking-tight text-[#e9e5db] hover:text-white"
          >
            <BirdMark />
            <span>
              <span className="hidden sm:inline">All About </span>Zimbabwe
            </span>
          </Link>

          <nav
            aria-label="Main"
            className="ml-auto hidden items-center gap-5 md:flex lg:gap-7"
          >
            {NAV_ITEMS.map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  // Preloading every menu page would fetch the 3D maps' code on every visit.
                  prefetch={false}
                  aria-current={active ? "page" : undefined}
                  className={`border-b-2 py-1 text-[0.97rem] font-semibold whitespace-nowrap transition-colors ${
                    active
                      ? "border-[#ffd200] text-[#e9e5db]"
                      : "border-transparent text-[#e9e5db] hover:border-[#e9e5db]/40"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div ref={searchBoxRef} className="relative hidden w-60 md:block">
            <input
              ref={searchInputRef}
              type="search"
              value={query}
              onFocus={() => setSearchFocused(true)}
              onChange={(e) => {
                setQuery(e.target.value);
                setSearchFocused(true);
              }}
              placeholder="Search guides and places"
              aria-label="Search guides and places"
              className="h-9.5 w-full rounded border border-[#2b302b] bg-[#151815]/85 pl-8 pr-8 text-sm text-[#e9e5db] placeholder-[#a4aaa2] transition focus:border-transparent focus:outline-2 focus:outline-[#ffd200]"
              style={{
                backgroundImage:
                  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='none' stroke='%238a98a6' stroke-width='1.8'%3E%3Ccircle cx='7' cy='7' r='4.6'/%3E%3Cpath d='m10.6 10.6 3.4 3.4' stroke-linecap='round'/%3E%3C/svg%3E\")",
                backgroundRepeat: "no-repeat",
                backgroundPosition: "0.65rem 50%",
              }}
            />
            {!searchFocused && !query && (
              <span
                aria-hidden="true"
                className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 rounded border border-[#2b302b] px-1.5 font-mono-tech text-[11px] text-[#a4aaa2]"
              >
                /
              </span>
            )}

            {searchFocused && query.trim().length > 0 && (
              <div className="absolute right-0 top-[calc(100%+0.4rem)] z-50 w-80 rounded border border-[#2b302b] bg-[#151815] p-1.5 shadow-2xl">
                {searchResults.length === 0 ? (
                  <p className="p-2.5 text-xs text-[#a4aaa2]">
                    No guides or places matching &ldquo;{query}&rdquo;.
                  </p>
                ) : (
                  <ul className="space-y-0.5">
                    <SearchResultItems results={searchResults} onPick={goResult} />
                  </ul>
                )}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            className="ml-auto inline-flex h-11 w-11 items-center justify-center rounded border border-[#2b302b] text-[#e9e5db] md:hidden"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </header>
      {mobileMenu}
    </>
  );
}
