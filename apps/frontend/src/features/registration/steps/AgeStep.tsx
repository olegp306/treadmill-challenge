import { Link } from 'react-router-dom';
import { h } from '../../../arOzio/dimensions';
import { WizardStepShell } from '../WizardStepShell';
import type { AgeChoice } from '../types';
import { reg } from '../registrationStyles';

type Props = {
  ageChoice: AgeChoice;
  onAgeChoice: (choice: AgeChoice) => void;
  onBack: () => void;
};

/** Figma 691:529 / 697:489 — age confirmation + Да/Нет below card. */
export function AgeStep({ ageChoice, onAgeChoice, onBack }: Props) {
  const blocked = ageChoice === 'no';

  const footer = !blocked ? (
    <div style={reg.ageFigmaButtonRow}>
      <button
        type="button"
        className="ar-reg-wizard-choice-btn"
        style={reg.ageFigmaChoiceBtn}
        onClick={() => onAgeChoice('yes')}
      >
        Да
      </button>
      <button
        type="button"
        className="ar-reg-wizard-choice-btn"
        style={reg.ageFigmaChoiceBtn}
        onClick={() => onAgeChoice('no')}
      >
        Нет
      </button>
    </div>
  ) : (
    <div style={reg.ageFigmaButtonRow}>
      <Link to="/" className="ar-reg-wizard-choice-btn ar-reg-wizard-choice-link" style={reg.ageFigmaChoiceBtnLink}>
        На главную
      </Link>
    </div>
  );

  return (
    <WizardStepShell variant="tall" onBack={onBack} footer={footer} aria-label="Подтверждение возраста">
      <div
        style={{
          ...reg.ageFigmaContentArea,
          marginTop: blocked ? h(48) : h(314),
          flex: 1,
        }}
      >
        {blocked ? (
          <p style={reg.ageFigmaBlockedText}>
            Участие в забеге доступно только совершеннолетним. Вы можете вернуться на главную.
          </p>
        ) : (
          <h2 style={reg.ageFigmaQuestion}>
            <span style={{ display: 'block' }}>Вам уже исполнилось</span>
            <span style={{ display: 'block' }}>18 лет?</span>
          </h2>
        )}
      </div>
    </WizardStepShell>
  );
}
