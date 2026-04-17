import { useLocation } from 'react-router-dom';
import { EventTelemetry } from './logging/EventTelemetry';
import { AppRoutes } from './router';
import { AppErrorBoundary } from './AppErrorBoundary';
import { IntegrationInfoProvider } from './integrationInfo/IntegrationInfoContext';
import { IntegrationInfoBanner } from './integrationInfo/IntegrationInfoBanner';

export default function App() {
  const location = useLocation();
  const hideIntegrationChrome = location.pathname.startsWith('/td') || location.pathname.startsWith('/dev');

  return (
    <AppErrorBoundary>
      <IntegrationInfoProvider>
        {!hideIntegrationChrome && <IntegrationInfoBanner />}
        {!hideIntegrationChrome && <EventTelemetry />}
        <AppRoutes />
      </IntegrationInfoProvider>
    </AppErrorBoundary>
  );
}
