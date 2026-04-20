/**
 * Tablet kiosk (iPad Safari / PWA). iPadOS 13+ may report desktop Safari (`Macintosh`) with touch.
 */
export function isIpadClient(): boolean {
  if (typeof navigator === 'undefined') return false;
  if (/iPad/i.test(navigator.userAgent)) return true;
  return navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
}
