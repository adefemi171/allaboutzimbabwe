import { preload } from "react-dom";

/** Where the 3D map of a province capital or campus keeps its world and its meta. */
export function worldFiles(slug: string): { meta: string; world: string } {
  return slug === "harare"
    ? { meta: "/data/harare-meta.json", world: "/data/harare-world.bin.gz" }
    : { meta: `/data/cities/${slug}-meta.json`, world: `/data/cities/${slug}.bin.gz` };
}

/**
 * Starts both downloads from the page's HTML, so they run while the map's
 * scripts load instead of after. The map's own fetches then take these.
 */
export function preloadWorld(slug: string): void {
  const files = worldFiles(slug);
  preload(files.meta, { as: "fetch", crossOrigin: "anonymous" });
  preload(files.world, { as: "fetch", crossOrigin: "anonymous" });
}
