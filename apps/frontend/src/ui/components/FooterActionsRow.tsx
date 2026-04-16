import type { CSSProperties, ReactNode } from 'react';
import { ui } from '../tokens';

type Props = {
  children: ReactNode;
  style?: CSSProperties;
  maxWidth?: CSSProperties['maxWidth'];
};

export function FooterActionsRow({ children, style, maxWidth }: Props) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'row',
        flexWrap: 'nowrap',
        gap: ui.space.s32,
        width: '100%',
        boxSizing: 'border-box',
        maxWidth: maxWidth ?? undefined,
        marginLeft: 'auto',
        marginRight: 'auto',
        ...style,
      }}
    >
      {children}
    </div>
  );
}

