import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api/client';

type Props = {
  onLoggedIn: () => void;
};

/** Full-screen PIN gate for god-admin routes (`/admin/*`). Not reachable from the kiosk home gesture. */
export function AdminGodLoginScreen({ onLoggedIn }: Props) {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const t = window.setTimeout(() => inputRef.current?.focus(), 50);
    return () => window.clearTimeout(t);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (pin.length !== 6 || !/^\d{6}$/.test(pin)) {
      setError('Введите 6 цифр');
      return;
    }
    setLoading(true);
    try {
      await api.adminLogin(pin);
      sessionStorage.setItem('adminPin', pin);
      sessionStorage.setItem('adminRole', 'god_admin');
      onLoggedIn();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        background: '#0d0d0d',
        boxSizing: 'border-box',
      }}
    >
      <form
        onSubmit={handleSubmit}
        style={{
          width: 'min(420px, 100%)',
          background: '#1a1a1a',
          borderRadius: 16,
          padding: 28,
          border: '1px solid #333',
        }}
      >
        <h1 style={{ margin: '0 0 16px', color: '#fff', fontSize: 22 }}>Панель администратора</h1>
        <p style={{ margin: '0 0 16px', color: '#aaa', fontSize: 15 }}>Введите PIN (6 цифр)</p>
        <input
          ref={inputRef}
          type="password"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="\d{6}"
          maxLength={6}
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
          style={{
            width: '100%',
            fontSize: 28,
            letterSpacing: 12,
            textAlign: 'center',
            padding: '16px 12px',
            borderRadius: 12,
            border: '1px solid #444',
            background: '#0d0d0d',
            color: '#fff',
            boxSizing: 'border-box',
          }}
        />
        {error ? (
          <p style={{ color: '#f85149', margin: '12px 0 0', fontSize: 14 }}>{error}</p>
        ) : null}
        <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
          <button
            type="button"
            onClick={() => navigate('/', { replace: true })}
            style={{
              flex: 1,
              minHeight: 52,
              fontSize: 18,
              borderRadius: 12,
              border: '1px solid #444',
              background: 'transparent',
              color: '#ccc',
            }}
          >
            На главную
          </button>
          <button
            type="submit"
            disabled={loading || pin.length !== 6}
            style={{
              flex: 1,
              minHeight: 52,
              fontSize: 18,
              borderRadius: 12,
              border: 'none',
              background: '#e6233a',
              color: '#fff',
              opacity: loading || pin.length !== 6 ? 0.5 : 1,
            }}
          >
            {loading ? '…' : 'Войти'}
          </button>
        </div>
      </form>
    </div>
  );
}
