import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

const UA = "AllAboutZimbabwe/1.0 (https://allaboutzimbabwe; map search)";
const MAX_LIMIT = 12;

interface ReverseHit {
  name?: string;
  address?: Record<string, string | undefined>;
}

/**
 * The name of a spot: "Samora Machel Avenue, Harare". Null outside Zimbabwe,
 * or where OpenStreetMap has nothing nearer than the country itself.
 */
async function reverse(lat: number, lon: number): Promise<string | null> {
  const params = new URLSearchParams({
    // Four decimals is some ten metres, and lets nearby presses share an answer.
    lat: lat.toFixed(4),
    lon: lon.toFixed(4),
    format: "jsonv2",
    addressdetails: "1",
    // Streets, not house numbers.
    zoom: "17",
    "accept-language": "en",
  });
  const upstream = await fetch(`https://nominatim.openstreetmap.org/reverse?${params}`, {
    headers: { Accept: "application/json", "User-Agent": UA },
    cache: "force-cache",
  });
  if (!upstream.ok) throw new Error(`Nominatim ${upstream.status}`);
  const hit = (await upstream.json()) as ReverseHit;
  const address = hit.address ?? {};
  if (address.country_code !== "zw") return null;
  const near =
    hit.name ||
    address.road ||
    address.neighbourhood ||
    address.suburb ||
    address.hamlet ||
    address.village;
  const town =
    address.city || address.town || address.village || address.municipality || address.county;
  const region = address.state_district || address.state;
  // "Patrice Lumumba Street, Harare" in town, "Chirumhanzu, Midlands Province" in the country.
  const parts = (near ? [near, town ?? region] : [town, region]).filter(
    (part): part is string => !!part,
  );
  return [...new Set(parts)].join(", ") || null;
}

/**
 * Thin Nominatim proxy so we can set a proper User-Agent and keep the
 * Zimbabwe restriction server-side. No SDK; one upstream request.
 *
 * `?q=` searches for a street, address or place. `?lat=&lon=` names a spot
 * instead, and answers `{ name }`, null where there is no name to give.
 */
export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams;

  if (query.has("lat") || query.has("lon")) {
    const lat = Number(query.get("lat"));
    const lon = Number(query.get("lon"));
    if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) {
      return NextResponse.json({ name: null }, { status: 400 });
    }
    try {
      return NextResponse.json({ name: await reverse(lat, lon) });
    } catch {
      return NextResponse.json({ name: null }, { status: 502 });
    }
  }

  const q = (query.get("q") || "").trim();
  if (q.length < 3 || q.length > 120) {
    return NextResponse.json({ results: [] });
  }

  const limit = Math.min(MAX_LIMIT, Math.max(1, Number(query.get("limit")) || 5));
  const params = new URLSearchParams({
    q,
    format: "json",
    addressdetails: "0",
    limit: String(limit),
    countrycodes: "zw",
  });
  const viewbox = query.get("viewbox");
  if (viewbox) {
    params.set("viewbox", viewbox);
    params.set("bounded", query.get("bounded") === "1" ? "1" : "0");
  }
  // Street centre lines, used to highlight a searched street on the map.
  if (query.get("geometry") === "1") {
    params.set("polygon_geojson", "1");
    params.set("polygon_threshold", "0.00005");
  }

  try {
    const upstream = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
      headers: { Accept: "application/json", "User-Agent": UA },
      cache: "force-cache",
    });
    if (!upstream.ok) {
      return NextResponse.json({ results: [] }, { status: 502 });
    }
    const results = await upstream.json();
    return NextResponse.json({ results: Array.isArray(results) ? results : [] });
  } catch {
    return NextResponse.json({ results: [] }, { status: 502 });
  }
}
