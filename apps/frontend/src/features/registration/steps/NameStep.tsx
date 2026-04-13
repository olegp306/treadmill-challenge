import { useId, useLayoutEffect, useRef } from 'react';
import { h } from '../../../arOzio/dimensions';
import type { RegistrationFormData } from '../types';
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
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            minHeight: 0,
            overflow: 'hidden',
          }}
        >
          <h2 style={{ ...reg.ageFigmaQuestion, marginTop: 0, marginBottom: h(12) }}>
            Как тебя зовут?
          </h2>
          {stepError ? (
            <p style={{ ...reg.error, marginTop: 0, marginBottom: h(12) }}>{stepError}</p>
          ) : null}
          <form
            style={{ ...reg.nameFormRow, marginTop: h(12) }}
            onSubmit={(e) => {
              e.preventDefault();
              tryAdvance();
            }}
          >
            <div style={reg.nameFieldsCluster}>
              <div style={reg.nameFieldCol}>
                <label
                  htmlFor={idFirst}
                  style={{
                    ...reg.nameFieldLabel,
                    cursor: 'pointer',
                    ...(firstErr ? { color: '#f85149' } : {}),
                  }}
                >
                  Имя
                </label>
                <input
                  ref={firstRef}
                  id={idFirst}
                  type="text"
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
                  style={{
                    ...reg.wizardFieldUnderline,
                    ...reg.nameFieldInput,
                    ...(firstErr ? reg.wizardFieldUnderlineError : {}),
                  }}
                />
              </div>
              <div style={reg.nameFieldCol}>
                <label
                  htmlFor={idLast}
                  style={{
                    ...reg.nameFieldLabel,
                    cursor: 'pointer',
                    ...(lastErr ? { color: '#f85149' } : {}),
                  }}
                >
                  Фамилия
                </label>
                <input
                  ref={lastRef}
                  id={idLast}
                  type="text"
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
                  style={{
                    ...reg.wizardFieldUnderline,
                    ...reg.nameFieldInput,
                    ...(lastErr ? reg.wizardFieldUnderlineError : {}),
                  }}
                />
              </div>
            </div>
            <button
              type="submit"
              className="ar-reg-wizard-name-next"
              style={{
                ...reg.nameNextBtn,
                ...(filled ? reg.nameNextBtnActive : {}),
              }}
              disabled={!filled}
            >
              Далее
            </button>
          </form>
        </div>
      </div>
    </WizardStepShell>
  );
}
