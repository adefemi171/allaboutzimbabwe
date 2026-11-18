/** Scroll framing for the home fly-in, matching All About Netherlands. */

export type StorySceneId = "globe" | "country" | "highveld" | "harare";

export const STORY_SCENES: { id: StorySceneId; label: string }[] = [
  { id: "globe", label: "Globe" },
  { id: "country", label: "Country" },
  { id: "highveld", label: "Highveld" },
  { id: "harare", label: "Harare" },
];

const SCENE_IDS = STORY_SCENES.map((scene) => scene.id);

export interface StoryFrame {
  /** Index of the section whose words are (or were) pinned. */
  index: number;
  /** 0..1 through the stretch where that scene's words stay pinned. */
  hold: number;
  /** 0..1 through the journey to the next scene (one screen of scroll). */
  travel: number;
  /** Ordinary page content has covered the map. */
  past: boolean;
}

interface CamPose {
  cam: [number, number, number];
  look: [number, number, number];
}

interface SceneCameras {
  wide: CamPose;
  narrow: CamPose;
}

/** Camera stops for each chapter of the fly-in. */
const SCENE_CAMERAS: Record<StorySceneId, SceneCameras> = {
  globe: {
    wide: { cam: [-0.45, 0.22, 4.25], look: [0.85, -0.02, 0] },
    narrow: { cam: [0.05, 0.55, 5.4], look: [0.4, -0.15, 0] },
  },
  country: {
    wide: { cam: [-0.15, 3.05, 3.55], look: [0.85, 0.25, 0] },
    narrow: { cam: [0.35, 3.9, 4.6], look: [0.85, 0.1, 0] },
  },
  highveld: {
    wide: { cam: [-1.35, 1.9, 3.5], look: [0.95, 0.4, 0] },
    narrow: { cam: [-0.4, 2.5, 4.3], look: [0.9, 0.2, 0] },
  },
  harare: {
    wide: { cam: [-0.7, 1.85, 3.15], look: [0.95, 0.35, 0] },
    narrow: { cam: [0.1, 2.35, 3.9], look: [0.9, 0.2, 0] },
  },
};

const clamp = (value: number, low = 0, high = 1) =>
  Math.min(high, Math.max(low, value));

const smooth = (a: number, b: number, x: number) => {
  const t = clamp((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

function mixPose(a: CamPose, b: CamPose, t: number): CamPose {
  // Distance on a log scale so the zoom feels even from orbit to street.
  const distA = Math.hypot(a.cam[0] - a.look[0], a.cam[1] - a.look[1], a.cam[2] - a.look[2]);
  const distB = Math.hypot(b.cam[0] - b.look[0], b.cam[1] - b.look[1], b.cam[2] - b.look[2]);
  const deep = Math.abs(Math.log(Math.max(0.01, distA / distB))) > 0.7;
  const dist = Math.exp(lerp(Math.log(Math.max(0.01, distA)), Math.log(Math.max(0.01, distB)), t));
  const k = deep ? (dist - distA) / (distB - distA || 1) : t;

  const look: [number, number, number] = [
    lerp(a.look[0], b.look[0], k),
    lerp(a.look[1], b.look[1], k),
    lerp(a.look[2], b.look[2], k),
  ];

  // Rebuild camera along the blended look→cam direction at the log-lerped distance.
  const dirA: [number, number, number] = [
    a.cam[0] - a.look[0],
    a.cam[1] - a.look[1],
    a.cam[2] - a.look[2],
  ];
  const dirB: [number, number, number] = [
    b.cam[0] - b.look[0],
    b.cam[1] - b.look[1],
    b.cam[2] - b.look[2],
  ];
  const dir: [number, number, number] = [
    lerp(dirA[0], dirB[0], t),
    lerp(dirA[1], dirB[1], t),
    lerp(dirA[2], dirB[2], t),
  ];
  const len = Math.hypot(dir[0], dir[1], dir[2]) || 1;
  const scale = dist / len;

  return {
    look,
    cam: [look[0] + dir[0] * scale, look[1] + dir[1] * scale, look[2] + dir[2] * scale],
  };
}

export function measureStoryFrame(
  sections: HTMLElement[],
  after: HTMLElement | null
): StoryFrame {
  const y = window.scrollY;
  const screen = window.innerHeight;
  const past = (after?.getBoundingClientRect().top ?? 9999) <= 0;

  for (let index = 0; index < sections.length; index++) {
    const top = sections[index].offsetTop;
    const height = sections[index].offsetHeight;
    const last = index === sections.length - 1;
    if (y < top + height || last) {
      const pinned = Math.max(0, height - screen);
      return {
        index,
        hold: pinned > 0 ? clamp((y - top) / pinned) : y >= top ? 1 : 0,
        travel: last ? 0 : clamp((y - top - pinned) / screen),
        past,
      };
    }
  }
  return { index: 0, hold: 0, travel: 0, past };
}

export function poseAtFrame(frame: StoryFrame, narrow: boolean): CamPose {
  const view = narrow ? "narrow" : "wide";
  const here = SCENE_CAMERAS[SCENE_IDS[frame.index] ?? "globe"][view];
  const nextId = SCENE_IDS[frame.index + 1];
  if (frame.travel <= 0 || !nextId) return here;
  return mixPose(here, SCENE_CAMERAS[nextId][view], smooth(0.04, 0.96, frame.travel));
}

/** The scene shown and ticked: flips halfway through the journey to the next. */
export function activeScene(frame: StoryFrame): StorySceneId {
  const index = frame.travel > 0.5 ? frame.index + 1 : frame.index;
  return SCENE_IDS[Math.min(index, SCENE_IDS.length - 1)];
}

/**
 * Elevation plane 0..1 during the highveld chapter.
 * Rises while the words are pinned; drains on the way to Harare.
 */
export function elevationFromFrame(frame: StoryFrame): number {
  if (SCENE_IDS[frame.index] !== "highveld") return 0;
  if (frame.travel > 0) {
    return lerp(1, 0, smooth(0, 0.7, frame.travel));
  }
  return lerp(0, 1, smooth(0.06, 0.86, frame.hold));
}
