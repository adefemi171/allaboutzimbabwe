/** Phones and tablets: scenes render at lower resolution and load less detail. */
export function isLiteDevice(): boolean {
  return window.matchMedia("(pointer: coarse), (max-width: 820px)").matches;
}
