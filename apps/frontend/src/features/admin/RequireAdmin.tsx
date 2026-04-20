import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

type AdminRole = 'manager' | 'god_admin';

export function RequireAdmin({ children, role }: { children: React.ReactNode; role: AdminRole }) {
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
