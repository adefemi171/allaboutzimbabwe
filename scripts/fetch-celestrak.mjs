#!/usr/bin/env node
// Refresh the bundled orbit catalogs from Celestrak GP JSON. The site reads
// live ones through /api/satellites and falls back to these files.
// Celestrak asks for roughly 2 hours between downloads of the same file.

import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "public", "data");
const BASE = "https://celestrak.org/NORAD/elements/gp.php";

/** Groups used for pass search (imaging, weather, crew). */
const SEARCH_GROUPS = ["resource", "weather", "stations"];
/** Broader set for globe dots. */
const GLOBE_GROUPS = ["resource", "weather", "stations", "science", "cubesat"];

async function fetchGroup(group) {
  const url = `${BASE}?GROUP=${encodeURIComponent(group)}&FORMAT=json`;
  const response = await fetch(url, {
    headers: { Accept: "application/json", "User-Agent": "AllAboutZimbabwe/1.0 (orbit catalog refresh)" },
  });
  if (!response.ok) throw new Error(`${group}: HTTP ${response.status}`);
  const data = await response.json();
  if (!Array.isArray(data)) throw new Error(`${group}: expected JSON array`);
  return data;
}

function dedupe(records) {
  const byId = new Map();
  for (const record of records) {
    const id = Number(record.NORAD_CAT_ID);
    if (!Number.isFinite(id)) continue;
    byId.set(id, record);
  }
  return [...byId.values()].sort((a, b) => a.NORAD_CAT_ID - b.NORAD_CAT_ID);
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const searchParts = [];
  for (const group of SEARCH_GROUPS) {
    console.log(`Fetching ${group}…`);
    searchParts.push(...(await fetchGroup(group)));
  }
  const search = dedupe(searchParts);
  const searchPath = join(OUT, "celestrak-search.json");
  await writeFile(
    searchPath,
    JSON.stringify({ fetchedAt: new Date().toISOString(), count: search.length, records: search }),
  );
  console.log(`Wrote ${search.length} search objects → ${searchPath}`);

  const globeParts = [];
  for (const group of GLOBE_GROUPS) {
    console.log(`Fetching ${group}…`);
    globeParts.push(...(await fetchGroup(group)));
  }
  const globe = dedupe(globeParts);
  const globePath = join(OUT, "celestrak-globe.json");
  await writeFile(
    globePath,
    JSON.stringify({ fetchedAt: new Date().toISOString(), count: globe.length, records: globe }),
  );
  console.log(`Wrote ${globe.length} globe objects → ${globePath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
