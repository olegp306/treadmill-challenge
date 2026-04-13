import { WizardStepShell } from '../WizardStepShell';
import { reg } from '../registrationStyles';

type Props = {
  onSelectGender: (gender: 'male' | 'female') => void;
  onBack: () => void;
};

/** Figma 691:2010 — Выбор пола. */
export function GenderStep({ onSelectGender, onBack }: Props) {
  return (
    <WizardStepShell
      variant="tall"
      onBack={onBack}
      aria-label="Выбор пола"
      footer={
        <div style={reg.ageFigmaButtonRow}>
          <button
            type="button"
            className="ar-reg-wizard-choice-btn"
            style={reg.ageFigmaChoiceBtn}
            onClick={() => onSelectGender('male')}
          >
            Мужской
          </button>
          <button
            type="button"
            className="ar-reg-wizard-choice-btn"
            style={reg.ageFigmaChoiceBtn}
            onClick={() => onSelectGender('female')}
          >
            Женский
          </button>
        </div>
      }
    >
      <div
        style={{
          flex: 1,
          minHeight: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2cqh 0',
        }}
      >
        <h2 style={reg.ageFigmaQuestion}>Выбери свой пол</h2>
      </div>
    </WizardStepShell>
  );
}
