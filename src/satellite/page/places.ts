// The places the satellite page knows by name: the ten provincial capitals
// and the places of src/data/zimbabwe-places.ts. A link names one as
// "?place=bulawayo" or "?place=victoria-falls".

import { ZIMBABWE_PLACES } from "@/data/zimbabwe-places";
import { ZIMBABWE_PROVINCES, cityMapHref } from "@/data/zimbabwe-provinces";

export interface WatchPlace {
  /** The name a link uses: "mutare", "great-zimbabwe". */
  id: string;
  name: string;
  lat: number;
  lon: number;
}

/** Where a spot can be looked up by name: a box around Zimbabwe. */
const ZIMBABWE = { south: -22.5, north: -15.5, west: 25.2, east: 33.1 };

/** A 3D city map covers roughly this far (degrees) around its province capital. */
const CITY_MAP_REACH_DEG = 0.08;

const slug = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

const byName = new Map<string, WatchPlace>();

function add(place: WatchPlace, ...also: string[]): void {
  // The first to claim a name keeps it: capitals come before places.
  for (const name of [place.id, ...also.map(slug)]) {
    if (name && !byName.has(name)) byName.set(name, place);
  }
}

for (const province of ZIMBABWE_PROVINCES) {
  add(
    { id: slug(province.capital), name: province.capital, lat: province.lat, lon: province.lon },
    province.slug,
  );
}
for (const place of ZIMBABWE_PLACES) {
  add(
    {
      id: place.campusSlug ?? slug(place.shortName),
      name: place.shortName,
      lat: place.lat,
      lon: place.lon,
    },
    place.id,
    place.shortName,
    place.name,
  );
}

export function findPlace(name: string): WatchPlace | null {
  return byName.get(slug(name)) ?? null;
}

/** The places offered as buttons under the search box. */
export const QUICK_PICKS: WatchPlace[] = [
  "harare",
  "bulawayo",
  "mutare",
  "victoria-falls",
  "great-zimbabwe",
].flatMap((name) => findPlace(name) ?? []);

export function inZimbabwe({ lat, lon }: { lat: number; lon: number }): boolean {
  return (
    lat > ZIMBABWE.south && lat < ZIMBABWE.north && lon > ZIMBABWE.west && lon < ZIMBABWE.east
  );
}

/** The 3D city map a spot lies in, if it lies in one. */
export function cityMapFor({ lat, lon }: { lat: number; lon: number }): string | null {
  const province = ZIMBABWE_PROVINCES.find(
    (each) =>
      Math.abs(each.lat - lat) < CITY_MAP_REACH_DEG &&
      Math.abs(each.lon - lon) < CITY_MAP_REACH_DEG,
  );
  return province ? cityMapHref(province.slug) : null;
}
