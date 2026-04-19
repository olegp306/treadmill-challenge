import { useNavigate } from 'react-router-dom';
import { WizardBlockedNotice } from '../features/registration/components/WizardBlockedNotice';
import { RegistrationLayout } from '../features/registration/RegistrationLayout';

/** Same wizard chrome as AgeStep «несовершеннолетний» — только текст про переполненную очередь. */
export default function QueueFullPage() {
  const navigate = useNavigate();

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
