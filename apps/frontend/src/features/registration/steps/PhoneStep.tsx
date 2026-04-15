import { useId, useMemo } from 'react';
import { useInput } from 'input-format/react-hook';
import type { RegistrationFormData } from '../types';
import { formatPhoneParsed, parsePhoneChar } from '../phoneFormat';
import { digitsOnly, validatePhoneForSubmit } from '../phoneValidation';
import { PrimaryButton, StepBody } from '../components';
import { WizardStepShell } from '../WizardStepShell';
import { reg } from '../registrationStyles';

type Props = {
  form: RegistrationFormData;
  onChange: (p: Partial<RegistrationFormData>) => void;
  onNext: () => void;
  onBack: () => void;
  stepError: string | null;
  fieldError: boolean;
};

/**
 * Phone step: `input-format` useInput (stable caret) + libphonenumber-js AsYouType formatting.
 * Stored value is digits only (no "+"); default after name step is "7" → display "+7".
 */
export function PhoneStep({ form, onChange: patchForm, onNext, onBack, stepError, fieldError }: Props) {
  const idPhone = useId();

  const digitsValue = useMemo(() => digitsOnly(form.phone), [form.phone]);
  const filled = useMemo(() => validatePhoneForSubmit(form.phone).ok, [form.phone]);

  const inputProps = useInput({
    value: digitsValue,
    onChange: (v) => patchForm({ phone: (v as string | undefined) ?? '' }),
    parse: parsePhoneChar,
    format: formatPhoneParsed,
    id: idPhone,
    type: 'tel' as const,
    inputMode: 'tel' as const,
    autoComplete: 'tel',
    autoCorrect: 'off',
    spellCheck: false,
    name: 'participantPhone',
    enterKeyHint: 'done' as const,
    'aria-label': 'Номер телефона',
    placeholder: '+7 999 999 9999',
  });

  return (
    <WizardStepShell variant="short" onBack={onBack} aria-label="Ввод номера телефона">
      <StepBody variant="short">
        <h2 style={{ ...reg.ageFigmaQuestion, ...reg.stepTitle }}>
          Введите свой номер телефона
        </h2>
        {stepError ? (
          <p style={{ ...reg.error, ...reg.stepErrorCentered }}>{stepError}</p>
        ) : null}

        <div style={reg.phoneFieldButtonRow}>
          <div
            style={{
              ...reg.phoneInputUnderlineWrap,
              ...(fieldError ? reg.wizardFieldUnderlineError : {}),
            }}
          >
            <input
              {...inputProps}
              style={{
                border: 'none',
                borderRadius: 0,
                backgroundColor: 'transparent',
                outline: 'none',
                boxShadow: 'none',
                WebkitAppearance: 'none' as const,
                appearance: 'none' as const,
                margin: 0,
                padding: 0,
                ...reg.phoneDigitsInput,
              }}
            />
          </div>

          <PrimaryButton
            variant="next"
            active={filled}
            disabled={!filled}
            style={reg.phoneNextBtn}
            onClick={onNext}
          >
            Далее
          </PrimaryButton>
        </div>
      </StepBody>
    </WizardStepShell>
  );
}
