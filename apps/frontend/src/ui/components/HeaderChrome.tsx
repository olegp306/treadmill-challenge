import type { CSSProperties, ReactNode } from 'react';
import { ui } from '../tokens';
import { LogoMark } from './LogoMark';

type Props = {
  right?: ReactNode;
  style?: CSSProperties;
  logoStyle?: CSSProperties;
  onAmazingClick?: () => void;
  onRedClick?: () => void;
};

export function HeaderChrome({ right, style, logoStyle, onAmazingClick, onRedClick }: Props) {
  return (
    <header
      style={{
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: `${ui.space.s40} ${ui.space.s50}`,
        boxSizing: 'border-box',
        width: '100%',
        ...style,
      }}
    >
      <LogoMark aria-label="AMAZING RED" style={logoStyle} onAmazingClick={onAmazingClick} onRedClick={onRedClick} />
      {right ?? null}
    </header>
  );
}

