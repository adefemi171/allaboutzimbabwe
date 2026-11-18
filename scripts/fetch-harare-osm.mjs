import fs from "node:fs";
import path from "node:path";
import { classifyCityWays, collectElements, createTileFetcher } from "./lib/voxel-build.mjs";

// Covers CBD plus northern/eastern suburbs: Borrowdale, Mount Pleasant,
// Gletwyn, Shawasha Hills, Chisipite, Highlands, plus Mbare south & Mabelreign west.
const BBOX = {
  south: -17.886,
  west: 30.962,
  north: -17.772,
  east: 31.143,
};

const fetchTile = createTileFetcher({
  userAgent: "AllAboutZimbabwe-HarareVoxel/1.0 (https://allaboutzimbabwe.zw)",
  timeoutMs: 25000,
  rateLimitWaitMs: 12000,
  retryDelayMs: (attempt) => 1200 * (attempt + 1),
});

async function main() {
  const latStep = 0.0155;
  const lonStep = 0.0175;
  const tiles = [];

  for (let lat = BBOX.south; lat < BBOX.north - 1e-6; lat += latStep) {
    for (let lon = BBOX.west; lon < BBOX.east - 1e-6; lon += lonStep) {
      tiles.push({
        south: lat,
        west: lon,
        north: Math.min(lat + latStep, BBOX.north),
        east: Math.min(lon + lonStep, BBOX.east),
      });
    }
  }

  console.log(`Fetching ${tiles.length} real OSM tiles for Central Harare...`);
  const nodes = new Map();
  const ways = new Map();

  for (let i = 0; i < tiles.length; i += 3) {
    const batch = tiles.slice(i, i + 3);
    const results = await Promise.all(
      batch.map((t) => fetchTile(t.south, t.west, t.north, t.east))
    );
    for (const elements of results) collectElements(elements, nodes, ways);
    console.log(
      `  Batch ${Math.floor(i / 3) + 1}/${Math.ceil(tiles.length / 3)}: ${nodes.size} nodes, ${ways.size} ways`
    );
  }

  const { buildings, roads, parks, waters } = classifyCityWays(nodes, ways);

  const outDir = path.join(process.cwd(), "data", "raw");
  fs.mkdirSync(outDir, { recursive: true });
  const outFile = path.join(outDir, "harare-osm-clean.json");
  const payload = {
    bbox: BBOX,
    counts: {
      buildings: buildings.length,
      roads: roads.length,
      parks: parks.length,
      waters: waters.length,
    },
    buildings,
    roads,
    parks,
    waters,
  };
  fs.writeFileSync(outFile, JSON.stringify(payload));
  const stats = fs.statSync(outFile);
  console.log(
    `Done! Saved ${buildings.length} buildings, ${roads.length} roads, ${parks.length} parks, ${waters.length} waters (${(stats.size / 1024 / 1024).toFixed(2)} MB)`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
