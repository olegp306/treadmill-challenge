import { reg } from './registrationStyles';

/** Shared dark card background stack (Figma wizard / hero). */
export function WizardCardBackdrop() {
  return (
    <div style={reg.ageFigmaBgHost} aria-hidden>
      <div style={reg.ageFigmaBgWash} />
      <div style={reg.ageFigmaBgRectLayer} />
      <div style={reg.ageFigmaBgSmoothSheen} />
    </div>
  );
}
