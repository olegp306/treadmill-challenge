/**
 * Focus an input in a way that reliably opens the software keyboard on iOS Safari / PWA.
 * Plain `focus()` after navigation often does not show the keyboard; a one-frame readOnly toggle is a common fix.
 */
export type FocusInputForMobileKeyboardOptions = {
  /**
   * When true (phone step only), re-apply telephone keyboard hints after the iOS `readOnly` focus trick.
   * Safari/iPad can otherwise keep a full keyboard until the field is blurred and refocused.
   */
  telephoneKeyboard?: boolean;
};

/**
 * Focus an input in a way that reliably opens the software keyboard on iOS Safari / PWA.
 * Plain `focus()` after navigation often does not show the keyboard; a one-frame readOnly toggle is a common fix.
 */
export function focusInputForMobileKeyboard(
  input: HTMLInputElement | null,
  options?: FocusInputForMobileKeyboardOptions
): void {
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
      if (options?.telephoneKeyboard) {
        requestAnimationFrame(() => {
          try {
            input.setAttribute('type', 'tel');
            input.setAttribute('inputmode', 'tel');
            input.setAttribute('autocomplete', 'tel');
            input.setAttribute('enterkeyhint', 'done');
          } catch {
            /* ignore */
          }
        });
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

  const run = () => focusInputForMobileKeyboard(input, { telephoneKeyboard: true });

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
