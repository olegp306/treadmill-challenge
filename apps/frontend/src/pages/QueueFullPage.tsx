import { useLayoutEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { WizardBlockedNotice } from '../features/registration/components/WizardBlockedNotice';
import { RegistrationLayout } from '../features/registration/RegistrationLayout';

type QueueFullLocationState = {
  fromMainParticipateQueueFull?: boolean;
  /** После startRun при полном пуле с экрана выбора формата. */
  fromRunSelectionQueueFull?: boolean;
} | null;

/** Same wizard chrome as AgeStep «несовершеннолетний» — только текст про переполненную очередь. */
export default function QueueFullPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const entry = location.state as QueueFullLocationState;

  useLayoutEffect(() => {
    const allowed = Boolean(entry?.fromMainParticipateQueueFull || entry?.fromRunSelectionQueueFull);
    // Только переход с главной или с выбора формата при полном пуле — иначе закладка/refresh без state.
    if (!allowed) {
      void navigate('/', { replace: true });
    }
  }, [entry?.fromMainParticipateQueueFull, entry?.fromRunSelectionQueueFull, navigate]);

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
