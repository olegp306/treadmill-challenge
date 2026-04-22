import type { KeyboardEvent, MouseEvent } from 'react';
import { logEvent } from '../../../logging/logEvent';
import type { RegistrationFormData } from '../types';
import { reg } from '../registrationStyles';

type CheckboxKey = 'consentParticipation' | 'consentPersonalData';

type Props = {
  checked: boolean;
  onChange: (next: Partial<RegistrationFormData>) => void;
  field: CheckboxKey;
  title: string;
  checkAriaLabel: string;
  onRead: () => void;
};

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

/** One consent card row: checkbox + title + «Ознакомиться» (Figma). */
export function ConsentCheckboxRow({
  checked,
  onChange,
  field,
  title,
  checkAriaLabel,
  onRead,
}: Props) {
  const applyToggle = (next: boolean) => {
    onChange({ [field]: next } as Partial<RegistrationFormData>);
    logEvent(
      'consent_toggle',
      { field, checked: next },
      {
        readableMessage: next
          ? `Пользователь отметил согласие: «${title}»`
          : `Пользователь снял отметку: «${title}»`,
      }
    );
  };

  const onCardClick = (e: MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    // "Ознакомиться" has its own action and must not toggle the checkbox.
    if (target.closest('.ar-reg-wizard-consent-read')) return;
    // Native checkbox click already toggles itself.
    if (target.closest('input[type="checkbox"]')) return;
    applyToggle(!checked);
  };

  const onCardKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const target = e.target as HTMLElement;
    if (target.closest('.ar-reg-wizard-consent-read')) return;
    e.preventDefault();
    applyToggle(!checked);
  };

  return (
    <div
      style={{
        ...reg.consentCard,
        ...(field === 'consentPersonalData'
          ? reg.consentCardPersonalDataLayout
          : reg.consentCardParticipationLayout),
      }}
      role="checkbox"
      aria-checked={checked}
      tabIndex={0}
      onClick={onCardClick}
      onKeyDown={onCardKeyDown}
    >
      <div style={reg.consentCardInner}>
        <label className="ar-reg-consent-check-label" style={reg.consentCheckLabel}>
          <input
            type="checkbox"
            style={reg.consentCheckInput}
            checked={checked}
            onChange={(e) => {
              applyToggle(e.target.checked);
            }}
            aria-label={checkAriaLabel}
          />
          <span className="ar-reg-consent-check-frame" style={reg.consentCheckFrame}>
            {checked ? (
              <span style={reg.consentCheckMark}>
                <ConsentCheckIcon />
              </span>
            ) : null}
          </span>
        </label>
        <div
          style={{
            ...reg.consentCardTextCol,
            ...(field === 'consentPersonalData' ? reg.consentCardTextColPersonalData : {}),
          }}
        >
          <p
            style={{
              ...reg.consentCardTitle,
              ...(field === 'consentPersonalData' ? reg.consentCardTitlePersonalData : {}),
            }}
          >
            {title}
          </p>
          <button
            type="button"
            className="ar-reg-wizard-consent-read"
            style={reg.consentReadBtn}
            onClick={(e) => {
              e.stopPropagation();
              onRead();
            }}
          >
            Ознакомиться
          </button>
        </div>
      </div>
    </div>
  );
}
