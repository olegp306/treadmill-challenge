import { Link } from 'react-router-dom';
import type { CSSProperties, ReactNode } from 'react';
import { h, w } from '../../arOzio/dimensions';
import { WIZARD_ASSETS } from './registrationWizardAssets';
import { reg } from './registrationStyles';
import { WizardCardBackdrop } from './WizardCardBackdrop';
import { LogoMark } from '../../ui/components/LogoMark';
import { Sheet } from '../../ui/components/Sheet';

type Props = {
  onBack: () => void;
  /** Figma: tall card (age, gender, consent) vs shorter form card (name, phone). */
  variant: 'tall' | 'short';
  children: ReactNode;
  footer?: ReactNode;
  'aria-label'?: string;
};

export function WizardStepShell({ onBack, variant, children, footer, ...rest }: Props) {
  const mainStyle: CSSProperties = {
    ...reg.ageFigmaMain,
    ...(variant === 'short'
      ? { flex: '0 1 auto', minHeight: h(1334), alignSelf: 'stretch' }
      : { flex: 1, minHeight: 0 }),
  };

  return (
    <div style={reg.ageFigmaRoot} {...rest}>
      <Sheet style={{ ...mainStyle, border: 'none' }}>
        <WizardCardBackdrop />
        <div style={reg.ageFigmaStack}>
          <header style={reg.ageFigmaHeader}>
            <button
              type="button"
              className="ar-reg-wizard-pill-btn"
              style={reg.ageFigmaPill}
              onClick={onBack}
            >
              <img
                src={WIZARD_ASSETS.arrowLeft}
                alt=""
                className="ar-reg-wizard-back-arrow"
                style={{ width: w(24), height: w(24) }}
              />
              Назад
            </button>
            <LogoMark aria-label="AMAZING RED" style={reg.ageFigmaLogo} />
            <Link to="/" className="ar-reg-wizard-pill-link" style={reg.ageFigmaPillLink}>
              Выйти
            </Link>
          </header>
          <div
            style={{
              ...reg.wizardBody,
              ...(variant === 'short' ? reg.wizardBodyShort : {}),
            }}
          >
            {children}
          </div>
        </div>
      </Sheet>
      {footer}
    </div>
  );
}
