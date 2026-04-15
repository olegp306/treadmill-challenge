import type { CSSProperties } from 'react';
import { h, w } from './dimensions';

/** Figma: top 153px, left/right 120px, bottom 152–153px (use 153). */
export const screenEdgePadding: CSSProperties = {
  paddingTop: h(153),
  paddingLeft: w(120),
  paddingRight: w(120),
  paddingBottom: h(153),
  boxSizing: 'border-box',
};

/** Default outer wrapper for iPad canvas screens (matches Figma safe area). */
export const screenContainerBase: CSSProperties = {
  width: '100%',
  height: '100%',
  flex: 1,
  minHeight: 0,
  display: 'flex',
  flexDirection: 'column',
  ...screenEdgePadding,
};
