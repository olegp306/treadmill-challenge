import { rq } from './runQueueScreensStyles';

/** Figma 718:828 — «Пройдите на дорожку» / «Забег сейчас начнется!» (kiosk, AR Ozio). */
export function GoToTreadmillContent() {
  return (
    <div style={rq.goToTreadmillBlock}>
      <p style={{ ...rq.titleMain, margin: 0, textAlign: 'center' }}>Пройдите на дорожку</p>
      <p style={{ ...rq.subtitle, margin: 0, textAlign: 'center' }}>Забег сейчас начнется!</p>
    </div>
  );
}
