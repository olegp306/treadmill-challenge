import { h } from '../../arOzio/dimensions';
import { rq } from './runQueueScreensStyles';

/** Figma 718:828 — «Пройдите на дорожку» / «Забег сейчас начнется!» (kiosk, AR Ozio). */
export function GoToTreadmillContent() {
  return (
    <>
      <p style={{ ...rq.titleMain, margin: 0 }}>Пройдите на дорожку</p>
      <p style={{ ...rq.subtitle, marginTop: h(40) }}>Забег сейчас начнется!</p>
    </>
  );
}
