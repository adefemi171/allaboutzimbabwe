#!/usr/bin/env node
// Download the pictures of the Earth the satellite page wraps around its
// globe: NASA's Blue Marble by day and the Black Marble city lights by
// night. Both are public domain and come from NASA GIBS as one
// equirectangular image each, so the site serves them itself.

import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "public", "data");
const WMS =
  "https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi?SERVICE=WMS&REQUEST=GetMap" +
  "&VERSION=1.1.1&SRS=EPSG:4326&STYLES=&FORMAT=image/jpeg&BBOX=-180,-90,180,90";

const IMAGES = [
  { file: "earth-day.jpg", layer: "BlueMarble_ShadedRelief_Bathymetry", width: 4096 },
  // A quarter of the bytes, for phones.
  { file: "earth-day-2048.jpg", layer: "BlueMarble_ShadedRelief_Bathymetry", width: 2048 },
  { file: "earth-night.jpg", layer: "VIIRS_Black_Marble", width: 2048 },
];

for (const { file, layer, width } of IMAGES) {
  console.log(`Fetching ${layer}…`);
  const response = await fetch(`${WMS}&LAYERS=${layer}&WIDTH=${width}&HEIGHT=${width / 2}`);
  const type = response.headers.get("content-type") ?? "";
  if (!response.ok || !type.startsWith("image/jpeg")) {
    throw new Error(`${layer}: HTTP ${response.status} (${type})`);
  }
  const bytes = Buffer.from(await response.arrayBuffer());
  await mkdir(OUT, { recursive: true });
  await writeFile(join(OUT, file), bytes);
  console.log(`Wrote ${file} (${Math.round(bytes.length / 1024)} kB)`);
}
