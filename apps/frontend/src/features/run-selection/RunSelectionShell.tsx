import { Link } from 'react-router-dom';
import type { ReactNode } from 'react';
import { WizardCardBackdrop } from '../registration/WizardCardBackdrop';
import { reg } from '../registration/registrationStyles';
import { rs } from './runSelectionStyles';
import { LogoMark } from '../../ui/components/LogoMark';
import { Sheet } from '../../ui/components/Sheet';

type Props = {
  children: ReactNode;
  footer?: ReactNode;
  /** Tighter body: no inner scroll on run-format picker. */
  runSelectBody?: boolean;
};

export function RunSelectionShell({ children, footer, runSelectBody }: Props) {
  const bodyStyle =
    runSelectBody === true ? { ...rs.heroBody, ...rs.heroBodyRunSelect } : rs.heroBody;
  const mainStyle =
    runSelectBody === true ? { ...rs.heroMain, ...rs.heroMainRunSelect } : rs.heroMain;

  return (
    <div style={runSelectBody === true ? { ...rs.heroRoot, ...rs.heroRootRunSelect } : rs.heroRoot}>
      <Sheet style={{ ...mainStyle, border: 'none' }}>
        <WizardCardBackdrop />
        <div style={rs.heroStack}>
          <header style={rs.heroHeader}>
            <LogoMark aria-label="AMAZING RED" style={{ ...reg.ageFigmaLogo, margin: 0, justifySelf: 'start' }} />
            <Link to="/" className="ar-reg-wizard-pill-link" style={reg.ageFigmaPillLink}>
              Выйти
            </Link>
          </header>
          <div style={bodyStyle}>{children}</div>
        </div>
      </Sheet>
      {footer ?? null}
    </div>
  );
}
