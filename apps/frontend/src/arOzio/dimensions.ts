/** Figma / device canvas — all `cqw`/`cqh` scale from this frame. */
export const CANVAS_W = 2360;
export const CANVAS_H = 1640;

export function w(px: number): string {
  return `${(px / CANVAS_W) * 100}cqw`;
}

export function h(px: number): string {
  return `${(px / CANVAS_H) * 100}cqh`;
}
