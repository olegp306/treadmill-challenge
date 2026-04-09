import { Link } from 'react-router-dom';
import { ArOzioViewport } from '../arOzio/ArOzioViewport';
import { h, w } from '../arOzio/dimensions';
import { useLeaderboard, type LeaderboardEntry } from '../hooks/useLeaderboard';

/** Figma: AR x OZIO — iPad, лидерборд (971:3200); aligned with Main.tsx visuals */
function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec - m * 60;
  const sStr = s < 10 ? `0${s.toFixed(1)}` : s.toFixed(1);
  return `${m}:${sStr}`;
}

function rankLabel(i: number): string {
  return String(i + 1).padStart(2, '0');
}

export default function LeaderboardPage() {
  const { entries, loading, error } = useLeaderboard();
  const top3 = entries.slice(0, 3);
  const rest = entries.slice(3);

  return (
    <ArOzioViewport>
      <div style={styles.page}>
        <header style={styles.header}>
          <Link to="/" style={styles.back}>
            ← Назад
          </Link>
          <p style={styles.logoMark} aria-label="AMAZING RED">
            <span style={styles.logoAmazing}>AMAZING</span>
            <span style={styles.logoRed}>RED</span>
          </p>
          <div style={styles.headerSpacer} aria-hidden />
        </header>

        <h1 style={styles.title}>Лидерборд</h1>
        <p style={styles.subtitle}>Лучшие результаты по времени</p>

        <section style={styles.sheet} aria-label="Таблица лидеров">
          {loading && <p style={styles.muted}>Загрузка…</p>}
          {error && <p style={styles.error}>{error}</p>}
          {!loading && !error && entries.length === 0 && (
            <p style={styles.muted}>Пока нет заездов. Станьте первым!</p>
          )}
          {!loading && !error && entries.length > 0 && (
            <>
              <div style={styles.topRow}>
                {top3.map((e, i) => (
                  <PodiumCard key={e.runId} entry={e} rank={i} highlight={i === 0} />
                ))}
              </div>
              {rest.length > 0 && (
                <div className="ar-ozio-lb-list" style={styles.list}>
                  {rest.map((e, i) => (
                    <ListRow key={e.runId} entry={e} index={i + 3} />
                  ))}
                </div>
              )}
            </>
          )}
        </section>

        <nav style={styles.footerNav} aria-label="Действия">
          <Link to="/" style={styles.btnHome}>
            На главную
          </Link>
          <Link to="/start" style={styles.btnParticipate}>
            Принять участие
          </Link>
        </nav>
      </div>
    </ArOzioViewport>
  );
}

function PodiumCard({
  entry,
  rank,
  highlight,
}: {
  entry: LeaderboardEntry;
  rank: number;
  highlight: boolean;
}) {
  return (
    <article
      style={{
        ...styles.podiumCard,
        ...(highlight ? styles.podiumCardFirst : styles.podiumCardOther),
      }}
    >
      <div style={styles.podiumTop}>
        <span style={styles.podiumRank}>{rankLabel(rank)}</span>
        <span
          style={{
            ...styles.podiumBadge,
            ...(highlight ? styles.podiumBadgeHighlight : styles.podiumBadgeMuted),
          }}
        >
          {formatTime(entry.resultTime)}
        </span>
      </div>
      <p style={styles.podiumName}>{entry.participantName}</p>
      <div style={styles.podiumStats}>
        <span style={styles.podiumStat}>{entry.distance.toFixed(0)} м</span>
        <span style={styles.podiumStatDot}>·</span>
        <span style={styles.podiumStat}>{entry.speed.toFixed(1)}</span>
      </div>
    </article>
  );
}

function ListRow({ entry, index }: { entry: LeaderboardEntry; index: number }) {
  return (
    <div style={styles.listRow}>
      <span style={styles.listRank}>{rankLabel(index)}</span>
      <div style={styles.listMain}>
        <span style={styles.listName}>{entry.participantName}</span>
        <span style={styles.listMeta}>
          {formatTime(entry.resultTime)} · {entry.distance.toFixed(0)} м · {entry.speed.toFixed(1)}
        </span>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    width: '100%',
    height: '100%',
    flex: 1,
    minHeight: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: h(16),
    paddingLeft: w(120),
    paddingRight: w(120),
    paddingTop: h(12),
    paddingBottom: h(12),
    boxSizing: 'border-box',
  },
  header: {
    display: 'grid',
    gridTemplateColumns: `${w(140)} 1fr ${w(140)}`,
    alignItems: 'center',
    flexShrink: 0,
  },
  back: {
    justifySelf: 'start',
    color: '#8b949e',
    fontSize: w(24),
    textDecoration: 'none',
    textTransform: 'none',
  },
  logoMark: {
    margin: 0,
    justifySelf: 'center',
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: '0.28em',
    fontSize: w(37),
    lineHeight: 1,
    letterSpacing: '0.02em',
    textTransform: 'uppercase',
    fontWeight: 400,
  },
  logoAmazing: { color: '#ffffff' },
  logoRed: { color: '#e6233a' },
  headerSpacer: { width: w(140) },
  title: {
    margin: 0,
    textAlign: 'center',
    fontWeight: 400,
    fontSize: w(72),
    lineHeight: 1.05,
    textTransform: 'uppercase',
    color: '#fff',
  },
  subtitle: {
    margin: 0,
    textAlign: 'center',
    fontSize: w(28),
    color: '#8b949e',
    textTransform: 'none',
  },
  sheet: {
    flex: 1,
    minHeight: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: h(24),
    borderRadius: w(48),
    background: '#080809',
    border: '1px solid #1e1e1e',
    boxShadow: 'inset 0 -120px 120px -160px #e6233a',
    padding: `${h(32)} ${w(40)}`,
    boxSizing: 'border-box',
    overflow: 'hidden',
  },
  muted: {
    margin: 0,
    textAlign: 'center',
    color: '#8b949e',
    fontSize: w(28),
    textTransform: 'none',
  },
  error: {
    margin: 0,
    textAlign: 'center',
    color: '#f85149',
    fontSize: w(28),
    textTransform: 'none',
  },
  topRow: {
    display: 'flex',
    flexDirection: 'row',
    flexWrap: 'nowrap',
    gap: w(24),
    justifyContent: 'center',
    flexShrink: 0,
  },
  podiumCard: {
    flex: '1 1 0',
    minWidth: 0,
    maxWidth: w(520),
    minHeight: h(220),
    borderRadius: w(40),
    padding: w(24),
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    boxSizing: 'border-box',
  },
  podiumCardFirst: {
    backgroundColor: '#e6233a',
  },
  podiumCardOther: {
    backgroundColor: '#1e1e1e',
  },
  podiumTop: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    gap: w(10),
    width: '100%',
  },
  podiumRank: {
    flex: '1 0 auto',
    fontWeight: 400,
    fontSize: w(36),
    lineHeight: 1,
    textTransform: 'uppercase',
    color: '#fff',
  },
  podiumBadge: {
    fontWeight: 400,
    fontSize: w(20),
    lineHeight: 1.2,
    textTransform: 'uppercase',
    color: '#fff',
    padding: `${h(10)} ${w(12)}`,
    borderRadius: w(16),
    whiteSpace: 'nowrap',
  },
  podiumBadgeHighlight: {
    backgroundColor: '#b02838',
  },
  podiumBadgeMuted: {
    backgroundColor: '#141414',
  },
  podiumName: {
    margin: `${h(12)} 0 0`,
    fontWeight: 400,
    fontSize: w(32),
    lineHeight: 1.15,
    textTransform: 'uppercase',
    color: '#fff',
  },
  podiumStats: {
    marginTop: h(8),
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    gap: w(8),
    fontSize: w(22),
    color: 'rgba(255,255,255,0.85)',
    textTransform: 'uppercase',
  },
  podiumStat: {},
  podiumStatDot: { opacity: 0.5 },
  list: {
    flex: 1,
    minHeight: 0,
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: h(12),
    WebkitOverflowScrolling: 'touch',
  },
  listRow: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    gap: w(20),
    padding: `${h(16)} ${w(20)}`,
    borderRadius: w(24),
    background: '#1e1e1e',
    border: '1px solid #30363d',
    boxSizing: 'border-box',
  },
  listRank: {
    fontWeight: 400,
    fontSize: w(28),
    color: '#e6233a',
    minWidth: w(48),
    textTransform: 'uppercase',
  },
  listMain: {
    flex: 1,
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: h(4),
  },
  listName: {
    fontWeight: 400,
    fontSize: w(26),
    textTransform: 'uppercase',
    color: '#fff',
  },
  listMeta: {
    fontSize: w(20),
    color: '#8b949e',
    textTransform: 'none',
  },
  footerNav: {
    display: 'flex',
    flexDirection: 'row',
    flexWrap: 'nowrap',
    gap: w(32),
    width: '100%',
    flexShrink: 0,
  },
  btnHome: {
    flex: '1 1 0',
    minWidth: 0,
    minHeight: h(100),
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#000',
    color: '#fff',
    fontWeight: 400,
    fontSize: w(36),
    lineHeight: 1,
    textTransform: 'uppercase',
    textDecoration: 'none',
    borderRadius: w(36),
    border: '1px solid #1e1e1e',
    boxSizing: 'border-box',
  },
  btnParticipate: {
    flex: '1 1 0',
    minWidth: 0,
    minHeight: h(100),
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#e6233a',
    color: '#fff',
    fontWeight: 400,
    fontSize: w(36),
    lineHeight: 1,
    textTransform: 'uppercase',
    textDecoration: 'none',
    borderRadius: w(36),
    boxSizing: 'border-box',
  },
};
