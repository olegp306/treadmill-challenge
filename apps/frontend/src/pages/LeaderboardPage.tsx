import { Link } from 'react-router-dom';
import { useLeaderboard } from '../hooks/useLeaderboard';

export default function LeaderboardPage() {
  const { entries, loading, error } = useLeaderboard();

  return (
    <main style={styles.main}>
      <Link to="/" style={styles.back}>← Back</Link>
      <h1 style={styles.title}>Leaderboard</h1>
      <p style={styles.subtitle}>Top runs by result time.</p>

      {loading && <p style={styles.muted}>Loading…</p>}
      {error && <p style={styles.error}>{error}</p>}
      {!loading && !error && (
        <div style={styles.tableWrap}>
          {entries.length === 0 ? (
            <p style={styles.muted}>No runs yet. Be the first to complete a run!</p>
          ) : (
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>#</th>
                  <th style={styles.th}>Name</th>
                  <th style={styles.th}>Time (s)</th>
                  <th style={styles.th}>Distance (m)</th>
                  <th style={styles.th}>Speed</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((e, i) => (
                  <tr key={e.runId}>
                    <td style={styles.td}>{i + 1}</td>
                    <td style={styles.td}>{e.participantName}</td>
                    <td style={styles.td}>{e.resultTime.toFixed(1)}</td>
                    <td style={styles.td}>{e.distance.toFixed(1)}</td>
                    <td style={styles.td}>{e.speed.toFixed(1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  main: {
    minHeight: '100vh',
    padding: 24,
    maxWidth: 640,
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
  },
  tableWrap: {
    overflowX: 'auto',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  th: {
    textAlign: 'left',
    padding: '10px 12px',
    borderBottom: '1px solid #30363d',
    color: '#8b949e',
    fontWeight: 600,
    fontSize: 14,
  },
  td: {
    padding: '10px 12px',
    borderBottom: '1px solid #21262d',
  },
  muted: {
    color: '#8b949e',
  },
  error: {
    color: '#f85149',
  },
};
