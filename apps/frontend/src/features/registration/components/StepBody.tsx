import type { ReactNode } from 'react';
import { reg } from '../registrationStyles';

type Props = {
  children: ReactNode;
  /** `short` — name/phone-style vertical centering; `tall` — age/gender-style center column. */
  variant?: 'short' | 'tall';
  /** Disable inner scrolling for keyboard-sensitive short steps (iPad). */
  lockScroll?: boolean;
};

/** Shared vertical centering wrapper for wizard step content (Figma iPad). */
export function StepBody({ variant = 'short', lockScroll = false, children }: Props) {
  if (variant === 'tall') {
    return <div style={reg.stepBodyTall}>{children}</div>;
  }
  const noScrollStyle = lockScroll ? reg.stepBodyNoScroll : undefined;
  return (
    <div style={{ ...reg.stepBodyOuter, ...noScrollStyle }}>
      <div style={{ ...reg.stepBodyInner, ...noScrollStyle }}>{children}</div>
    </div>
  );
}
