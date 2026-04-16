import { OptionButton, StepBody } from '../components';
import { WizardStepShell } from '../WizardStepShell';
import { reg } from '../registrationStyles';

type Props = {
  onSelectSex: (sex: 'male' | 'female') => void;
  onBack: () => void;
};

/** Figma 691:2010 — Выбор пола. */
export function GenderStep({ onSelectSex, onBack }: Props) {
  return (
    <WizardStepShell
      variant="tall"
      onBack={onBack}
      aria-label="Выбор пола"
      footer={
        <div style={reg.ageFigmaButtonRow}>
          <OptionButton onClick={() => onSelectSex('male')}>Мужской</OptionButton>
          <OptionButton onClick={() => onSelectSex('female')}>Женский</OptionButton>
        </div>
      }
    >
      <StepBody variant="tall">
        <h2 style={reg.ageFigmaQuestion}>Выбери свой пол</h2>
      </StepBody>
    </WizardStepShell>
  );
}
