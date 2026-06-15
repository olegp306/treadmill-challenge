import { useEffect, useState } from 'react';

function readKeyboardInsetFromCss(): number {
  const raw = getComputedStyle(document.documentElement).getPropertyValue('--keyboard-inset');
  const value = Number.parseFloat(raw);
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}

function readKeyboardInsetFromVisualViewport(): number {
  const vv = window.visualViewport;
  if (!vv) return 0;
  return Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
}

export function useKeyboardOpenWhileFocused(focused: boolean): boolean {
  const [keyboardOpen, setKeyboardOpen] = useState(false);

  useEffect(() => {
    if (!focused) {
      setKeyboardOpen(false);
      return;
    }

    const recompute = () => {
      const inset = Math.max(readKeyboardInsetFromCss(), readKeyboardInsetFromVisualViewport());
      setKeyboardOpen(inset > 80);
    };

    recompute();

    const vv = window.visualViewport;
    vv?.addEventListener('resize', recompute);
    vv?.addEventListener('scroll', recompute);
    window.addEventListener('resize', recompute, { passive: true });

    return () => {
      vv?.removeEventListener('resize', recompute);
      vv?.removeEventListener('scroll', recompute);
      window.removeEventListener('resize', recompute);
    };
  }, [focused]);

  return keyboardOpen;
}
