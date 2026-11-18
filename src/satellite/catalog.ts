// The orbit catalogues. The site's own route (src/app/api/satellites) hands
// out Celestrak's current elements, at most two hours old. Should the route
// itself fail, the copies in public/data (scripts/fetch-celestrak.mjs) do.

import type { GpRecord } from "./types";

interface CatalogFile {
  fetchedAt?: string;
  count?: number;
  records: GpRecord[];
}

type CatalogSet = "search" | "globe";

async function loadJson(url: string, signal?: AbortSignal): Promise<CatalogFile> {
  const response = await fetch(url, { signal });
  if (!response.ok) throw new Error(`Could not load ${url} (${response.status})`);
  const data = (await response.json()) as CatalogFile;
  if (!Array.isArray(data.records) || !data.records.length) {
    throw new Error(`No orbits in ${url}`);
  }
  return data;
}

async function loadSet(set: CatalogSet, signal?: AbortSignal): Promise<CatalogFile> {
  try {
    return await loadJson(`/api/satellites?set=${set}`, signal);
  } catch (error) {
    if (signal?.aborted) throw error;
    return loadJson(`/data/celestrak-${set}.json`, signal);
  }
}

/** Imaging / weather / crew catalog for pass search. */
export async function loadSearchCatalog(signal?: AbortSignal): Promise<{
  fetchedAt: string | null;
  records: GpRecord[];
}> {
  const data = await loadSet("search", signal);
  return {
    fetchedAt: data.fetchedAt ?? null,
    records: data.records ?? [],
  };
}

/** Broader set for globe dots. */
export async function loadGlobeCatalog(signal?: AbortSignal): Promise<GpRecord[]> {
  try {
    const data = await loadSet("globe", signal);
    return data.records ?? [];
  } catch {
    const search = await loadSearchCatalog(signal);
    return search.records;
  }
}
