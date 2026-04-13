import { useState } from 'react';
import type { RegistrationFormData } from '../types';
import { ConsentLegalModal } from '../ConsentLegalModal';
import { ConsentCheckboxRow, PrimaryButton } from '../components';
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
      <PrimaryButton
        variant="cta"
        ready={canSubmit}
        disabled={!canSubmit}
        loading={loading}
        onClick={onSubmit}
      >
        Принять участие
      </PrimaryButton>
    </div>
  );

  return (
    <WizardStepShell variant="tall" onBack={onBack} footer={footer} aria-label="Подтверждение согласий">
      <div style={reg.consentCenter}>
        <h2 style={reg.consentHeading}>
          <span style={reg.consentHeadingLine}>Подтверди согласие</span>
          <span style={reg.consentHeadingLine}>на участие в забеге</span>
        </h2>
        {stepError || submitError ? (
          <div style={reg.consentErrorStack}>
            {stepError ? (
              <p style={{ ...reg.error, ...reg.stepErrorCentered, margin: 0 }}>{stepError}</p>
            ) : null}
            {submitError ? (
              <p style={{ ...reg.error, ...reg.stepErrorCentered, margin: 0 }}>{submitError}</p>
            ) : null}
          </div>
        ) : null}

        <div style={reg.consentCardsRow}>
          <ConsentCheckboxRow
            checked={form.consentParticipation}
            onChange={onChange}
            field="consentParticipation"
            title="Правила участия"
            checkAriaLabel="Согласие с правилами участия"
            cardVariant="rules"
            onRead={() => setDocModal('rules')}
          />
          <ConsentCheckboxRow
            checked={form.consentPersonalData}
            onChange={onChange}
            field="consentPersonalData"
            title="Обработка перс. данных"
            checkAriaLabel="Согласие на обработку персональных данных"
            cardVariant="privacy"
            onRead={() => setDocModal('privacy')}
          />
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
