import { Link, useLocation } from 'react-router-dom';

export default function ResultPage() {
  const location = useLocation();
  const message = (location.state as { message?: string } | null)?.message ?? 'Your result will appear here.';

  return (
    <main style={styles.main}>
      <h1 style={styles.title}>Status</h1>
      <p style={styles.message}>{message}</p>
      <p style={styles.subtitle}>This page is a placeholder for run result / status from the treadmill.</p>
      <Link to="/" style={styles.button}>Back to home</Link>
      <Link to="/leaderboard" style={styles.link}>View leaderboard</Link>
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  main: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    textAlign: 'center',
  },
  title: {
    fontSize: '1.75rem',
    fontWeight: 700,
    margin: '0 0 0.5rem',
  },
  message: {
    fontSize: 1.125,
    margin: '0 0 1rem',
    maxWidth: 360,
  },
  subtitle: {
    color: '#8b949e',
    margin: '0 0 1.5rem',
    fontSize: 14,
  },
  button: {
    display: 'inline-block',
    padding: '12px 24px',
    backgroundColor: '#238636',
    color: '#fff',
    borderRadius: 8,
    fontWeight: 600,
    marginBottom: 12,
  },
  link: {
    color: '#58a6ff',
  },
};
