import type { ReactNode } from 'react';
import { reg } from '../registrationStyles';

type Props = {
  children: ReactNode;
  /** `short` — name/phone-style vertical centering; `tall` — age/gender-style center column. */
  variant?: 'short' | 'tall';
};

/** Shared vertical centering wrapper for wizard step content (Figma iPad). */
export function StepBody({ variant = 'short', children }: Props) {
  if (variant === 'tall') {
    return <div style={reg.stepBodyTall}>{children}</div>;
  }
  return (
    <div style={reg.stepBodyOuter}>
      <div style={reg.stepBodyInner}>{children}</div>
    </div>
  );
}
