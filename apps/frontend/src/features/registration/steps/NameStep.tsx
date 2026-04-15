import { useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { RegistrationFormData } from '../types';
import { logEvent } from '../../../logging/logEvent';
import { validateNamePart } from '../nameValidation';
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
  const [blurFirstError, setBlurFirstError] = useState<string | null>(null);
  const [blurLastError, setBlurLastError] = useState<string | null>(null);

  const firstResult = useMemo(() => validateNamePart(form.firstName, 'first'), [form.firstName]);
  const lastResult = useMemo(() => validateNamePart(form.lastName, 'last'), [form.lastName]);

  const firstErrHighlight = Boolean(blurFirstError || (fieldError && !firstResult.ok));
  const lastErrHighlight = Boolean(blurLastError || (fieldError && !lastResult.ok));
  const firstErrText = blurFirstError ?? (fieldError && !firstResult.ok ? firstResult.message : null);
  const lastErrText = blurLastError ?? (fieldError && !lastResult.ok ? lastResult.message : null);

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
              hasError={firstErrHighlight}
              errorText={firstErrText}
              name="givenName"
              autoComplete="given-name"
              autoCapitalize="words"
              autoCorrect="on"
              spellCheck={false}
              enterKeyHint="next"
              lang="ru"
              value={form.firstName}
              aria-label="Имя"
              onChange={(e) => {
                onChange({ firstName: e.target.value });
                setBlurFirstError(null);
              }}
              onBlur={(e) => {
                const r = validateNamePart(e.target.value, 'first');
                if (r.ok) {
                  onChange({ firstName: r.normalized });
                  setBlurFirstError(null);
                  logEvent(
                    'field_name_first_blur',
                    { length: r.normalized.length },
                    { readableMessage: `Пользователь ввёл имя: ${r.normalized}` }
                  );
                } else {
                  setBlurFirstError(r.message);
                }
              }}
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
              hasError={lastErrHighlight}
              errorText={lastErrText}
              name="familyName"
              autoComplete="family-name"
              autoCapitalize="words"
              autoCorrect="on"
              spellCheck={false}
              inputMode="text"
              enterKeyHint="done"
              lang="ru"
              value={form.lastName}
              aria-label="Фамилия"
              onChange={(e) => {
                onChange({ lastName: e.target.value });
                setBlurLastError(null);
              }}
              onBlur={(e) => {
                const r = validateNamePart(e.target.value, 'last');
                if (r.ok) {
                  onChange({ lastName: r.normalized });
                  setBlurLastError(null);
                  logEvent(
                    'field_name_last_blur',
                    { length: r.normalized.length },
                    { readableMessage: `Пользователь ввёл фамилию: ${r.normalized}` }
                  );
                } else {
                  setBlurLastError(r.message);
                }
              }}
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
