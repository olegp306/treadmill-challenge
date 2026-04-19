import { useLayoutEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { WizardBlockedNotice } from '../features/registration/components/WizardBlockedNotice';
import { RegistrationLayout } from '../features/registration/RegistrationLayout';

type QueueFullLocationState = { fromMainParticipateQueueFull?: boolean } | null;

/** Same wizard chrome as AgeStep «несовершеннолетний» — только текст про переполненную очередь. */
export default function QueueFullPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const entry = location.state as QueueFullLocationState;

  useLayoutEffect(() => {
    const hasEntryToken = Boolean(entry?.fromMainParticipateQueueFull);
    // Только прямой переход с главной (`Main` передаёт state). Иначе закладка/refresh без state.
    // Нельзя отфутболивать по sessionStorage: при полном пуле там может быть старый runSessionId,
    // а экран переполнения должен показываться именно из этого сценария.
    if (!hasEntryToken) {
      void navigate('/', { replace: true });
    }
  }, [entry?.fromMainParticipateQueueFull, navigate]);

  return (
    <RegistrationLayout chrome="wizard">
      <WizardBlockedNotice
        aria-label="Очередь переполнена"
        lines={[
          'Очередь переполнена,',
          'дождитесь, когда текущий участник финиширует и повторите попытку',
        ]}
        onBack={() => {
          void navigate('/', { replace: true });
        }}
      />
    </RegistrationLayout>
  );
}
