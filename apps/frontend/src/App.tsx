import { EventTelemetry } from './logging/EventTelemetry';
import { AppRoutes } from './router';
import { AppErrorBoundary } from './AppErrorBoundary';

export default function App() {
  return (
    <AppErrorBoundary>
      <EventTelemetry />
      <AppRoutes />
    </AppErrorBoundary>
  );
}
