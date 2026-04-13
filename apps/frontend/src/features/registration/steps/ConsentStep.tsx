import type { RegistrationFormData } from '../types';
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

/** Figma 691:2835 — согласия + Принять участие. */
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
          Подтверди согласие
          <br />
          на участие в забеге
        </h2>
        {stepError ? <p style={reg.error}>{stepError}</p> : null}
        {submitError ? <p style={reg.error}>{submitError}</p> : null}

        <div style={reg.consentCardsRow}>
          <div style={reg.consentCard}>
            <div style={reg.consentCardInner}>
              <div style={reg.consentCheckWrap}>
                <input
                  type="checkbox"
                  style={reg.consentCheckInput}
                  checked={form.consentParticipation}
                  onChange={(e) => onChange({ consentParticipation: e.target.checked })}
                  aria-label="Согласие с правилами участия"
                />
                <div
                  style={{
                    ...reg.consentCheckBox,
                    ...(form.consentParticipation ? reg.consentCheckBoxOn : {}),
                  }}
                  aria-hidden
                />
              </div>
              <div style={reg.consentCardTextCol}>
                <p style={reg.consentCardTitle}>Правила участия</p>
                <button
                  type="button"
                  className="ar-reg-wizard-consent-read"
                  style={reg.consentReadBtn}
                  onClick={() => {
                    /* TODO: открыть PDF / модальное окно с правилами */
                  }}
                >
                  Ознакомиться
                </button>
              </div>
            </div>
          </div>

          <div style={reg.consentCard}>
            <div style={reg.consentCardInner}>
              <div style={reg.consentCheckWrap}>
                <input
                  type="checkbox"
                  style={reg.consentCheckInput}
                  checked={form.consentPersonalData}
                  onChange={(e) => onChange({ consentPersonalData: e.target.checked })}
                  aria-label="Согласие на обработку персональных данных"
                />
                <div
                  style={{
                    ...reg.consentCheckBox,
                    ...(form.consentPersonalData ? reg.consentCheckBoxOn : {}),
                  }}
                  aria-hidden
                />
              </div>
              <div style={reg.consentCardTextCol}>
                <p style={reg.consentCardTitle}>Обработка перс. данных</p>
                <button
                  type="button"
                  className="ar-reg-wizard-consent-read"
                  style={reg.consentReadBtn}
                  onClick={() => {
                    /* TODO: открыть политику конфиденциальности */
                  }}
                >
                  Ознакомиться
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </WizardStepShell>
  );
}
