import type { CSSProperties } from 'react';
import { h, w } from '../arOzio/dimensions';

/**
 * Minimal token layer for kiosk/public UI.
 * Keep existing responsive approach (w()/h()).
 */
export const ui = {
  color: {
    bg: '#000003',
    panel: '#080809',
    panelBorder: '#1e1e1e',
    text: '#ffffff',
    textMuted: 'rgba(255,255,255,0.76)',
    red: '#e6233a',
  },
  radius: {
    r20: w(20),
    r28: w(28),
    r36: w(36),
    r48: w(48),
    r70: w(70),
    r80: w(80),
  },
  space: {
    s8: w(8),
    s12: w(12),
    s16: w(16),
    s20: w(20),
    s24: w(24),
    s32: w(32),
    s40: w(40),
    s50: w(50),
    s56: w(56),
    s68: w(68),
  },
  /** Typography roles (only a few, expand carefully). */
  type: {
    logoMark: {
      margin: 0,
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'baseline',
      gap: '0.28em',
      fontSize: w(37),
      lineHeight: 1,
      letterSpacing: '0.02em',
      textTransform: 'uppercase',
      fontWeight: 400,
    } satisfies CSSProperties,
    title82: {
      margin: 0,
      fontWeight: 400,
      fontSize: w(82),
      lineHeight: 1.12,
      textTransform: 'uppercase',
      color: '#fff',
      textAlign: 'center',
    } satisfies CSSProperties,
    subtitle40: {
      margin: `${h(20)} 0 0`,
      textAlign: 'center',
      fontSize: w(40),
      lineHeight: 1.5,
      fontWeight: 400,
      color: 'rgba(255,255,255,0.6)',
      textTransform: 'uppercase',
    } satisfies CSSProperties,
  },
} as const;

