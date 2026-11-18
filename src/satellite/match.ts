// Which pass took which picture.

import { labelFor, profileOf } from "./profile";
import type { GpRecord, MatchedPass, Pass, Scene } from "./types";

/** A scene is stamped a little before or well after the closest approach. */
const MATCH_BEFORE_MS = 10 * 60_000;
const MATCH_AFTER_MS = 60 * 60_000;

function sceneFitsPass(scene: Scene, pass: Pass): boolean {
  if (scene.noradId !== null) {
    if (scene.noradId !== pass.noradId) return false;
  } else {
    // A satellite we have no number for: go by its name.
    const plain = (name: string) => name.toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (!plain(pass.name).includes(plain(scene.platform))) return false;
  }
  const sceneMs = new Date(scene.datetime).getTime();
  const passMs = new Date(pass.time).getTime();
  return sceneMs >= passMs - MATCH_BEFORE_MS && sceneMs <= passMs + MATCH_AFTER_MS;
}

/** Attach scenes to the passes that took them, and label every pass. */
export function matchPasses(passes: Pass[], scenes: Scene[], records: GpRecord[]): MatchedPass[] {
  const byNorad = new Map(records.map((record) => [Number(record.NORAD_CAT_ID), record]));
  const used = new Set<string>();

  return passes.map((pass) => {
    const scene =
      scenes.find((candidate) => !used.has(candidate.id) && sceneFitsPass(candidate, pass)) ??
      null;
    if (scene) used.add(scene.id);
    const record = byNorad.get(pass.noradId);
    const label = record ? labelFor(profileOf(record), !!scene) : scene ? "watched" : pass.label;
    return { ...pass, label, scene };
  });
}
