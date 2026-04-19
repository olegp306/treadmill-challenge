import type { InputHTMLAttributes, MutableRefObject, Ref } from 'react';
import { useId, useLayoutEffect, useMemo, useRef } from 'react';
import { useInput } from 'input-format/react-hook';
import type { RegistrationFormData } from '../types';
import { scheduleWizardStepPhoneFocus } from '../iosInputFocus';
import { formatPhoneParsed, parsePhoneChar } from '../phoneFormat';
import { logEvent } from '../../../logging/logEvent';
import { formatPhoneFromDigits } from '../phoneFormat';
import { digitsOnly, validatePhoneForSubmit } from '../phoneValidation';
import { PrimaryButton, StepBody } from '../components';
import { WizardStepShell } from '../WizardStepShell';
import { reg } from '../registrationStyles';
import { InputField } from '../../../ui/components/InputField';

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
  const phoneInputRef = useRef<HTMLInputElement | null>(null);

  const digitsValue = useMemo(() => digitsOnly(form.phone), [form.phone]);
  const filled = useMemo(() => validatePhoneForSubmit(form.phone).ok, [form.phone]);

  const inputProps = useInput({
    value: digitsValue,
    onChange: (v) => patchForm({ phone: (v as string | undefined) ?? '' }),
    parse: parsePhoneChar,
    format: formatPhoneParsed,
    id: idPhone,
    type: 'tel' as const,
    /** iPad/iPhone: предпочтительная клавиатура для номера (не полная QWERTY). */
    inputMode: 'tel' as const,
    autoComplete: 'tel',
    autoCorrect: 'off',
    autoCapitalize: 'off',
    spellCheck: false,
    name: 'participantPhone',
    enterKeyHint: 'done' as const,
    'aria-label': 'Номер телефона',
    placeholder: '+7 999 999 9999',
  });

  const hookRef = (inputProps as { ref?: Ref<HTMLInputElement> }).ref;

  useLayoutEffect(() => {
    const el = phoneInputRef.current;
    return scheduleWizardStepPhoneFocus(el);
  }, []);

  return (
    <WizardStepShell variant="short" onBack={onBack} aria-label="Ввод номера телефона">
      <StepBody variant="short">
        <h2 style={{ ...reg.ageFigmaQuestion, ...reg.stepTitle }}>
          Введите свой номер 
        </h2>
        {stepError ? (
          <p style={{ ...reg.error, ...reg.stepErrorCentered }}>{stepError}</p>
        ) : null}

        <div style={reg.phoneFieldButtonRow}>
          <InputField
            {...inputProps}
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            autoCapitalize="off"
            className={['reg-input-phone-narrow', (inputProps as { className?: string }).className]
              .filter(Boolean)
              .join(' ')}
            wrapperStyle={reg.phoneInputUnderlineWrap}
            hasError={fieldError}
            errorText={null}
            inputBaseStyle={reg.phoneDigitsInput}
            ref={(node) => {
              phoneInputRef.current = node;
              if (typeof hookRef === 'function') {
                hookRef(node);
              } else if (hookRef && typeof hookRef === 'object' && 'current' in hookRef) {
                (hookRef as MutableRefObject<HTMLInputElement | null>).current = node;
              }
            }}
            /** Дублируем для десктопов; на iOS основной показ клавиатуры — scheduleWizardStepPhoneFocus. */
            autoFocus
            onBlur={(e) => {
              (inputProps as InputHTMLAttributes<HTMLInputElement>).onBlur?.(e);
              const r = validatePhoneForSubmit(form.phone);
              if (!r.ok) return;
              logEvent(
                'field_phone_blur',
                { phoneDigitsLen: r.normalized.length },
                {
                  readableMessage: `Пользователь ввёл номер телефона: ${formatPhoneFromDigits(r.normalized)}`,
                }
              );
            }}
          />

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
