import { OptionButton, OptionChoiceLink, StepBody } from '../components';
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
      <OptionButton onClick={() => onAgeChoice('yes')}>Да</OptionButton>
      <OptionButton onClick={() => onAgeChoice('no')}>Нет</OptionButton>
    </div>
  ) : (
    <div style={reg.ageFigmaButtonRow}>
      <OptionChoiceLink to="/">На главную</OptionChoiceLink>
    </div>
  );

  return (
    <WizardStepShell variant="tall" onBack={onBack} footer={footer} aria-label="Подтверждение возраста">
      <StepBody variant="tall">
        {blocked ? (
          <p style={reg.ageFigmaBlockedText}>
            <span style={{ display: 'block' }}>Участие в забеге доступно только совершеннолетним.</span>
            <span style={{ display: 'block' }}>Вы можете вернуться на главную.</span>
          </p>
        ) : (
          <h2 style={reg.ageFigmaQuestion}>
            <span style={{ display: 'block' }}>Вам уже исполнилось</span>
            <span style={{ display: 'block' }}>18 лет?</span>
          </h2>
        )}
      </StepBody>
    </WizardStepShell>
  );
}
