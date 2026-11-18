import fs from "node:fs";
import path from "node:path";
import { HomeClient } from "@/components/home/HomeClient";

export default function HomePage() {
  // Read at build time from the world file's own meta, so it cannot drift from the map.
  const meta = JSON.parse(
    fs.readFileSync(path.join(process.cwd(), "public/data/harare-meta.json"), "utf8")
  );
  return <HomeClient harareBuildings={meta.stats.buildings} />;
}
