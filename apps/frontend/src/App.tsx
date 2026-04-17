import { EventTelemetry } from './logging/EventTelemetry';
import { AppRoutes } from './router';
import { AppErrorBoundary } from './AppErrorBoundary';
import { IntegrationInfoProvider } from './integrationInfo/IntegrationInfoContext';
import { IntegrationInfoBanner } from './integrationInfo/IntegrationInfoBanner';

export default function App() {
  return (
    <AppErrorBoundary>
      <IntegrationInfoProvider>
        <IntegrationInfoBanner />
        <EventTelemetry />
        <AppRoutes />
      </IntegrationInfoProvider>
    </AppErrorBoundary>
  );
}
