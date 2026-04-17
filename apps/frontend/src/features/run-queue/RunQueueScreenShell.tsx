import type { ReactNode } from 'react';
import { h, w } from '../../arOzio/dimensions';
import { RegistrationLayout } from '../registration/RegistrationLayout';
import { rq } from './runQueueScreensStyles';
import { HeaderChrome } from '../../ui/components/HeaderChrome';
import { Sheet } from '../../ui/components/Sheet';
import { FooterActionsRow } from '../../ui/components/FooterActionsRow';

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
        <Sheet style={rq.sheet} overlay={<div style={rq.sheetGlow} aria-hidden />}>
          <HeaderChrome right={<p style={rq.namePill}>{participantDisplayName}</p>} style={rq.headerRow} logoStyle={rq.logoMark} />
          <div style={rq.centerWrap}>{children}</div>
        </Sheet>
        <FooterActionsRow style={{ ...rq.footerRow, marginTop: h(24) }} maxWidth={w(2120)}>
          {footer}
        </FooterActionsRow>
      </div>
    </RegistrationLayout>
  );
}
