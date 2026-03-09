import { Link } from 'react-router-dom';

export default function WelcomePage() {
  return (
    <main style={styles.main}>
      <h1 style={styles.title}>Treadmill Challenge</h1>
      <p style={styles.subtitle}>Ready to run? Register and see your name on the leaderboard.</p>
      <nav style={styles.nav}>
        <Link to="/register" style={styles.primaryButton}>
          Register now
        </Link>
        <Link to="/leaderboard" style={styles.secondaryButton}>
          View leaderboard
        </Link>
      </nav>
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
    fontSize: '2.5rem',
    fontWeight: 700,
    margin: '0 0 0.5rem',
  },
  subtitle: {
    fontSize: 1.125,
    color: '#8b949e',
    margin: '0 0 2rem',
    maxWidth: 360,
  },
  nav: {
    display: 'flex',
    gap: 16,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  primaryButton: {
    display: 'inline-block',
    padding: '12px 24px',
    backgroundColor: '#238636',
    color: '#fff',
    borderRadius: 8,
    fontWeight: 600,
  },
  secondaryButton: {
    display: 'inline-block',
    padding: '12px 24px',
    backgroundColor: 'transparent',
    color: '#58a6ff',
    border: '1px solid #30363d',
    borderRadius: 8,
    fontWeight: 600,
  },
};
