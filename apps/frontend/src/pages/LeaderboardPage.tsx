import type { CSSProperties, Ref, RefObject } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import type { Gender, RunTypeId } from '@treadmill-challenge/shared';
import { ArOzioViewport } from '../arOzio/ArOzioViewport';
import { ScreenContainer } from '../arOzio/ScreenContainer';
import { h, w } from '../arOzio/dimensions';
import { useLeaderboard, type LeaderboardEntry, type LeaderboardScope } from '../hooks/useLeaderboard';
import { getRunOption } from '../features/run-selection/runOptions';

const RUN_TYPE_ORDER: RunTypeId[] = [0, 1, 2];

function parseLeaderboardScope(searchParams: URLSearchParams): LeaderboardScope | null {
  const rt = searchParams.get('runTypeId');
  const g = searchParams.get('gender');
  if (rt === null || rt === '' || g === null || g === '') return null;
  const n = Number(rt);
  if (n !== 0 && n !== 1 && n !== 2) return null;
  if (g !== 'male' && g !== 'female') return null;
  return { runTypeId: n as RunTypeId, gender: g };
}

/** Match Figma: MM:SS */
function formatTimeMmSs(sec: number): string {
  const t = Math.round(sec);
  const m = Math.floor(t / 60);
  const s = t % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function primaryMetric(entry: LeaderboardEntry, runTypeId: RunTypeId): string {
  if (runTypeId === 0) return `${Math.round(entry.distance)} м`;
  return formatTimeMmSs(entry.resultTime);
}

function globalMetric(entry: LeaderboardEntry): string {
  return `${formatTimeMmSs(entry.resultTime)} · ${Math.round(entry.distance)} м`;
}

export default function LeaderboardPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const scope = useMemo(() => parseLeaderboardScope(searchParams), [searchParams]);
  const highlightId = searchParams.get('highlightParticipantId') ?? undefined;
  const { entries, meta, loading, error } = useLeaderboard(scope);
  const [searchQuery, setSearchQuery] = useState('');

  const effectiveRunTypeId: RunTypeId = scope?.runTypeId ?? 2;

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return entries;
    return entries.filter((e) => e.participantName.toLowerCase().includes(q));
  }, [entries, searchQuery]);

  const highlightRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!highlightId || !highlightRef.current) return;
    const t = window.setTimeout(() => {
      highlightRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }, 120);
    return () => clearTimeout(t);
  }, [highlightId, filtered, loading]);

  const subtitle = scope
    ? meta?.competitionTitle ?? 'Текущее соревнование'
    : 'Все активные соревнования · общий рейтинг';

  const setGender = (g: Gender) => {
    if (scope) {
      setSearchParams({ runTypeId: String(scope.runTypeId), gender: g });
    } else {
      setSearchParams({ runTypeId: '2', gender: g });
    }
  };

  const shiftRunType = (delta: -1 | 1) => {
    const idx = RUN_TYPE_ORDER.indexOf(effectiveRunTypeId);
    const next = RUN_TYPE_ORDER[(idx + delta + RUN_TYPE_ORDER.length) % RUN_TYPE_ORDER.length];
    const g = scope?.gender ?? 'male';
    setSearchParams({ runTypeId: String(next), gender: g });
  };

  const showSideColumns = Boolean(scope) && !loading;

  return (
    <ArOzioViewport>
      <ScreenContainer style={styles.page}>
        <div style={styles.sheet}>
          <div style={styles.sheetInner}>
            <header style={styles.headerRow}>
              <p style={styles.logoMark} aria-label="AMAZING RED">
                <span style={styles.logoAmazing}>AMAZING</span>
                <span style={styles.logoRed}>RED</span>
              </p>
              <div style={styles.headerRight}>
                <label style={styles.searchBar}>
                  <span style={styles.searchIcon} aria-hidden>
                    ⌕
                  </span>
                  <input
                    type="search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Поиск"
                    style={styles.searchInput}
                    autoComplete="off"
                  />
                </label>
                <Link to="/" style={styles.btnHome}>
                  На главную
                </Link>
              </div>
            </header>

            <div style={styles.genderTabs}>
              <button
                type="button"
                style={{
                  ...styles.genderTab,
                  ...(scope?.gender === 'female' ? styles.genderTabActive : styles.genderTabIdle),
                }}
                onClick={() => setGender('female')}
              >
                Женщины
              </button>
              <button
                type="button"
                style={{
                  ...styles.genderTab,
                  ...(scope?.gender === 'male' ? styles.genderTabActive : styles.genderTabIdle),
                }}
                onClick={() => setGender('male')}
              >
                Мужчины
              </button>
            </div>

            {!scope ? (
              <>
                <p style={styles.pageTitle}>Лидерборд</p>
                <p style={styles.pageSubtitle}>{subtitle}</p>
              </>
            ) : (
              <p style={styles.pageSubtitleScoped}>{subtitle}</p>
            )}

            <div style={styles.leaderboardRow}>
              <button
                type="button"
                aria-label="Предыдущий формат"
                style={{ ...styles.arrowBtn, left: w(8) }}
                onClick={() => shiftRunType(-1)}
              >
                ‹
              </button>

              {showSideColumns ? (
                <aside style={{ ...styles.sideCol, pointerEvents: 'none' }} aria-hidden>
                  <LeaderboardStack
                    entries={filtered}
                    runTypeId={scope!.runTypeId}
                    scoped
                    highlightId={undefined}
                    highlightRef={null}
                    dim
                  />
                </aside>
              ) : null}

              <section style={styles.mainCol}>
                <LeaderboardStack
                  entries={filtered}
                  runTypeId={scope?.runTypeId ?? 2}
                  scoped={Boolean(scope)}
                  highlightId={highlightId}
                  highlightRef={highlightRef}
                  dim={false}
                  loading={loading}
                  error={error}
                  emptyHint={!scope ? 'Пока нет заездов.' : 'Пока нет результатов в этом зачёте.'}
                />
              </section>

              {showSideColumns ? (
                <aside style={{ ...styles.sideCol, pointerEvents: 'none' }} aria-hidden>
                  <LeaderboardStack
                    entries={filtered}
                    runTypeId={scope!.runTypeId}
                    scoped
                    highlightId={undefined}
                    highlightRef={null}
                    dim
                  />
                </aside>
              ) : null}

              <button
                type="button"
                aria-label="Следующий формат"
                style={{ ...styles.arrowBtn, right: w(8) }}
                onClick={() => shiftRunType(1)}
              >
                ›
              </button>
            </div>

            <nav style={styles.footerNav} aria-label="Действия">
              <Link to="/" style={styles.btnHomeFooter}>
                На главную
              </Link>
              <Link to="/start" style={styles.btnParticipate}>
                Принять участие
              </Link>
            </nav>
          </div>
        </div>
      </ScreenContainer>
    </ArOzioViewport>
  );
}

function LeaderboardStack({
  entries,
  runTypeId,
  scoped,
  highlightId,
  highlightRef,
  dim,
  loading,
  error,
  emptyHint,
}: {
  entries: LeaderboardEntry[];
  runTypeId: RunTypeId;
  scoped: boolean;
  highlightId?: string;
  highlightRef: RefObject<HTMLDivElement | null> | null;
  dim: boolean;
  loading?: boolean;
  error?: string | null;
  emptyHint?: string;
}) {
  const title = getRunOption(runTypeId).title.toUpperCase();

  return (
    <div
      style={{
        ...styles.stackCard,
        ...(dim ? styles.stackDim : {}),
        ...(dim ? {} : styles.stackCardMain),
      }}
    >
      <div style={styles.stackHeaderBar}>
        <p style={styles.stackHeaderText}>{title}</p>
      </div>
      <div style={styles.stackBody}>
        {loading ? <p style={styles.muted}>Загрузка…</p> : null}
        {!loading && error ? <p style={styles.err}>{error}</p> : null}
        {!loading && !error && entries.length === 0 && !dim ? (
          <p style={styles.muted}>{emptyHint ?? 'Нет данных.'}</p>
        ) : null}
        {!loading && !error && entries.length > 0
          ? entries.map((e, i) => {
              const isHighlight = highlightId !== undefined && e.participantId === highlightId;
              const rowRef = isHighlight && highlightRef ? highlightRef : undefined;
              const top3 = i < 3;
              const resultStr = scoped ? primaryMetric(e, runTypeId) : globalMetric(e);
              return (
                <div
                  key={e.runId}
                  ref={rowRef as Ref<HTMLDivElement> | undefined}
                  style={{
                    ...styles.lbRow,
                    ...(top3 ? styles.lbRowTop : {}),
                    ...(isHighlight ? styles.lbRowHighlight : {}),
                  }}
                >
                  <div style={styles.lbRowLeft}>
                    <span style={styles.lbRank}>{i + 1}</span>
                    <span style={styles.lbName}>{e.participantName}</span>
                  </div>
                  <span style={styles.lbResult}>{resultStr}</span>
                </div>
              );
            })
          : null}
        {!scoped && !loading && !error && entries.length > 0 ? (
          <p style={styles.mutedSmall}>Время · дистанция · все форматы</p>
        ) : null}
      </div>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  page: {
    gap: h(12),
    justifyContent: 'flex-start',
    minHeight: '100%',
  },
  sheet: {
    flex: 1,
    minHeight: 0,
    width: '100%',
    borderRadius: w(48),
    background: '#080809',
    border: '1px solid #1e1e1e',
    boxSizing: 'border-box',
    overflow: 'hidden',
    position: 'relative',
  },
  sheetInner: {
    position: 'relative',
    zIndex: 1,
    padding: `${h(32)} ${w(40)} ${h(28)}`,
    display: 'flex',
    flexDirection: 'column',
    gap: h(24),
    minHeight: '100%',
    boxSizing: 'border-box',
  },
  headerRow: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: w(24),
    flexWrap: 'wrap',
  },
  logoMark: {
    margin: 0,
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
  headerRight: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    gap: w(32),
    flexWrap: 'wrap',
  },
  searchBar: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    gap: w(16),
    minHeight: h(72),
    padding: `${h(16)} ${w(20)}`,
    borderRadius: w(32),
    border: '1px solid rgba(255,255,255,0.2)',
    boxSizing: 'border-box',
    minWidth: w(400),
  },
  searchIcon: {
    fontSize: w(32),
    color: 'rgba(255,255,255,0.85)',
    lineHeight: 1,
  },
  searchInput: {
    flex: 1,
    minWidth: 0,
    background: 'transparent',
    border: 'none',
    outline: 'none',
    color: '#fff',
    fontSize: w(22),
    textTransform: 'uppercase',
    letterSpacing: '0.02em',
  },
  btnHome: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: h(72),
    padding: `${h(18)} ${w(50)}`,
    borderRadius: w(80),
    border: '1px solid rgba(255,255,255,0.3)',
    color: '#fff',
    fontSize: w(22),
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    textDecoration: 'none',
    fontWeight: 400,
  },
  genderTabs: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'stretch',
    maxWidth: w(1200),
    margin: '0 auto',
    width: '100%',
    minHeight: h(88),
    borderRadius: w(34),
    background: '#262626',
    padding: w(10),
    boxSizing: 'border-box',
    gap: w(8),
  },
  genderTab: {
    flex: 1,
    border: 'none',
    cursor: 'pointer',
    borderRadius: w(28),
    fontSize: w(28),
    textTransform: 'uppercase',
    fontWeight: 400,
  },
  genderTabActive: {
    background: '#fff',
    color: '#333',
  },
  genderTabIdle: {
    background: 'transparent',
    color: 'rgba(255,255,255,0.6)',
  },
  pageTitle: {
    margin: 0,
    textAlign: 'center',
    fontSize: w(52),
    lineHeight: 1.1,
    textTransform: 'uppercase',
    color: '#fff',
    fontWeight: 400,
  },
  pageSubtitle: {
    margin: 0,
    textAlign: 'center',
    fontSize: w(24),
    color: '#8b949e',
  },
  pageSubtitleScoped: {
    margin: 0,
    textAlign: 'center',
    fontSize: w(22),
    color: '#6e7681',
  },
  leaderboardRow: {
    position: 'relative',
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'stretch',
    justifyContent: 'center',
    gap: w(16),
    flex: 1,
    minHeight: h(400),
    paddingLeft: w(100),
    paddingRight: w(100),
    boxSizing: 'border-box',
  },
  arrowBtn: {
    position: 'absolute' as const,
    top: '50%',
    transform: 'translateY(-50%)',
    width: w(100),
    height: w(100),
    borderRadius: w(48),
    border: 'none',
    background: '#e6233a',
    color: '#fff',
    fontSize: w(56),
    lineHeight: 1,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 4,
  },
  sideCol: {
    flex: '0 1 26%',
    minWidth: 0,
    maxWidth: w(480),
    alignSelf: 'stretch',
  },
  mainCol: {
    flex: '1 1 40%',
    minWidth: 0,
    maxWidth: w(980),
    zIndex: 2,
    alignSelf: 'stretch',
  },
  stackCard: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    maxHeight: h(900),
    borderRadius: w(36),
    borderTop: '2px solid rgba(255,255,255,0.9)',
    background: 'linear-gradient(180deg, #000000 0%, #181818 100%)',
    boxSizing: 'border-box',
    overflow: 'hidden',
  },
  stackCardMain: {
    border: '1px solid rgba(255, 100, 119, 0.6)',
    boxShadow: '0 0 0 1px rgba(230, 35, 58, 0.45)',
  },
  stackDim: {
    opacity: 0.35,
    filter: 'blur(0.3px)',
    maxHeight: h(820),
  },
  stackHeaderBar: {
    background: '#e6233a',
    padding: `${h(18)} ${w(16)}`,
    flexShrink: 0,
  },
  stackHeaderText: {
    margin: 0,
    textAlign: 'center',
    fontSize: w(30),
    color: '#fff',
    textTransform: 'uppercase',
    fontWeight: 400,
  },
  stackBody: {
    flex: 1,
    minHeight: 0,
    overflowY: 'auto',
    padding: `${h(20)} ${w(22)} ${h(24)}`,
    display: 'flex',
    flexDirection: 'column',
    gap: h(14),
    WebkitOverflowScrolling: 'touch',
  },
  lbRow: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: w(20),
    padding: `${h(14)} ${w(14)}`,
    borderRadius: w(22),
    color: '#fff',
    textTransform: 'uppercase',
    fontSize: w(24),
  },
  lbRowTop: {
    background: 'rgba(255,255,255,0.11)',
  },
  lbRowHighlight: {
    background: 'rgba(230, 35, 58, 0.35)',
    outline: '2px solid #e6233a',
    outlineOffset: 0,
  },
  lbRowLeft: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    gap: w(24),
    minWidth: 0,
    flex: 1,
  },
  lbRank: {
    fontStyle: 'italic',
    fontWeight: 500,
    minWidth: w(48),
    color: '#fff',
  },
  lbName: {
    flex: 1,
    minWidth: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  lbResult: {
    fontWeight: 500,
    fontSize: w(28),
    textAlign: 'right',
    flexShrink: 0,
  },
  muted: {
    margin: 0,
    textAlign: 'center',
    color: '#8b949e',
    fontSize: w(24),
    textTransform: 'none',
  },
  mutedSmall: {
    margin: `${h(12)} 0 0`,
    textAlign: 'center',
    color: '#6e7681',
    fontSize: w(18),
    textTransform: 'none',
  },
  err: {
    margin: 0,
    textAlign: 'center',
    color: '#f85149',
    fontSize: w(24),
  },
  footerNav: {
    display: 'flex',
    flexDirection: 'row',
    flexWrap: 'nowrap',
    gap: w(32),
    width: '100%',
    flexShrink: 0,
    marginTop: h(8),
  },
  btnHomeFooter: {
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
