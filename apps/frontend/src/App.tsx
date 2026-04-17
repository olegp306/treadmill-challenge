import { useLocation } from 'react-router-dom';
import { EventTelemetry } from './logging/EventTelemetry';
import { AppRoutes } from './router';
import { AppErrorBoundary } from './AppErrorBoundary';
import { IntegrationInfoProvider } from './integrationInfo/IntegrationInfoContext';
import { IntegrationInfoBanner } from './integrationInfo/IntegrationInfoBanner';

export default function App() {
  const location = useLocation();
  const tdRoute = location.pathname.startsWith('/td');

  return (
    <AppErrorBoundary>
      <IntegrationInfoProvider>
        {!tdRoute && <IntegrationInfoBanner />}
        {!tdRoute && <EventTelemetry />}
        <AppRoutes />
      </IntegrationInfoProvider>
    </AppErrorBoundary>
  );
}
