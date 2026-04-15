import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export function RequireAdmin({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();

  useEffect(() => {
    if (!sessionStorage.getItem('adminPin')) {
      navigate('/', { replace: true });
    }
  }, [navigate]);

  if (typeof sessionStorage !== 'undefined' && !sessionStorage.getItem('adminPin')) {
    return null;
  }

  return <>{children}</>;
}
