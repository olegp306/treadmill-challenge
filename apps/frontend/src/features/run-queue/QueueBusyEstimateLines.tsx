import { h } from '../../arOzio/dimensions';
import { formatAheadPeopleAccentSlice, formatEstimatedWaitAccentSlice } from '../../utils/russianPlural';
import { rq } from './runQueueScreensStyles';

type Props = {
  peopleAhead: number;
  waitMinutes: number;
};

/** Две однострочные строки под «Дорожка пока занята»: серый префикс / белый акцент (Figma). */
export function QueueBusyEstimateLines({ peopleAhead, waitMinutes }: Props) {
  return (
    <>
      <p style={{ ...rq.queueFigmaSubline, marginTop: h(24) }}>
        <span style={rq.queueFigmaMuted}>Перед тобой </span>
        <span style={rq.queueFigmaStrong}>{formatAheadPeopleAccentSlice(peopleAhead)}</span>
      </p>
      <p style={{ ...rq.queueFigmaSubline, marginTop: h(16) }}>
        <span style={rq.queueFigmaMuted}>Примерное время ожидания: </span>
        <span style={rq.queueFigmaStrong}>{formatEstimatedWaitAccentSlice(waitMinutes)}</span>
      </p>
    </>
  );
}
