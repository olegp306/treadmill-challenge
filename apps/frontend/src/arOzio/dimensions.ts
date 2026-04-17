/** Figma / device canvas — all `cqw`/`cqh` scale from this frame. */
export const CANVAS_W = 2360;
export const CANVAS_H = 1640;

/**
 * iOS Safari support note:
 * - Many devices/browsers don't support container query units (`cqw`/`cqh`).
 * - We therefore route all sizing through CSS variables, which are set on the
 *   `.ar-ozio-ipad-canvas` element by `ArOzioViewport`.
 * - On modern browsers: `--ar-cqw: 1cqw`, `--ar-cqh: 1cqh`
 * - On fallback: `--ar-cqw/--ar-cqh` are set in pixels.
 */
export function w(px: number): string {
  const k = (px / CANVAS_W) * 100;
  return `calc(${k} * var(--ar-cqw, 1cqw))`;
}

export function h(px: number): string {
  const k = (px / CANVAS_H) * 100;
  return `calc(${k} * var(--ar-cqh, 1cqh))`;
}
