import { defaultWindow, searchAll, type SearchWindow } from "./passes";
import type { WorkerRequest, WorkerResponse } from "./passes.worker";
import type { GpRecord, Pass } from "./types";

function workerCount(): number {
  const cores = typeof navigator !== "undefined" ? navigator.hardwareConcurrency || 2 : 2;
  const phone = typeof window !== "undefined" && window.matchMedia("(max-width: 720px)").matches;
  return phone ? Math.min(2, cores) : Math.min(4, Math.max(2, Math.floor(cores / 2)));
}

/**
 * Search the catalog for passes over a place.
 * Uses Web Workers when available; falls back to the main thread.
 */
export async function findPasses(
  records: GpRecord[],
  lat: number,
  lon: number,
  options?: {
    window?: SearchWindow;
    signal?: AbortSignal;
    onProgress?: (done: number, total: number) => void;
  },
): Promise<Pass[]> {
  const window = options?.window ?? defaultWindow();
  const signal = options?.signal;

  if (typeof Worker === "undefined") {
    return searchAll(records, lat, lon, window, options?.onProgress);
  }

  const n = workerCount();
  const chunkSize = Math.ceil(records.length / n) || 1;
  const chunks: GpRecord[][] = [];
  for (let i = 0; i < records.length; i += chunkSize) {
    chunks.push(records.slice(i, i + chunkSize));
  }

  let doneChunks = 0;
  const workers: Worker[] = [];
  const jobs = chunks.map(
    (chunk, index) =>
      new Promise<Pass[]>((resolve, reject) => {
        if (signal?.aborted) {
          reject(new DOMException("Aborted", "AbortError"));
          return;
        }
        const worker = new Worker(new URL("./passes.worker.ts", import.meta.url), {
          type: "module",
        });
        workers.push(worker);
        const onAbort = () => {
          worker.terminate();
          reject(new DOMException("Aborted", "AbortError"));
        };
        signal?.addEventListener("abort", onAbort, { once: true });

        worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
          signal?.removeEventListener("abort", onAbort);
          worker.terminate();
          doneChunks++;
          options?.onProgress?.(doneChunks, chunks.length);
          if (event.data.error) reject(new Error(event.data.error));
          else resolve(event.data.passes);
        };
        worker.onerror = (err) => {
          signal?.removeEventListener("abort", onAbort);
          worker.terminate();
          reject(err.error ?? new Error("Pass worker failed"));
        };

        const request: WorkerRequest = {
          id: index,
          records: chunk,
          lat,
          lon,
          window,
        };
        worker.postMessage(request);
      }),
  );

  try {
    const parts = await Promise.all(jobs);
    return parts.flat().sort((a, b) => a.time.localeCompare(b.time));
  } catch (error) {
    for (const worker of workers) worker.terminate();
    throw error;
  }
}
