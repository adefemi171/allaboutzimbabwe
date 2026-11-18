/// <reference lib="webworker" />
import { searchAll, type SearchWindow } from "./passes";
import type { GpRecord, Pass } from "./types";

export interface WorkerRequest {
  id: number;
  records: GpRecord[];
  lat: number;
  lon: number;
  window: SearchWindow;
}

export interface WorkerResponse {
  id: number;
  passes: Pass[];
  error?: string;
}

self.onmessage = (event: MessageEvent<WorkerRequest>) => {
  const { id, records, lat, lon, window } = event.data;
  try {
    const reply: WorkerResponse = { id, passes: searchAll(records, lat, lon, window) };
    self.postMessage(reply);
  } catch (error) {
    const reply: WorkerResponse = {
      id,
      passes: [],
      error: error instanceof Error ? error.message : String(error),
    };
    self.postMessage(reply);
  }
};
