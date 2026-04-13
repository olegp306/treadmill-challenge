import { WIZARD_ASSETS } from './registrationWizardAssets';
import { reg } from './registrationStyles';

/** Shared dark card background stack (Figma wizard / hero). */
export function WizardCardBackdrop() {
  return (
    <div style={reg.ageFigmaBgHost} aria-hidden>
      <div style={reg.ageFigmaBgWash} />
      <div
        style={{
          ...reg.ageFigmaBgRectLayer,
          backgroundImage: `url('${WIZARD_ASSETS.rectangle}')`,
        }}
      />
      <div style={reg.ageFigmaBgSmoothSheen} />
      <img src={WIZARD_ASSETS.ellipse27} alt="" style={reg.ageFigmaBlobA} />
      <img src={WIZARD_ASSETS.ellipse28} alt="" style={reg.ageFigmaBlobB} />
    </div>
  );
}
