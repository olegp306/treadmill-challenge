import type { ReactNode } from 'react';
import type { CSSProperties } from 'react';
import { h, w } from '../../arOzio/dimensions';
import { RegistrationLayout } from '../registration/RegistrationLayout';
import { rq } from './runQueueScreensStyles';
import { HeaderChrome } from '../../ui/components/HeaderChrome';
import { Sheet } from '../../ui/components/Sheet';
import { FooterActionsRow } from '../../ui/components/FooterActionsRow';

type Props = {
  participantDisplayName: string;
  /** Optional override for top-right name pill text. */
  headerRightLabel?: string;
  children: ReactNode;
  footer?: ReactNode;
  /** Center content against the whole sheet, not area below header. */
  centerAgainstSheet?: boolean;
  /** Optional sheet style override for screen-specific visual tuning. */
  sheetStyle?: CSSProperties;
  /** Optional overlay override for screen-specific glow/background. */
  overlay?: ReactNode;
  /** Optional tap/click handler on full sheet area. */
  onSheetClick?: () => void;
};

/** Shared chrome for Figma queue / treadmill screens: dark sheet (logo + name) + footer buttons below. */
export function RunQueueScreenShell({
  participantDisplayName,
  headerRightLabel,
  children,
  footer,
  centerAgainstSheet = false,
  sheetStyle,
  overlay,
  onSheetClick,
}: Props) {
  const centerStyle: CSSProperties = centerAgainstSheet
    ? {
        ...rq.centerWrap,
        position: 'absolute',
        inset: 0,
        minHeight: 0,
        zIndex: 1,
      }
    : rq.centerWrap;

  return (
    <RegistrationLayout chrome="wizard">
      <div
        style={{
          flex: 1,
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          maxWidth: '100%',
          paddingLeft: h(8),
          paddingRight: h(8),
          paddingBottom: h(16),
          boxSizing: 'border-box',
        }}
      >
        <div
          onClick={onSheetClick}
          style={{
            width: '100%',
            maxWidth: w(2120),
            marginLeft: 'auto',
            marginRight: 'auto',
            alignSelf: 'center',
            cursor: onSheetClick ? 'pointer' : 'default',
          }}
        >
          <Sheet
            style={{
              ...rq.sheet,
              ...(centerAgainstSheet ? ({ position: 'relative' } as CSSProperties) : {}),
              ...(sheetStyle ?? {}),
            }}
            overlay={overlay ?? <div style={rq.sheetGlow} aria-hidden />}
          >
            <HeaderChrome
              right={<p style={rq.namePill}>{headerRightLabel ?? participantDisplayName}</p>}
              style={rq.headerRow}
              logoStyle={rq.logoMark}
            />
            <div style={centerStyle}>{children}</div>
          </Sheet>
        </div>
        {footer ? (
          <FooterActionsRow style={{ ...rq.footerRow, marginTop: h(24) }} maxWidth={w(2120)}>
            {footer}
          </FooterActionsRow>
        ) : null}
      </div>
    </RegistrationLayout>
  );
}
