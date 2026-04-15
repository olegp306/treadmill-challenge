/**
 * Focus an input in a way that reliably opens the software keyboard on iOS Safari / PWA.
 * Plain `focus()` after navigation often does not show the keyboard; a one-frame readOnly toggle is a common fix.
 */
export function focusInputForMobileKeyboard(input: HTMLInputElement | null): void {
  if (!input) return;

  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  const isIOS =
    /iPad|iPhone|iPod/i.test(ua) ||
    (typeof navigator !== 'undefined' &&
      navigator.platform === 'MacIntel' &&
      navigator.maxTouchPoints > 1);

  if (isIOS) {
    try {
      input.readOnly = true;
    } catch {
      /* ignore */
    }
  }

  input.focus({ preventScroll: true });

  if (isIOS) {
    requestAnimationFrame(() => {
      try {
        input.readOnly = false;
      } catch {
        /* ignore */
      }
    });
  }
}
