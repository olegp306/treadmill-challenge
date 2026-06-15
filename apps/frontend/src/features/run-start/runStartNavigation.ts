import type { NavigateFunction } from 'react-router-dom';
import type { Gender, RunTypeId } from '@treadmill-challenge/shared';
import { logEvent, setLoggedRunSessionId } from '../../logging/logEvent';

type StartedRunResponse = {
  success: true;
  runSessionId: string;
  participantId: string;
  competitionId: string;
  runTypeId: RunTypeId;
  runType: string;
  runName: string;
  status: string;
  queueNumber: number;
  position: number;
  queuePosition: number;
  createdAt: string;
  demoMode: boolean;
  treadmillStatus: 'free' | 'busy' | 'unknown';
  otherSessionRunning: boolean;
};

type RunStartNavigationOptions = {
  res: StartedRunResponse;
  navigate: NavigateFunction;
  participantSex: Gender;
  participantFirstName?: string;
  report: (phase: 'sent_to_touchdesigner') => void;
  clearPhase: () => void;
  /** The ready screen itself replaces the immediate "go to treadmill" screen for the first runner. */
  skipImmediatePrepare?: boolean;
};

export function navigateAfterRunStart({
  res,
  navigate,
  participantSex,
  participantFirstName,
  report,
  clearPhase,
  skipImmediatePrepare = false,
}: RunStartNavigationOptions): void {
  setLoggedRunSessionId(res.runSessionId);
  logEvent(
    'run_started',
    { runTypeId: res.runTypeId, demoMode: res.demoMode, queuePosition: res.position },
    {
      participantId: res.participantId,
      runSessionId: res.runSessionId,
      readableMessage: res.demoMode
        ? 'Забег начат в демо-режиме (без TouchDesigner)'
        : `Забег начат, пользователь в очереди (позиция ${res.position})`,
    }
  );

  if (res.demoMode) {
    clearPhase();
  } else {
    report('sent_to_touchdesigner');
  }

  if (!res.demoMode) {
    logEvent(
      'touchdesigner_ack',
      { runTypeId: res.runTypeId, treadmillStatus: res.treadmillStatus },
      {
        participantId: res.participantId,
        runSessionId: res.runSessionId,
        readableMessage: `TouchDesigner ack: treadmill=${res.treadmillStatus}`,
      }
    );
    logEvent(
      'added_to_queue',
      { runTypeId: res.runTypeId, queuePosition: res.position },
      {
        participantId: res.participantId,
        runSessionId: res.runSessionId,
        readableMessage: `Пользователь добавлен в очередь. Номер в очереди: ${res.position}`,
      }
    );
  }

  if (!res.demoMode && res.treadmillStatus === 'busy') {
    navigate('/run/queue-busy', {
      replace: true,
      state: {
        participantId: res.participantId,
        participantFirstName,
        participantSex,
        runTypeId: res.runTypeId,
        reason: 'treadmill_busy',
        runSessionId: res.runSessionId,
      },
    });
    return;
  }

  if (!res.demoMode && res.otherSessionRunning) {
    navigate('/run/queue', {
      replace: true,
      state: {
        participantId: res.participantId,
        runSessionId: res.runSessionId,
        runTypeId: res.runTypeId,
        position: res.position,
        participantSex,
        participantFirstName,
        initialSessionStatus: 'queued',
        initialOtherSessionRunning: true,
      },
    });
    return;
  }

  if (!res.demoMode && (res.status === 'running' || (res.status === 'queued' && res.position === 1))) {
    if (skipImmediatePrepare && res.status === 'running') {
      navigate('/', { replace: true });
      return;
    }
    navigate('/run/prepare', {
      replace: true,
      state: {
        participantId: res.participantId,
        runSessionId: res.runSessionId,
        runTypeId: res.runTypeId,
        participantSex,
        participantFirstName,
        demoMode: false,
        immediateRunning: res.status === 'running',
      },
    });
    return;
  }

  if (res.demoMode) {
    if (res.status === 'running') {
      navigate('/run/prepare', {
        replace: true,
        state: {
          participantId: res.participantId,
          runSessionId: res.runSessionId,
          runTypeId: res.runTypeId,
          participantSex,
          participantFirstName,
          demoMode: true,
        },
      });
    } else {
      navigate('/run/queue', {
        replace: true,
        state: {
          participantId: res.participantId,
          runSessionId: res.runSessionId,
          runTypeId: res.runTypeId,
          position: res.position,
          participantSex,
          participantFirstName,
          demoMode: true,
        },
      });
    }
    return;
  }

  navigate('/run/queue', {
    replace: true,
    state: {
      participantId: res.participantId,
      runSessionId: res.runSessionId,
      runTypeId: res.runTypeId,
      position: res.position,
      participantSex,
      participantFirstName,
      initialSessionStatus: res.status === 'running' ? 'running' : 'queued',
      initialOtherSessionRunning: res.otherSessionRunning,
    },
  });
}
