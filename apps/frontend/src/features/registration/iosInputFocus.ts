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

/**
 * Wizard step mounts + CSS/layout often finish after the first frame.
 * Retry focus a few times so iPad Safari actually opens the telephone keyboard without an extra tap.
 */
export function scheduleWizardStepPhoneFocus(input: HTMLInputElement | null): () => void {
  if (!input) return () => {};

  const timeouts: ReturnType<typeof setTimeout>[] = [];
  let raf1 = 0;
  let raf2 = 0;

  const run = () => focusInputForMobileKeyboard(input);

  run();

  raf1 = requestAnimationFrame(() => {
    raf2 = requestAnimationFrame(run);
  });

  for (const ms of [80, 220, 420]) {
    timeouts.push(setTimeout(run, ms));
  }

  return () => {
    cancelAnimationFrame(raf1);
    cancelAnimationFrame(raf2);
    timeouts.forEach((t) => clearTimeout(t));
  };
}
