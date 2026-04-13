import { useState } from 'react';
import type { RegistrationFormData } from '../types';
import { ConsentLegalModal } from '../ConsentLegalModal';
import { WizardStepShell } from '../WizardStepShell';
import { reg } from '../registrationStyles';

type Props = {
  form: RegistrationFormData;
  onChange: (p: Partial<RegistrationFormData>) => void;
  onSubmit: () => void;
  onBack: () => void;
  loading: boolean;
  stepError: string | null;
  submitError?: string | null;
};

type DocModal = 'rules' | 'privacy' | null;

function ConsentCheckIcon() {
  return (
    <svg width="55%" height="55%" viewBox="0 0 24 24" aria-hidden style={{ display: 'block' }}>
      <path
        fill="none"
        stroke="#ffffff"
        strokeWidth={2.4}
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M5 13l5 5L20 7"
      />
    </svg>
  );
}

/** Figma 691:2835 / 718:570 / 952:1341 — согласия + модалки «Ознакомиться». */
export function ConsentStep({
  form,
  onChange,
  onSubmit,
  onBack,
  loading,
  stepError,
  submitError,
}: Props) {
  const canSubmit = form.consentParticipation && form.consentPersonalData && !loading;
  const [docModal, setDocModal] = useState<DocModal>(null);

  const footer = (
    <div style={reg.ageFigmaButtonRow}>
      <button
        type="button"
        className="ar-reg-wizard-consent-submit"
        style={{
          ...reg.consentSubmitBtn,
          ...(canSubmit ? reg.consentSubmitBtnReady : reg.consentSubmitBtnDisabled),
        }}
        disabled={!canSubmit}
        onClick={onSubmit}
      >
        {loading ? 'Отправка…' : 'Принять участие'}
      </button>
    </div>
  );

  return (
    <WizardStepShell variant="tall" onBack={onBack} footer={footer} aria-label="Подтверждение согласий">
      <div style={reg.consentCenter}>
        <h2 style={reg.consentHeading}>
          <span style={reg.consentHeadingLine}>Подтверди согласие</span>
          <span style={reg.consentHeadingLine}>на участие в забеге</span>
        </h2>
        {stepError ? <p style={reg.error}>{stepError}</p> : null}
        {submitError ? <p style={reg.error}>{submitError}</p> : null}

        <div style={reg.consentCardsRow}>
          <div style={reg.consentCard}>
            <div style={reg.consentCardInner}>
              <label className="ar-reg-consent-check-label" style={reg.consentCheckLabel}>
                <input
                  type="checkbox"
                  style={reg.consentCheckInput}
                  checked={form.consentParticipation}
                  onChange={(e) => onChange({ consentParticipation: e.target.checked })}
                  aria-label="Согласие с правилами участия"
                />
                <span className="ar-reg-consent-check-frame" style={reg.consentCheckFrame}>
                  {form.consentParticipation ? (
                    <span style={reg.consentCheckMark}>
                      <ConsentCheckIcon />
                    </span>
                  ) : null}
                </span>
              </label>
              <div style={reg.consentCardTextCol}>
                <p style={reg.consentCardTitle}>Правила участия</p>
                <button
                  type="button"
                  className="ar-reg-wizard-consent-read"
                  style={reg.consentReadBtn}
                  onClick={() => setDocModal('rules')}
                >
                  Ознакомиться
                </button>
              </div>
            </div>
          </div>

          <div style={reg.consentCard}>
            <div style={reg.consentCardInner}>
              <label className="ar-reg-consent-check-label" style={reg.consentCheckLabel}>
                <input
                  type="checkbox"
                  style={reg.consentCheckInput}
                  checked={form.consentPersonalData}
                  onChange={(e) => onChange({ consentPersonalData: e.target.checked })}
                  aria-label="Согласие на обработку персональных данных"
                />
                <span className="ar-reg-consent-check-frame" style={reg.consentCheckFrame}>
                  {form.consentPersonalData ? (
                    <span style={reg.consentCheckMark}>
                      <ConsentCheckIcon />
                    </span>
                  ) : null}
                </span>
              </label>
              <div style={reg.consentCardTextCol}>
                <p style={reg.consentCardTitle}>Обработка перс. данных</p>
                <button
                  type="button"
                  className="ar-reg-wizard-consent-read"
                  style={reg.consentReadBtn}
                  onClick={() => setDocModal('privacy')}
                >
                  Ознакомиться
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <ConsentLegalModal
        open={docModal !== null}
        title={
          docModal === 'privacy'
            ? 'Политика обработки персональных данных'
            : 'Правила участия'
        }
        onClose={() => setDocModal(null)}
      />
    </WizardStepShell>
  );
}
