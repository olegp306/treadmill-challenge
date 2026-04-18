import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../../api/client';
import { APP_VERSION } from '../../appVersion';

export function AdminLayout({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const navigate = useNavigate();
  const [apiVersion, setApiVersion] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void api
      .getApiVersion()
      .then((v) => {
        if (!cancelled) setApiVersion(v.version);
      })
      .catch(() => {
        if (!cancelled) setApiVersion(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const exit = () => {
    sessionStorage.removeItem('adminPin');
    navigate('/', { replace: true });
  };

  return (
    <div style={{ minHeight: '100vh', background: '#0d0d0d', color: '#eee', padding: '16px 20px 40px' }}>
      <header
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: 12,
          marginBottom: 20,
          borderBottom: '1px solid #2a2a2a',
          paddingBottom: 16,
        }}
      >
        <h1 style={{ margin: 0, fontSize: 22, flex: '1 1 auto' }}>{title}</h1>
        <nav style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          <Link to="/admin" style={navBtn}>
            Слоты
          </Link>
          <Link to="/admin/archive" style={navBtn}>
            Архив
          </Link>
          <Link to="/admin/settings" style={navBtn}>
            Настройки
          </Link>
          <Link to="/admin/events" style={navBtn}>
            События
          </Link>
          <button type="button" onClick={exit} style={{ ...navBtn, cursor: 'pointer' }}>
            Выход
          </button>
        </nav>
      </header>
      {children}
      <footer style={{ marginTop: 32, paddingTop: 16, borderTop: '1px solid #2a2a2a', fontSize: 12, color: '#666' }}>
        Версия киоска (сборка): {APP_VERSION}
        {apiVersion != null ? (
          <>
            {' '}
            · API: {apiVersion}
          </>
        ) : null}
      </footer>
    </div>
  );
}

const navBtn: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: 48,
  padding: '0 18px',
  fontSize: 16,
  borderRadius: 10,
  background: '#1e1e1e',
  color: '#eee',
  textDecoration: 'none',
  border: '1px solid #333',
};
