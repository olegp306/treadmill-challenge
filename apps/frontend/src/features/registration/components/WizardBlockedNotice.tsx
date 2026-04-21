import type { ReactNode } from 'react';
import { OptionChoiceLink } from './OptionButton';
import { StepBody } from './StepBody';
import { WizardStepShell } from '../WizardStepShell';
import { reg } from '../registrationStyles';

type Props = {
  /** Message line(s); each item is a visual block row (same as age gate). */
  lines: string[];
  onBack: () => void;
  /** Optional extra content under the text (e.g. spacing) */
  children?: ReactNode;
  'aria-label'?: string;
};

/**
 * Full-width warning copy + «На главную», same chrome as AgeStep blocked (Figma wizard).
 */
export function WizardBlockedNotice({ lines, onBack, children, ...rest }: Props) {
  const footer = (
    <div style={reg.ageFigmaButtonRow}>
      <OptionChoiceLink to="/">На главную</OptionChoiceLink>
    </div>
  );

  return (
    <WizardStepShell variant="tall" onBack={onBack} footer={footer} {...rest}>
      <StepBody variant="tall">
        <p style={reg.ageFigmaBlockedText}>
          {lines.map((line, i) => (
            <span key={i} style={{ display: 'block', marginTop: i === 0 ? 0 : 8 }}>
              {line}
            </span>
          ))}
        </p>
        {children}
      </StepBody>
    </WizardStepShell>
  );
}
