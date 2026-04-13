import { useId, useLayoutEffect, useRef } from 'react';
import type { RegistrationFormData } from '../types';
import { PrimaryButton, StepBody, UnderlineField } from '../components';
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

/** Figma 691:2042 — имя / фамилия + Далее; underline-only inputs, native keyboard. */
export function NameStep({ form, onChange, onNext, onBack, stepError, fieldError }: Props) {
  const idFirst = useId();
  const idLast = useId();
  const firstRef = useRef<HTMLInputElement>(null);
  const lastRef = useRef<HTMLInputElement>(null);

  const first = form.firstName.trim();
  const last = form.lastName.trim();
  const filled = Boolean(first && last);

  useLayoutEffect(() => {
    const el = firstRef.current;
    if (!el) return;
    const t = window.setTimeout(() => {
      el.focus({ preventScroll: true });
    }, 0);
    return () => window.clearTimeout(t);
  }, []);

  const tryAdvance = () => {
    onNext();
  };

  const firstErr = fieldError && !form.firstName.trim();
  const lastErr = fieldError && !form.lastName.trim();

  return (
    <WizardStepShell variant="short" onBack={onBack} aria-label="Ввод имени">
      <StepBody variant="short">
        <h2 style={{ ...reg.ageFigmaQuestion, ...reg.stepTitle }}>Как тебя зовут?</h2>
        {stepError ? (
          <p style={{ ...reg.error, ...reg.stepErrorCentered }}>{stepError}</p>
        ) : null}
        <form
          style={reg.nameFormRow}
          onSubmit={(e) => {
            e.preventDefault();
            tryAdvance();
          }}
        >
          <div style={reg.nameFieldsCluster}>
            <UnderlineField
              ref={firstRef}
              id={idFirst}
              label="Имя"
              hasError={firstErr}
              name="givenName"
              autoComplete="given-name"
              autoCapitalize="words"
              autoCorrect="on"
              spellCheck={false}
              inputMode="text"
              enterKeyHint="next"
              autoFocus
              value={form.firstName}
              aria-label="Имя"
              onChange={(e) => onChange({ firstName: e.target.value })}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  lastRef.current?.focus();
                }
              }}
            />
            <UnderlineField
              ref={lastRef}
              id={idLast}
              label="Фамилия"
              hasError={lastErr}
              name="familyName"
              autoComplete="family-name"
              autoCapitalize="words"
              autoCorrect="on"
              spellCheck={false}
              inputMode="text"
              enterKeyHint="done"
              value={form.lastName}
              aria-label="Фамилия"
              onChange={(e) => onChange({ lastName: e.target.value })}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && filled) {
                  e.preventDefault();
                  tryAdvance();
                }
              }}
            />
          </div>
          <PrimaryButton variant="next" type="submit" active={filled} disabled={!filled}>
            Далее
          </PrimaryButton>
        </form>
      </StepBody>
    </WizardStepShell>
  );
}
