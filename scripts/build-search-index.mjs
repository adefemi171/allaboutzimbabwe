import fs from "node:fs";
import path from "node:path";
import {
  placesFromMeta,
  placesFromOsm,
  searchIndexPath,
  writeSearchIndex,
} from "./search-index.mjs";

const rawPath = path.join(process.cwd(), "data", "raw", "harare-osm-clean.json");
if (fs.existsSync(rawPath)) {
  const raw = JSON.parse(fs.readFileSync(rawPath, "utf8"));
  const places = placesFromOsm(raw);
  writeSearchIndex("harare", places);
  const streets = places.filter((p) => p.kind === "street").length;
  const buildings = places.filter((p) => p.kind === "building").length;
  const addresses = places.filter((p) => p.kind === "address").length;
  console.log(
    `harare: ${places.length} places (${streets} streets, ${buildings} buildings, ${addresses} addresses)`
  );
}

const citiesDir = path.join(process.cwd(), "public", "data", "cities");
if (fs.existsSync(citiesDir)) {
  for (const file of fs.readdirSync(citiesDir)) {
    if (!file.endsWith("-meta.json")) continue;
    const slug = file.replace(/-meta\.json$/, "");
    // The voxel build writes a fuller index from raw OSM (buildings, addresses, every
    // named street). The meta only has the main routes, so it is a fallback, not a refresh.
    if (fs.existsSync(searchIndexPath(slug))) {
      console.log(`${slug}: index exists, kept`);
      continue;
    }
    const meta = JSON.parse(fs.readFileSync(path.join(citiesDir, file), "utf8"));
    const places = placesFromMeta(meta);
    writeSearchIndex(slug, places);
    console.log(`${slug}: ${places.length} places from voxel meta`);
  }
}
