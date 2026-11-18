import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { gzipSync } from "node:zlib";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

/** Celestrak asks clients not to refetch a group more than once every two hours. */
const REVALIDATE_S = 7200;

const UA = "AllAboutZimbabwe/1.0 (satellite-view; contact via site)";

const HOSTS = ["https://celestrak.org", "https://www.celestrak.org"] as const;

/** The same groups as scripts/fetch-celestrak.mjs, which writes the fallback files. */
const SETS = {
  /** Imaging, weather and crewed: what the pass search runs over. */
  search: ["resource", "weather", "stations"],
  /** A wider set, for the dots on the globe. */
  globe: ["resource", "weather", "stations", "science", "cubesat"],
} as const;

type SetName = keyof typeof SETS;
type GpRecord = { NORAD_CAT_ID: number } & Record<string, unknown>;

interface Catalog {
  fetchedAt: string;
  count: number;
  records: GpRecord[];
}

async function fetchGroup(group: string): Promise<GpRecord[]> {
  let failure: unknown = null;
  for (const host of HOSTS) {
    try {
      const response = await fetch(
        `${host}/NORAD/elements/gp.php?GROUP=${encodeURIComponent(group)}&FORMAT=json`,
        {
          headers: { Accept: "application/json", "User-Agent": UA },
          next: { revalidate: REVALIDATE_S },
        },
      );
      if (!response.ok) throw new Error(`${host} ${group}: HTTP ${response.status}`);
      // When it has nothing new, Celestrak answers in plain text.
      const data: unknown = await response.json();
      if (!Array.isArray(data) || !data.length) throw new Error(`${host} ${group}: no records`);
      return data as GpRecord[];
    } catch (error) {
      failure = error;
    }
  }
  throw failure;
}

function dedupe(records: GpRecord[]): GpRecord[] {
  const byId = new Map<number, GpRecord>();
  for (const record of records) {
    const id = Number(record.NORAD_CAT_ID);
    if (Number.isFinite(id)) byId.set(id, record);
  }
  return [...byId.values()].sort((a, b) => Number(a.NORAD_CAT_ID) - Number(b.NORAD_CAT_ID));
}

/** The copy that ships with the site, as old as its last `npm run data:celestrak`. */
async function bundled(set: SetName): Promise<Catalog> {
  const file = join(process.cwd(), "public", "data", `celestrak-${set}.json`);
  return JSON.parse(await readFile(file, "utf8")) as Catalog;
}

/**
 * The catalogue as JSON, gzipped for browsers that take it: Next leaves route
 * answers uncompressed, and the globe set is 160 kB as text, about 30 kB packed.
 */
function json(request: NextRequest, body: unknown, headers: Record<string, string> = {}) {
  const text = JSON.stringify(body);
  const gzip = /\bgzip\b/.test(request.headers.get("accept-encoding") ?? "");
  return new NextResponse(gzip ? gzipSync(text) : text, {
    headers: {
      "Content-Type": "application/json",
      Vary: "Accept-Encoding",
      ...(gzip ? { "Content-Encoding": "gzip" } : {}),
      ...headers,
    },
  });
}

/** `?set=search` (the default) or `?set=globe`, in the shape of the bundled files. */
export async function GET(request: NextRequest) {
  const asked = request.nextUrl.searchParams.get("set") ?? "search";
  if (!Object.hasOwn(SETS, asked)) {
    return NextResponse.json({ error: "set must be search or globe" }, { status: 400 });
  }
  const set = asked as SetName;

  try {
    const groups = await Promise.all(SETS[set].map(fetchGroup));
    const records = dedupe(groups.flat());
    return json(
      request,
      {
        fetchedAt: new Date().toISOString(),
        source: "Celestrak GP",
        degraded: false,
        count: records.length,
        records,
      },
      // The elements change a few times a day: a visitor need not ask twice in ten minutes.
      { "Cache-Control": "public, max-age=600" },
    );
  } catch (error) {
    console.warn(`satellites ${set}: Celestrak unreachable, serving the bundled catalogue.`, error);
  }

  try {
    const catalog = await bundled(set);
    return json(request, {
      fetchedAt: catalog.fetchedAt,
      source: "bundled catalogue (Celestrak unreachable)",
      degraded: true,
      count: catalog.records.length,
      records: catalog.records,
    });
  } catch {
    return NextResponse.json({ error: "No orbit catalogue available" }, { status: 502 });
  }
}
