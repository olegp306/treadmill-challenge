import type { ReactNode } from 'react';
import { h, w } from '../../arOzio/dimensions';
import { RegistrationLayout } from '../registration/RegistrationLayout';
import { rq } from './runQueueScreensStyles';

type Props = {
  participantDisplayName: string;
  children: ReactNode;
  footer: ReactNode;
};

/** Shared chrome for Figma queue / treadmill screens: dark sheet (logo + name) + footer buttons below. */
export function RunQueueScreenShell({ participantDisplayName, children, footer }: Props) {
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
        <div style={rq.sheet}>
          <div style={rq.sheetGlow} aria-hidden />
          <header style={rq.headerRow}>
            <p style={rq.logoMark} aria-label="AMAZING RED">
              <span style={rq.logoAmazing}>AMAZING</span>
              <span style={rq.logoRed}>RED</span>
            </p>
            <p style={rq.namePill}>{participantDisplayName}</p>
          </header>
          <div style={rq.centerWrap}>{children}</div>
        </div>
        <div
          style={{
            ...rq.footerRow,
            maxWidth: w(2120),
            marginLeft: 'auto',
            marginRight: 'auto',
            marginTop: h(24),
          }}
        >
          {footer}
        </div>
      </div>
    </RegistrationLayout>
  );
}
