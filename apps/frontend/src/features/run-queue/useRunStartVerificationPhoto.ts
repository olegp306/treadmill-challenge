import { useEffect, useRef } from 'react';
import { api } from '../../api/client';
import { logEvent } from '../../logging/logEvent';
import { captureFrontCameraJpegDataUrl } from './runVerificationPhotoCapture';

/**
 * One capture + upload per `runSessionId` when `shouldCapture` is true (session **running**).
 * Does not block the run flow if the camera fails.
 */
export function useRunStartVerificationPhoto(opts: {
  runSessionId: string;
  participantId: string;
  /** Typically `liveStatus === 'running'` and not TD demo mode. */
  shouldCapture: boolean;
}): void {
  const attemptForSessionRef = useRef<string | null>(null);

  useEffect(() => {
    attemptForSessionRef.current = null;
  }, [opts.runSessionId]);

  useEffect(() => {
    const { runSessionId, participantId, shouldCapture } = opts;
    if (!shouldCapture || !runSessionId || !participantId) return;
    if (attemptForSessionRef.current === runSessionId) return;
    attemptForSessionRef.current = runSessionId;

    void (async () => {
      logEvent(
        'verification_photo_capture_requested',
        { runSessionId },
        {
          participantId,
          runSessionId,
          readableMessage: 'Запрошено фото в начале забега (проверка мошенничества)',
        }
      );
      const dataUrl = await captureFrontCameraJpegDataUrl();
      if (!dataUrl) {
        logEvent(
          'verification_photo_capture_failed',
          { runSessionId, reason: 'camera_unavailable' },
          {
            participantId,
            runSessionId,
            readableMessage: 'Не удалось снять фото: камера недоступна или отказ в доступе',
          }
        );
        return;
      }
      try {
        await api.submitRunSessionStartPhoto({
          runSessionId,
          participantId,
          imageBase64: dataUrl,
        });
        logEvent(
          'verification_photo_attached_to_run_session',
          { runSessionId },
          {
            participantId,
            runSessionId,
            readableMessage: 'Фото начала забега сохранено на сервере (ожидает финиша)',
          }
        );
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        logEvent(
          'verification_photo_upload_failed',
          { runSessionId, message: msg },
          {
            participantId,
            runSessionId,
            readableMessage: `Не удалось отправить фото: ${msg}`,
          }
        );
      }
    })();
  }, [opts.runSessionId, opts.participantId, opts.shouldCapture]);
}
