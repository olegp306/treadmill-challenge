import { useState } from 'react';
import { AdminGodLoginScreen } from './AdminGodLoginScreen';
import { hasGodAdminSession } from './godAdminSession';

/**
 * Protects `/admin/*`: PIN после `POST /api/admin/login` (например 555555).
 * Вход: URL `/admin` или три тапа по «AMAZING» на главной → `navigate('/admin')`.
 */
export function GodAdminRoute({ children }: { children: React.ReactNode }) {
  const [, setAuthTick] = useState(0);

  if (!hasGodAdminSession()) {
    return <AdminGodLoginScreen onLoggedIn={() => setAuthTick((t) => t + 1)} />;
  }

  return <>{children}</>;
}
