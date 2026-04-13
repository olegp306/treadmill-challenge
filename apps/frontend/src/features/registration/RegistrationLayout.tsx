import { Link } from 'react-router-dom';
import { ArOzioViewport } from '../../arOzio/ArOzioViewport';
import { h } from '../../arOzio/dimensions';
import { reg } from './registrationStyles';
import type { ReactNode } from 'react';

type Props = {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  onBack?: () => void;
  showBack?: boolean;
  /** intro: header + optional title; wizard: full-bleed #000003, steps use WizardStepShell. */
  chrome?: 'intro' | 'wizard';
};

export function RegistrationLayout({
  children,
  title,
  subtitle,
  onBack,
  showBack,
  chrome = 'intro',
}: Props) {
  const pageStyle =
    chrome === 'wizard'
      ? { ...reg.page, backgroundColor: '#000003' as const, gap: h(12) }
      : reg.page;

  return (
    <ArOzioViewport>
      <div style={pageStyle}>
        {chrome === 'intro' ? (
          <>
            <header style={reg.header}>
              {showBack && onBack ? (
                <button type="button" style={reg.back} onClick={onBack}>
                  ← Назад
                </button>
              ) : (
                <Link to="/" style={{ ...reg.back, display: 'inline-block' }}>
                  ← Назад
                </Link>
              )}
              <p style={reg.logoMark} aria-label="AMAZING RED">
                <span style={reg.logoAmazing}>AMAZING</span>
                <span style={reg.logoRed}>RED</span>
              </p>
              <div style={reg.headerSpacer} aria-hidden />
            </header>

            {title ? <h1 style={reg.title}>{title}</h1> : null}
            {subtitle ? <p style={reg.subtitle}>{subtitle}</p> : null}
          </>
        ) : null}

        {children}
      </div>
    </ArOzioViewport>
  );
}
