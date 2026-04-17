import { integrationPhaseMessage } from './integrationPhases';
import { useIntegrationInfoOptional } from './IntegrationInfoContext';

/**
 * Top informational curtain for TouchDesigner flow (only when enabled in admin settings).
 */
export function IntegrationInfoBanner() {
  const ctx = useIntegrationInfoOptional();
  if (!ctx || !ctx.loaded || !ctx.bannersEnabled) return null;

  const { tdDemoMode, phase } = ctx;
  const line = integrationPhaseMessage(phase);
  const showDemo = tdDemoMode;
  const showPhase = line != null && phase !== 'idle';

  if (!showDemo && !showPhase) return null;

  return (
    <div className="integration-info-curtain" aria-live="polite">
      {showDemo ? (
        <div className="integration-info-curtain__demo">ВКЛЮЧЕН ТЕСТОВЫЙ РЕЖИМ · результаты эмулируются</div>
      ) : null}
      {showPhase ? <div className="integration-info-curtain__line">{line}</div> : null}
    </div>
  );
}
