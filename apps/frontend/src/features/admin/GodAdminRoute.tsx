import { useState } from 'react';
import { AdminGodLoginScreen } from './AdminGodLoginScreen';
import { hasGodAdminSession } from './godAdminSession';

/**
 * Protects `/admin/*`: no kiosk gesture — only direct URL + PIN (`POST /api/admin/login`, e.g. 555555).
 */
export function GodAdminRoute({ children }: { children: React.ReactNode }) {
  const [, setAuthTick] = useState(0);

  if (!hasGodAdminSession()) {
    return <AdminGodLoginScreen onLoggedIn={() => setAuthTick((t) => t + 1)} />;
  }

  return <>{children}</>;
}
