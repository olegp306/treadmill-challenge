import { useId, useMemo } from 'react';
import type { RegistrationFormData } from '../types';
import { digitsOnly } from '../phoneValidation';
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

/** National 10 digits (9XXXXXXXXX); strips leading 7/8 country or trunk codes. */
function toNationalMobileDigits(raw: string): string {
  let d = digitsOnly(raw);
  if (d.startsWith('7')) d = d.slice(1);
  if (d.startsWith('8')) d = d.slice(1);
  return d.slice(0, 10);
}

/** Figma 691:2534 — phone row + «Далее» aligned; block vertically centered. */
export function PhoneStep({ form, onChange, onNext, onBack, stepError, fieldError }: Props) {
  const idPhone = useId();
  const digits = useMemo(() => toNationalMobileDigits(form.phone), [form.phone]);
  const filled = digits.length === 10 && digits[0] === '9';

  return (
    <WizardStepShell variant="short" onBack={onBack} aria-label="Ввод номера телефона">
      <div style={reg.phoneFormInner}>
        <div style={reg.phoneFormContent}>
          <h2 style={{ ...reg.ageFigmaQuestion, marginTop: 0, marginBottom: 0, textAlign: 'center' }}>
            Введите свой номер телефона
          </h2>
          {stepError ? (
            <p style={{ ...reg.error, marginTop: 0, marginBottom: 0, textAlign: 'center' }}>{stepError}</p>
          ) : null}

          <div style={reg.phoneFieldButtonRow}>
            <div
              style={{
                ...reg.phoneInputUnderlineWrap,
                ...(fieldError ? reg.wizardFieldUnderlineError : {}),
              }}
            >
              <span style={reg.phoneCountryPrefix} aria-hidden>
                +7
              </span>
              <input
                id={idPhone}
                type="tel"
                name="participantPhone"
                inputMode="tel"
                autoComplete="tel"
                enterKeyHint="done"
                placeholder="9991234567"
                aria-label="Номер телефона"
                value={digits}
                onChange={(e) => {
                  const next = toNationalMobileDigits(e.target.value);
                  onChange({ phone: next });
                }}
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

            <button
              type="button"
              className="ar-reg-wizard-name-next"
              style={{
                ...reg.nameNextBtn,
                ...reg.phoneNextBtn,
                ...(filled ? reg.nameNextBtnActive : {}),
              }}
              disabled={!filled}
              onClick={onNext}
            >
              Далее
            </button>
          </div>
        </div>
      </div>
    </WizardStepShell>
  );
}
