import type { CSSProperties, ReactNode } from 'react';
import { ui } from '../tokens';

type Props = {
  children: ReactNode;
  style?: CSSProperties;
  className?: string;
  /** Optional overlay (e.g. glow) rendered inside the sheet. */
  overlay?: ReactNode;
};

export function Sheet({ children, style, className, overlay }: Props) {
  return (
    <div
      className={className}
      style={{
        position: 'relative',
        width: '100%',
        borderRadius: ui.radius.r70,
        background: ui.color.panel,
        border: `1px solid ${ui.color.panelBorder}`,
        boxSizing: 'border-box',
        overflow: 'hidden',
        ...style,
      }}
    >
      {overlay}
      {children}
    </div>
  );
}

