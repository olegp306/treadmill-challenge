import { OptionButton, StepBody } from '../components';
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
          <OptionButton onClick={() => onSelectGender('male')}>Мужской</OptionButton>
          <OptionButton onClick={() => onSelectGender('female')}>Женский</OptionButton>
        </div>
      }
    >
      <StepBody variant="tall">
        <h2 style={reg.ageFigmaQuestion}>Выбери свой пол</h2>
      </StepBody>
    </WizardStepShell>
  );
}
