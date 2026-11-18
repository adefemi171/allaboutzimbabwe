import fs from "node:fs";
import path from "node:path";

const DATA_ROOT = path.join(process.cwd(), "data");

function fileFor(name: string): string {
  return path.join(DATA_ROOT, `${name}.json`);
}

/** Reads `data/<name>.json` as a list; a missing or corrupt file is an empty list. */
export function readList<T>(name: string): T[] {
  try {
    const parsed = JSON.parse(fs.readFileSync(fileFor(name), "utf8"));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function writeList<T>(name: string, items: T[]): void {
  const file = fileFor(name);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(items, null, 2));
}

export function makeId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

export function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

/** A trimmed string field capped at `max` characters; anything else is "". */
export function textField(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

/** The request's JSON object body, or null when it is missing or not an object. */
export async function readJsonBody(req: Request): Promise<Record<string, unknown> | null> {
  try {
    const body: unknown = await req.json();
    return body && typeof body === "object" && !Array.isArray(body)
      ? (body as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}
