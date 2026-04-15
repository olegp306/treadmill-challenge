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
  return (
    <div style={reg.consentCard}>
      <div style={reg.consentCardInner}>
        <label className="ar-reg-consent-check-label" style={reg.consentCheckLabel}>
          <input
            type="checkbox"
            style={reg.consentCheckInput}
            checked={checked}
            onChange={(e) => onChange({ [field]: e.target.checked } as Partial<RegistrationFormData>)}
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
        <div style={reg.consentCardTextCol}>
          <p style={reg.consentCardTitle}>{title}</p>
          <button
            type="button"
            className="ar-reg-wizard-consent-read"
            style={reg.consentReadBtn}
            onClick={onRead}
          >
            Ознакомиться
          </button>
        </div>
      </div>
    </div>
  );
}
