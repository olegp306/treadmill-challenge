import { Link } from 'react-router-dom';
import type { ReactNode } from 'react';
import { WizardCardBackdrop } from '../registration/WizardCardBackdrop';
import { reg } from '../registration/registrationStyles';
import { rs } from './runSelectionStyles';

type Props = {
  children: ReactNode;
  footer?: ReactNode;
};

export function RunSelectionShell({ children, footer }: Props) {
  return (
    <div style={rs.heroRoot}>
      <div style={rs.heroMain}>
        <WizardCardBackdrop />
        <div style={rs.heroStack}>
          <header style={rs.heroHeader}>
            <p style={{ ...reg.ageFigmaLogo, margin: 0, justifySelf: 'start' }} aria-label="AMAZING RED">
              <span style={reg.logoAmazing}>AMAZING</span>
              <span style={reg.logoRed}>RED</span>
            </p>
            <Link to="/" className="ar-reg-wizard-pill-link" style={reg.ageFigmaPillLink}>
              Выйти
            </Link>
          </header>
          <div style={rs.heroBody}>{children}</div>
        </div>
      </div>
      {footer ?? null}
    </div>
  );
}
