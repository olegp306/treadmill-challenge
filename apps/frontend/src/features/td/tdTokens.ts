/** Fixed 2560×1120 TouchDesigner display — Figma-aligned colors (no w()/h() scaling). */
export const td = {
  bg: '#000003',
  card: '#161616',
  cardBorderTop: '#ff6477',
  red: '#e6233a',
  text: '#ffffff',
  /** Druk Wide Cyr: local @font-face weights 100–900 (`/assets/fonts/DrukWideCyr-*.woff2`). */
  fontDruk: '"Druk Wide Cyr", "Oswald", system-ui, sans-serif',
  /** Proxima Nova: declared @font-face for used weights (400/700), with Oswald fallback. */
  fontProxima: '"Proxima Nova", "Oswald", system-ui, sans-serif',
  designW: 2560,
  designH: 1120,
} as const;
