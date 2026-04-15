import type { CSSProperties, ReactNode } from 'react';
import { screenContainerBase } from './screenLayout';

type Props = {
  children: ReactNode;
  style?: CSSProperties;
  className?: string;
};

/** Shared outer padding for all main AR Ozio screens (Figma). */
export function ScreenContainer({ children, style, className }: Props) {
  return (
    <div className={className} style={{ ...screenContainerBase, ...style }}>
      {children}
    </div>
  );
}
