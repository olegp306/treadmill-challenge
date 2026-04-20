import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

/** Manager panel (`/manager`) — opened from home via logo gesture + `managerLogin`. Full admin uses `GodAdminRoute` + `/admin` URL. */
export function RequireAdmin({ children, role = 'manager' }: { children: React.ReactNode; role?: 'manager' }) {
  const navigate = useNavigate();

  useEffect(() => {
    const pin = sessionStorage.getItem('adminPin');
    const currentRole = sessionStorage.getItem('adminRole');
    if (!pin || currentRole !== role) {
      navigate('/', { replace: true });
    }
  }, [navigate, role]);

  if (
    typeof sessionStorage !== 'undefined' &&
    (!sessionStorage.getItem('adminPin') || sessionStorage.getItem('adminRole') !== role)
  ) {
    return null;
  }

  return <>{children}</>;
}
