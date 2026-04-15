import { EventTelemetry } from './logging/EventTelemetry';
import { AppRoutes } from './router';

export default function App() {
  return (
    <>
      <EventTelemetry />
      <AppRoutes />
    </>
  );
}
