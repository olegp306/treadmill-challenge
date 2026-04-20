import type { CSSProperties, Ref, RefObject } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import type { Gender, RunTypeId } from '@treadmill-challenge/shared';
import { api } from '../api/client';
import { ArOzioViewport } from '../arOzio/ArOzioViewport';
import { ScreenContainer } from '../arOzio/ScreenContainer';
import { h, w } from '../arOzio/dimensions';
import type { LeaderboardEntry } from '../hooks/useLeaderboard';
import { getRunOption } from '../features/run-selection/runOptions';
import { FooterActionsRow } from '../ui/components/FooterActionsRow';
import { HeaderChrome } from '../ui/components/HeaderChrome';
import { Sheet } from '../ui/components/Sheet';
import { ui } from '../ui/tokens';

/** Стабильная высота списка: не больше 7 строк (top 7) на колонку. */
const MAX_LEADERBOARD_ROWS = 7;

/** Порядок карусели: 3 мужских зачёта, затем 3 женских (те же форматы). */
const CAROUSEL_ORDER: Array<{ runTypeId: RunTypeId; sex: Gender }> = [
  { runTypeId: 0, sex: 'male' },
  { runTypeId: 1, sex: 'male' },
  { runTypeId: 2, sex: 'male' },
  { runTypeId: 0, sex: 'female' },
  { runTypeId: 1, sex: 'female' },
  { runTypeId: 2, sex: 'female' },
];

const CAROUSEL_INTERVAL_MS = 6000;
const CAROUSEL_FADE_MS = 220;

function parseLeaderboardScope(searchParams: URLSearchParams): { runTypeId: RunTypeId; sex: Gender } | null {
  const rt = searchParams.get('runTypeId');
  const g = searchParams.get('sex') ?? searchParams.get('gender');
  if (rt === null || rt === '' || g === null || g === '') return null;
  const n = Number(rt);
  if (n !== 0 && n !== 1 && n !== 2) return null;
  if (g !== 'male' && g !== 'female') return null;
  return { runTypeId: n as RunTypeId, sex: g };
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

function filterEntries(entries: LeaderboardEntry[], q: string): LeaderboardEntry[] {
  const t = q.trim().toLowerCase();
  if (!t) return entries;
  return entries.filter((e) => e.participantName.toLowerCase().includes(t));
}

type SlideState = {
  loading: boolean;
  error: string | null;
  entries: LeaderboardEntry[];
};

function emptySlide(): SlideState {
  return { loading: true, error: null, entries: [] };
}

export default function LeaderboardPage() {
  const [searchParams] = useSearchParams();
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [slides, setSlides] = useState<SlideState[]>(() =>
    Array.from({ length: 6 }, () => emptySlide())
  );
  const [searchQuery, setSearchQuery] = useState('');
  /** Подсветка только после успешного разрешения `?runSessionId=` (не из URL participant id). */
  const [highlightParticipantId, setHighlightParticipantId] = useState<string | undefined>(undefined);
  const [resolvedHighlightScope, setResolvedHighlightScope] = useState<{
    runTypeId: RunTypeId;
    sex: Gender;
  } | null>(null);
  /** Пауза автоповорота при открытии с runSessionId (чтобы остаться на зачёте участника). */
  const [pauseCarousel, setPauseCarousel] = useState(false);
  const [isCarouselFading, setIsCarouselFading] = useState(false);

  const highlightRef = useRef<HTMLDivElement | null>(null);
  const urlScopeSynced = useRef(false);
  const fadeTimerRef = useRef<number | null>(null);

  /** Загрузка шести зачётов одним батчем. */
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const settled = await Promise.allSettled(CAROUSEL_ORDER.map((scope) => api.getLeaderboard(scope)));
      if (cancelled) return;
      setSlides(
        settled.map((r) => {
          if (r.status === 'fulfilled') {
            return {
              loading: false,
              error: null,
              entries: r.value.leaderboard,
            };
          }
          const msg = r.reason instanceof Error ? r.reason.message : 'Ошибка загрузки';
          return { loading: false, error: msg, entries: [] };
        })
      );
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  /** Подсветка строго по `runSessionId`: участник и зачёт из API. */
  useEffect(() => {
    const raw = searchParams.get('runSessionId')?.trim();
    if (!raw) {
      setHighlightParticipantId(undefined);
      setResolvedHighlightScope(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const session = await api.getRunSessionState(raw);
        const participant = await api.getParticipant(session.participantId);
        if (cancelled) return;
        const idx = CAROUSEL_ORDER.findIndex(
          (s) => s.runTypeId === session.runTypeId && s.sex === participant.sex
        );
        if (idx >= 0) setCarouselIndex(idx);
        setHighlightParticipantId(session.participantId);
        setResolvedHighlightScope({ runTypeId: session.runTypeId, sex: participant.sex });
        setPauseCarousel(true);
      } catch {
        if (!cancelled) {
          setHighlightParticipantId(undefined);
          setResolvedHighlightScope(null);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [searchParams]);

  /** Опционально: стартовый слайд из `?runTypeId=&sex=` без runSessionId (один раз). */
  useEffect(() => {
    if (urlScopeSynced.current) return;
    if (searchParams.get('runSessionId')) return;
    const scope = parseLeaderboardScope(searchParams);
    if (!scope) return;
    const idx = CAROUSEL_ORDER.findIndex(
      (s) => s.runTypeId === scope.runTypeId && s.sex === scope.sex
    );
    if (idx >= 0) {
      setCarouselIndex(idx);
      urlScopeSynced.current = true;
    }
  }, [searchParams]);

  const switchCarouselWithFade = useCallback((nextIndex: number) => {
    if (nextIndex === carouselIndex) return;
    if (fadeTimerRef.current !== null) {
      window.clearTimeout(fadeTimerRef.current);
      fadeTimerRef.current = null;
    }
    setIsCarouselFading(true);
    fadeTimerRef.current = window.setTimeout(() => {
      setCarouselIndex(nextIndex);
      setIsCarouselFading(false);
      fadeTimerRef.current = null;
    }, CAROUSEL_FADE_MS);
  }, [carouselIndex]);

  useEffect(() => {
    return () => {
      if (fadeTimerRef.current !== null) {
        window.clearTimeout(fadeTimerRef.current);
        fadeTimerRef.current = null;
      }
    };
  }, []);

  const leftIdx = (carouselIndex + 5) % 6;
  const centerIdx = carouselIndex;
  const rightIdx = (carouselIndex + 1) % 6;

  const centerScope = CAROUSEL_ORDER[centerIdx];

  const showHighlight =
    highlightParticipantId !== undefined &&
    resolvedHighlightScope !== null &&
    centerScope.runTypeId === resolvedHighlightScope.runTypeId &&
    centerScope.sex === resolvedHighlightScope.sex;

  const centerEntriesRaw = slides[centerIdx]?.entries ?? [];
  const centerEntries = useMemo(
    () => filterEntries(centerEntriesRaw, searchQuery),
    [centerEntriesRaw, searchQuery]
  );

  const leftEntries = useMemo(
    () => filterEntries(slides[leftIdx]?.entries ?? [], searchQuery),
    [slides, leftIdx, searchQuery]
  );
  const rightEntries = useMemo(
    () => filterEntries(slides[rightIdx]?.entries ?? [], searchQuery),
    [slides, rightIdx, searchQuery]
  );

  useEffect(() => {
    if (!showHighlight || !highlightRef.current) return;
    const t = window.setTimeout(() => {
      highlightRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }, 160);
    return () => clearTimeout(t);
  }, [showHighlight, centerEntries, carouselIndex]);

  const shiftCarousel = useCallback((delta: -1 | 1) => {
    const next = (carouselIndex + delta + 6) % 6;
    switchCarouselWithFade(next);
    setPauseCarousel(false);
  }, [carouselIndex, switchCarouselWithFade]);

  const setGenderTab = useCallback((sex: Gender) => {
    const rt = centerScope.runTypeId;
    const idx = CAROUSEL_ORDER.findIndex((s) => s.runTypeId === rt && s.sex === sex);
    if (idx >= 0) {
      switchCarouselWithFade(idx);
      setPauseCarousel(false);
    }
  }, [centerScope.runTypeId, switchCarouselWithFade]);

  /** Автосмена тоже через fade, чтобы избежать резкого переключения. */
  useEffect(() => {
    if (pauseCarousel) return;
    const id = window.setInterval(() => {
      const next = (carouselIndex + 1) % 6;
      switchCarouselWithFade(next);
    }, CAROUSEL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [carouselIndex, pauseCarousel, switchCarouselWithFade]);

  const centerLoading = slides[centerIdx]?.loading ?? true;
  const centerError = slides[centerIdx]?.error ?? null;

  return (
    <ArOzioViewport>
      <ScreenContainer style={styles.page}>
        <Sheet style={styles.sheet}>
          <div style={styles.sheetInner}>
            <HeaderChrome
              style={styles.headerRow}
              logoStyle={styles.logoMark}
              right={
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
              }
            />

            <div style={styles.genderTabs}>
              <button
                type="button"
                style={{
                  ...styles.genderTab,
                  ...(centerScope.sex === 'female' ? styles.genderTabActive : styles.genderTabIdle),
                }}
                onClick={() => setGenderTab('female')}
              >
                Женщины
              </button>
              <button
                type="button"
                style={{
                  ...styles.genderTab,
                  ...(centerScope.sex === 'male' ? styles.genderTabActive : styles.genderTabIdle),
                }}
                onClick={() => setGenderTab('male')}
              >
                Мужчины
              </button>
            </div>

            <p style={styles.pageTitle}>Лидерборд</p>

            <div
              style={{
                ...styles.leaderboardRow,
                opacity: isCarouselFading ? 0.14 : 1,
                transition: `opacity ${CAROUSEL_FADE_MS}ms ease`,
              }}
            >
              <button
                type="button"
                aria-label="Предыдущий зачёт"
                style={{ ...styles.arrowBtn, left: w(8) }}
                onClick={() => shiftCarousel(-1)}
              >
                ‹
              </button>

              <aside
                style={{
                  ...styles.sideCol,
                  ...styles.colCarouselFlank,
                  pointerEvents: 'none',
                }}
                aria-hidden
              >
                <LeaderboardStack
                  entries={leftEntries}
                  runTypeId={CAROUSEL_ORDER[leftIdx].runTypeId}
                  scoped
                  highlightId={undefined}
                  highlightRef={null}
                  dim
                  loading={slides[leftIdx]?.loading}
                  error={slides[leftIdx]?.error}
                  emptyHint="Пока нет результатов в этом зачёте."
                />
              </aside>

              <section style={{ ...styles.mainCol, ...styles.colCarouselCenter }}>
                <LeaderboardStack
                  entries={centerEntries}
                  runTypeId={centerScope.runTypeId}
                  scoped
                  highlightId={showHighlight ? highlightParticipantId : undefined}
                  highlightRef={highlightRef}
                  dim={false}
                  loading={centerLoading}
                  error={centerError}
                  emptyHint="Пока нет результатов в этом зачёте."
                />
              </section>

              <aside
                style={{
                  ...styles.sideCol,
                  ...styles.colCarouselFlank,
                  pointerEvents: 'none',
                }}
                aria-hidden
              >
                <LeaderboardStack
                  entries={rightEntries}
                  runTypeId={CAROUSEL_ORDER[rightIdx].runTypeId}
                  scoped
                  highlightId={undefined}
                  highlightRef={null}
                  dim
                  loading={slides[rightIdx]?.loading}
                  error={slides[rightIdx]?.error}
                  emptyHint="Пока нет результатов в этом зачёте."
                />
              </aside>

              <button
                type="button"
                aria-label="Следующий зачёт"
                style={{ ...styles.arrowBtn, right: w(8) }}
                onClick={() => shiftCarousel(1)}
              >
                ›
              </button>
            </div>

            <FooterActionsRow style={styles.footerNav}>
              <Link to="/" style={styles.btnHomeFooter}>
                На главную
              </Link>
              <Link to="/register" replace style={styles.btnParticipate}>
                Принять участие
              </Link>
            </FooterActionsRow>
          </div>
        </Sheet>
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
  const rows = entries.slice(0, MAX_LEADERBOARD_ROWS);

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
        {!loading && !error && rows.length === 0 && !dim ? (
          <p style={styles.muted}>{emptyHint ?? 'Нет данных.'}</p>
        ) : null}
        {!loading && !error && rows.length > 0
          ? rows.map((e, i) => {
              const isHighlight = Boolean(highlightId) && e.participantId === highlightId;
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
                    <span style={styles.lbRank}>{e.rank ?? i + 1}</span>
                    <span style={styles.lbName}>{e.participantName}</span>
                    {isHighlight ? <span style={styles.lbYouBadge}>это ты</span> : null}
                  </div>
                  <span style={styles.lbResult}>{resultStr}</span>
                </div>
              );
            })
          : null}
        {!scoped && !loading && !error && rows.length > 0 ? (
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
    boxSizing: 'border-box',
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
    transform: 'translateY(calc(-50% - 10px))',
    width: w(100),
    height: w(100),
    borderRadius: w(48),
    border: 'none',
    background: ui.color.red,
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
  colCarouselFlank: {
    transform: 'scale(0.94) translateZ(0)',
    opacity: 0.92,
    transition: 'transform 0.45s ease, opacity 0.45s ease',
  },
  mainCol: {
    flex: '1 1 40%',
    minWidth: 0,
    maxWidth: w(980),
    zIndex: 2,
    alignSelf: 'stretch',
  },
  colCarouselCenter: {
    transform: 'scale(1) translateZ(0)',
    transition: 'transform 0.45s ease',
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
    background: ui.color.red,
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
    outline: `2px solid ${ui.color.red}`,
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
  lbYouBadge: {
    flexShrink: 0,
    marginLeft: w(12),
    padding: `${h(4)} ${w(12)}`,
    borderRadius: w(20),
    fontSize: w(16),
    lineHeight: 1,
    color: '#fff',
    background: ui.color.red,
    textTransform: 'uppercase',
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
    minHeight: h(132),
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#000',
    color: '#fff',
    fontWeight: 400,
    fontSize: w(42),
    lineHeight: 1,
    textTransform: 'uppercase',
    textDecoration: 'none',
    borderRadius: w(36),
    border: `1px solid ${ui.color.panelBorder}`,
    boxSizing: 'border-box',
  },
  btnParticipate: {
    flex: '1 1 0',
    minWidth: 0,
    minHeight: h(132),
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: ui.color.red,
    color: '#fff',
    fontWeight: 400,
    fontSize: w(42),
    lineHeight: 1,
    textTransform: 'uppercase',
    textDecoration: 'none',
    borderRadius: w(36),
    boxSizing: 'border-box',
  },
};
