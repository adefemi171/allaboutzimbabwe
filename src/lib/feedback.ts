export const FEEDBACK_CATEGORIES = [
  { id: "wrong-info", label: "Inaccurate fact or guide step" },
  { id: "outdated-cost", label: "Outdated USD rent, fare, or price" },
  { id: "map-landmark", label: "3D map pin or building issue" },
  { id: "missing-province-info", label: "Missing province or city details" },
  { id: "bug", label: "Site bug / broken UI" },
  { id: "suggestion", label: "General suggestion" },
] as const;

export type FeedbackCategory = (typeof FEEDBACK_CATEGORIES)[number]["id"];

export const DEFAULT_FEEDBACK_TOPIC = "General / Nationwide";

export function isFeedbackCategory(value: unknown): value is FeedbackCategory {
  return FEEDBACK_CATEGORIES.some((c) => c.id === value);
}

export function feedbackCategoryLabel(id: string): string {
  return FEEDBACK_CATEGORIES.find((c) => c.id === id)?.label ?? id;
}
