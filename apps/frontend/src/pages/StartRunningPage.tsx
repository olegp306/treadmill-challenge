import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api/client';

type Sex = 'male' | 'female';
type RunMode = 'time' | '1km' | '5km';

export default function StartRunningPage() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [sex, setSex] = useState<Sex>('male');
  const [runMode, setRunMode] = useState<RunMode>('time');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await api.register({
        name: name.trim(),
        phone: phone.trim(),
        sex,
        runMode,
        runName: runMode === 'time' ? 'Time Challenge' : runMode === '1km' ? '1km Challenge' : '5km Challenge',
      });
      navigate('/result', {
        state: {
          message:
            'Started! Your data was sent to the treadmill display (TouchDesigner). You are in the queue.',
        },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main style={styles.main}>
      <Link to="/" style={styles.back}>
        ← Back
      </Link>
      <h1 style={styles.title}>Start running!</h1>
      <p style={styles.subtitle}>
        Enter your details. Data is sent to the backend and then to the treadmill display
        (TouchDesigner).
      </p>

      <form onSubmit={handleSubmit} style={styles.form}>
        {error && <p style={styles.error}>{error}</p>}
        <label style={styles.label}>
          Name
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoFocus
            placeholder="Your name"
            style={styles.input}
          />
        </label>
        <label style={styles.label}>
          Phone
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
            placeholder="Your phone number"
            style={styles.input}
          />
        </label>
        <label style={styles.label}>
          Challenge mode
          <div style={styles.modeGrid}>
            <button
              type="button"
              onClick={() => setRunMode('time')}
              style={{
                ...styles.switchOption,
                ...(runMode === 'time' ? styles.switchOptionActive : {}),
              }}
            >
              Time
            </button>
            <button
              type="button"
              onClick={() => setRunMode('1km')}
              style={{
                ...styles.switchOption,
                ...(runMode === '1km' ? styles.switchOptionActive : {}),
              }}
            >
              1 km
            </button>
            <button
              type="button"
              onClick={() => setRunMode('5km')}
              style={{
                ...styles.switchOption,
                ...(runMode === '5km' ? styles.switchOptionActive : {}),
              }}
            >
              5 km
            </button>
          </div>
        </label>
        <label style={styles.label}>
          Sex
          <div style={styles.switchRow}>
            <button
              type="button"
              onClick={() => setSex('male')}
              style={{
                ...styles.switchOption,
                ...(sex === 'male' ? styles.switchOptionActive : {}),
              }}
            >
              Male
            </button>
            <button
              type="button"
              onClick={() => setSex('female')}
              style={{
                ...styles.switchOption,
                ...(sex === 'female' ? styles.switchOptionActive : {}),
              }}
            >
              Female
            </button>
          </div>
        </label>
        <button type="submit" disabled={loading} style={styles.button}>
          {loading ? 'Starting…' : 'Start'}
        </button>
      </form>
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  main: {
    minHeight: '100vh',
    padding: 24,
    maxWidth: 400,
    margin: '0 auto',
  },
  back: {
    display: 'inline-block',
    marginBottom: 24,
    color: '#8b949e',
  },
  title: {
    fontSize: '1.75rem',
    fontWeight: 700,
    margin: '0 0 0.25rem',
  },
  subtitle: {
    color: '#8b949e',
    margin: '0 0 1.5rem',
    fontSize: 14,
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  label: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    fontSize: 14,
    fontWeight: 500,
  },
  input: {
    padding: '10px 12px',
    borderRadius: 8,
    border: '1px solid #30363d',
    backgroundColor: '#0d1117',
    color: '#e6edf3',
  },
  switchRow: {
    display: 'flex',
    gap: 8,
  },
  modeGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr 1fr',
    gap: 8,
  },
  switchOption: {
    flex: 1,
    padding: '10px 16px',
    borderRadius: 8,
    border: '1px solid #30363d',
    backgroundColor: '#0d1117',
    color: '#8b949e',
    fontWeight: 500,
    cursor: 'pointer',
  },
  switchOptionActive: {
    backgroundColor: '#238636',
    color: '#fff',
    borderColor: '#238636',
  },
  button: {
    padding: '12px 24px',
    backgroundColor: '#238636',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    fontWeight: 600,
    marginTop: 8,
    cursor: 'pointer',
  },
  error: {
    color: '#f85149',
    margin: 0,
    fontSize: 14,
  },
};
