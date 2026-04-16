import type { CSSProperties } from 'react';
import { ui } from '../tokens';

type Props = {
  style?: CSSProperties;
  onAmazingClick?: () => void;
  onRedClick?: () => void;
  className?: string;
  'aria-label'?: string;
};

export function LogoMark({ style, onAmazingClick, onRedClick, className, ...rest }: Props) {
  return (
    <p className={className} style={{ ...ui.type.logoMark, ...style }} {...rest}>
      <span
        style={{
          color: ui.color.text,
          cursor: onAmazingClick ? 'pointer' : undefined,
          userSelect: 'none',
        }}
        onClick={onAmazingClick}
        role={onAmazingClick ? 'button' : undefined}
      >
        AMAZING
      </span>
      <span
        style={{
          color: ui.color.red,
          cursor: onRedClick ? 'pointer' : undefined,
          userSelect: 'none',
        }}
        onClick={onRedClick}
        role={onRedClick ? 'button' : undefined}
      >
        RED
      </span>
    </p>
  );
}

