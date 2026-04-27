import type { CSSProperties, Ref, RefObject } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import type { Gender, RunTypeId } from '@treadmill-challenge/shared';
import { api } from '../api/client';
import { ArOzioViewport } from '../arOzio/ArOzioViewport';
import { ScreenContainer } from '../arOzio/ScreenContainer';
import { h, w } from '../arOzio/dimensions';
import type { LeaderboardEntry } from '../hooks/useLeaderboard';
import { getRunOption } from '../features/run-selection/runOptions';
import { td } from '../features/td/tdTokens';
import { HeaderChrome } from '../ui/components/HeaderChrome';
import { Sheet } from '../ui/components/Sheet';
import { ui } from '../ui/tokens';
import { formatRunResult, formatTimeResultMmSs } from '../utils/runResultFormat';

/** Стабильная высота фоновых колонок: до 10 строк. */
const MAX_LEADERBOARD_ROWS = 10;

/** Загрузка данных: 3 мужских зачёта + 3 женских (индексы 0–2 и 3–5). Отображение: всегда один пол + три формата. */
const CAROUSEL_ORDER: Array<{ runTypeId: RunTypeId; sex: Gender }> = [
  { runTypeId: 0, sex: 'male' },
  { runTypeId: 1, sex: 'male' },
  { runTypeId: 2, sex: 'male' },
  { runTypeId: 0, sex: 'female' },
  { runTypeId: 1, sex: 'female' },
  { runTypeId: 2, sex: 'female' },
];

function slideIndexFor(runTypeId: RunTypeId, sex: Gender): number {
  return sex === 'male' ? runTypeId : runTypeId + 3;
}

const CAROUSEL_FADE_MS = 220;
/** Figma node 939:1141 — Outline/Arrow Right 2; для «назад» используем отражение по X. */
const FIGMA_ARROW_NEXT_ICON = 'https://www.figma.com/api/mcp/asset/a31f25a5-7712-41cb-aa93-c859c2f56928';

function parseLeaderboardScope(searchParams: URLSearchParams): { runTypeId: RunTypeId; sex: Gender } | null {
  const rt = searchParams.get('runTypeId');
  const g = searchParams.get('sex') ?? searchParams.get('gender');
  if (rt === null || rt === '' || g === null || g === '') return null;
  const n = Number(rt);
  if (n !== 0 && n !== 1 && n !== 2) return null;
  if (g !== 'male' && g !== 'female') return null;
  return { runTypeId: n as RunTypeId, sex: g };
}

function primaryMetric(entry: LeaderboardEntry, runTypeId: RunTypeId): string {
  return formatRunResult(runTypeId, entry.resultTime, entry.distance);
}

function globalMetric(entry: LeaderboardEntry): string {
  return `${formatTimeResultMmSs(entry.resultTime)} · ${Math.round(entry.distance)} м`;
}

type SlideState = {
  loading: boolean;
  error: string | null;
  entries: LeaderboardEntry[];
};

type NameSearchMatch = { runTypeId: RunTypeId; sex: Gender; participantId: string; runId: string };

/** Точное совпадение полной строки имени (после trim). */
function collectExactNameMatches(slides: SlideState[], needle: string): NameSearchMatch[] {
  const t = needle.trim();
  if (t.length < 3) return [];
  const out: NameSearchMatch[] = [];
  CAROUSEL_ORDER.forEach((scope, slideIdx) => {
    const entries = slides[slideIdx]?.entries ?? [];
    for (const e of entries) {
      if (e.participantName.trim() === t) {
        out.push({
          runTypeId: scope.runTypeId,
          sex: scope.sex,
          participantId: e.participantId,
          runId: e.runId,
        });
      }
    }
  });
  return out;
}

function emptySlide(): SlideState {
  return { loading: true, error: null, entries: [] };
}

export default function LeaderboardPage() {
  const [searchParams] = useSearchParams();
  /** Какой формат забега (0/1/2) в центре; левый/правый — соседи по кругу среди трёх форматов. */
  const [carouselIndex, setCarouselIndex] = useState(0);
  /** Все три лидерборда показывают зачёты только этого пола. */
  const [selectedSex, setSelectedSex] = useState<Gender>('male');
  const [slides, setSlides] = useState<SlideState[]>(() =>
    Array.from({ length: 6 }, () => emptySlide())
  );
  const [searchInputDraft, setSearchInputDraft] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [nameSearchMatches, setNameSearchMatches] = useState<NameSearchMatch[]>([]);
  const [nameSearchMatchIndex, setNameSearchMatchIndex] = useState(0);
  /** Подсветка только после успешного разрешения `?runSessionId=` (не из URL participant id). */
  const [highlightParticipantId, setHighlightParticipantId] = useState<string | undefined>(undefined);
  const [resolvedHighlightScope, setResolvedHighlightScope] = useState<{
    runTypeId: RunTypeId;
    sex: Gender;
  } | null>(null);
  /** Подсветка строки после поиска по имени (кнопка «Найти»). */
  const [searchHighlightParticipantId, setSearchHighlightParticipantId] = useState<string | undefined>(
    undefined
  );
  const [searchHighlightRunId, setSearchHighlightRunId] = useState<string | undefined>(undefined);
  const [searchHighlightScope, setSearchHighlightScope] = useState<{
    runTypeId: RunTypeId;
    sex: Gender;
  } | null>(null);
  const [isCarouselFading, setIsCarouselFading] = useState(false);

  const highlightRef = useRef<HTMLDivElement | null>(null);
  const searchRowRef = useRef<HTMLDivElement | null>(null);
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
    setNameSearchMatches([]);
    setSearchHighlightParticipantId(undefined);
    setSearchHighlightRunId(undefined);
    setSearchHighlightScope(null);
    let cancelled = false;
    void (async () => {
      try {
        const session = await api.getRunSessionState(raw);
        const participant = await api.getParticipant(session.participantId);
        if (cancelled) return;
        setSelectedSex(participant.sex);
        setCarouselIndex(session.runTypeId);
        setHighlightParticipantId(session.participantId);
        setResolvedHighlightScope({ runTypeId: session.runTypeId, sex: participant.sex });
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
    setSelectedSex(scope.sex);
    setCarouselIndex(scope.runTypeId);
    urlScopeSynced.current = true;
  }, [searchParams]);

  const switchCarouselWithFade = useCallback((nextIndex: number) => {
    const normalized = ((nextIndex % 3) + 3) % 3;
    if (normalized === carouselIndex) return;
    if (fadeTimerRef.current !== null) {
      window.clearTimeout(fadeTimerRef.current);
      fadeTimerRef.current = null;
    }
    setIsCarouselFading(true);
    fadeTimerRef.current = window.setTimeout(() => {
      setCarouselIndex(normalized);
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

  useEffect(() => {
    if (searchInputDraft.trim().length >= 3) return;
    setNameSearchMatches([]);
    setNameSearchMatchIndex(0);
    setSearchHighlightParticipantId(undefined);
    setSearchHighlightRunId(undefined);
    setSearchHighlightScope(null);
  }, [searchInputDraft]);

  const leftRunType = ((carouselIndex + 2) % 3) as RunTypeId;
  const centerRunType = carouselIndex as RunTypeId;
  const rightRunType = ((carouselIndex + 1) % 3) as RunTypeId;

  const leftIdx = slideIndexFor(leftRunType, selectedSex);
  const centerIdx = slideIndexFor(centerRunType, selectedSex);
  const rightIdx = slideIndexFor(rightRunType, selectedSex);

  const centerScope = { runTypeId: centerRunType, sex: selectedSex };

  const urlHighlightVisible =
    highlightParticipantId !== undefined &&
    resolvedHighlightScope !== null &&
    centerScope.runTypeId === resolvedHighlightScope.runTypeId &&
    centerScope.sex === resolvedHighlightScope.sex;

  const searchHighlightVisible =
    searchHighlightParticipantId !== undefined &&
    searchHighlightScope !== null &&
    centerScope.runTypeId === searchHighlightScope.runTypeId &&
    centerScope.sex === searchHighlightScope.sex;

  const showHighlight = urlHighlightVisible || searchHighlightVisible;
  const activeHighlightParticipantId = urlHighlightVisible
    ? highlightParticipantId
    : searchHighlightVisible
      ? searchHighlightParticipantId
      : undefined;
  const activeHighlightRunId = searchHighlightVisible ? searchHighlightRunId : undefined;

  const centerEntries = slides[centerIdx]?.entries ?? [];
  const leftEntries = slides[leftIdx]?.entries ?? [];
  const rightEntries = slides[rightIdx]?.entries ?? [];

  const applyNameSearchMatch = useCallback((m: NameSearchMatch) => {
    setSelectedSex(m.sex);
    setCarouselIndex(m.runTypeId);
    setSearchHighlightParticipantId(m.participantId);
    setSearchHighlightRunId(m.runId);
    setSearchHighlightScope({ runTypeId: m.runTypeId, sex: m.sex });
  }, []);

  const runNameSearch = useCallback(() => {
    const q = searchInputDraft.trim();
    if (q.length < 3) return;
    const matches = collectExactNameMatches(slides, q);
    setNameSearchMatches(matches);
    if (matches.length === 0) {
      setNameSearchMatchIndex(0);
      setSearchHighlightParticipantId(undefined);
      setSearchHighlightRunId(undefined);
      setSearchHighlightScope(null);
      return;
    }
    setNameSearchMatchIndex(0);
    applyNameSearchMatch(matches[0]!);
  }, [searchInputDraft, slides, applyNameSearchMatch]);

  const cycleNameSearchMatch = useCallback(
    (delta: -1 | 1) => {
      if (nameSearchMatches.length <= 1) return;
      const next = (nameSearchMatchIndex + delta + nameSearchMatches.length) % nameSearchMatches.length;
      setNameSearchMatchIndex(next);
      applyNameSearchMatch(nameSearchMatches[next]!);
    },
    [nameSearchMatches, nameSearchMatchIndex, applyNameSearchMatch]
  );

  useEffect(() => {
    if (!showHighlight || (!activeHighlightParticipantId && !activeHighlightRunId) || !highlightRef.current) return;
    const t = window.setTimeout(() => {
      highlightRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }, 160);
    return () => clearTimeout(t);
  }, [showHighlight, activeHighlightParticipantId, activeHighlightRunId, centerEntries, carouselIndex]);

  const shiftCarousel = useCallback((delta: -1 | 1) => {
    const next = (carouselIndex + delta + 3) % 3;
    switchCarouselWithFade(next);
  }, [carouselIndex, switchCarouselWithFade]);

  const setGenderTab = useCallback((sex: Gender) => {
    setSelectedSex(sex);
  }, []);

  const centerLoading = slides[centerIdx]?.loading ?? true;
  const centerError = slides[centerIdx]?.error ?? null;
  const isSearchExpanded = isSearchFocused || searchInputDraft.trim().length > 0;
  const showSearchFindButton = searchInputDraft.trim().length >= 3;
  const showSearchSwitchButtons = isSearchFocused && nameSearchMatches.length > 1;

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
                  <div
                    ref={searchRowRef}
                    style={{
                      ...styles.searchRow,
                      ...(isSearchExpanded ? styles.searchRowFocused : {}),
                    }}
                    onFocusCapture={() => setIsSearchFocused(true)}
                    onBlurCapture={(e) => {
                      const next = e.relatedTarget as Node | null;
                      if (next && searchRowRef.current?.contains(next)) return;
                      setIsSearchFocused(false);
                    }}
                  >
                    <label
                      style={{
                        ...styles.searchBar,
                        ...(isSearchExpanded ? styles.searchBarFocused : {}),
                        ...(isSearchFocused ? styles.searchBarActiveFocus : {}),
                      }}
                    >
                      <span style={styles.searchIcon} aria-hidden>
                        <svg
                          viewBox="0 0 24 24"
                          width="100%"
                          height="100%"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="2" />
                          <path d="M16 16L21 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                        </svg>
                      </span>
                      <input
                        type="text"
                        value={searchInputDraft}
                        onChange={(e) => setSearchInputDraft(e.target.value)}
                        placeholder={isSearchFocused ? 'Введите имя и фамилию полностью' : 'Поиск'}
                        style={{
                          ...styles.searchInput,
                          ...(showSearchSwitchButtons ? styles.searchInputWithSwitchButtons : {}),
                        }}
                        autoComplete="off"
                      />
                      {showSearchSwitchButtons ? (
                        <span style={styles.searchSwitchButtonsInInput}>
                          <button
                            type="button"
                            aria-label="Предыдущий найденный участник"
                            style={styles.searchSwitchBtnInInput}
                            onClick={() => cycleNameSearchMatch(-1)}
                          >
                            <span style={styles.searchSwitchIcon}>⌃</span>
                          </button>
                          <button
                            type="button"
                            aria-label="Следующий найденный участник"
                            style={styles.searchSwitchBtnInInput}
                            onClick={() => cycleNameSearchMatch(1)}
                          >
                            <span style={styles.searchSwitchIcon}>⌄</span>
                          </button>
                        </span>
                      ) : null}
                    </label>
                    <span
                      style={{
                        ...styles.searchFindBtnSlot,
                        ...(showSearchFindButton ? styles.searchFindBtnSlotVisible : styles.searchFindBtnSlotHidden),
                      }}
                      aria-hidden={!showSearchFindButton}
                    >
                      <button
                        type="button"
                        style={{
                          ...styles.searchFindBtn,
                          ...(showSearchFindButton ? styles.searchFindBtnVisible : styles.searchFindBtnHidden),
                        }}
                        onClick={runNameSearch}
                        disabled={!showSearchFindButton}
                      >
                        <span style={styles.searchFindBtnText}>Найти</span>
                      </button>
                    </span>
                    <Link to="/" style={styles.btnHome}>
                      На главную
                    </Link>
                  </div>
                </div>
              }
            />

            <div style={styles.genderTabs}>
              <button
                type="button"
                style={{
                  ...styles.genderTab,
                  ...(selectedSex === 'female' ? styles.genderTabActive : styles.genderTabIdle),
                }}
                onClick={() => setGenderTab('female')}
              >
                Женщины
              </button>
              <button
                type="button"
                style={{
                  ...styles.genderTab,
                  ...(selectedSex === 'male' ? styles.genderTabActive : styles.genderTabIdle),
                }}
                onClick={() => setGenderTab('male')}
              >
                Мужчины
              </button>
            </div>

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
                style={{ ...styles.arrowBtn, ...styles.arrowBtnLeft, left: w(8) }}
                onClick={() => shiftCarousel(-1)}
              >
                <img
                  src={FIGMA_ARROW_NEXT_ICON}
                  alt=""
                  aria-hidden
                  style={{ ...styles.arrowIconImageInner, transform: 'rotate(90deg)' }}
                />
              </button>

              <aside
                style={{
                  ...styles.sideColLayer1,
                  ...styles.colCarouselFlankLeft,
                  pointerEvents: 'none',
                }}
                aria-hidden
              >
                <LeaderboardStack
                  entries={leftEntries}
                  runTypeId={leftRunType}
                  scoped
                  highlightId={undefined}
                  highlightRunId={undefined}
                  highlightRef={null}
                  dim
                  loading={slides[leftIdx]?.loading}
                  error={slides[leftIdx]?.error}
                  emptyHint="Пока нет результатов в этом зачёте."
                />
              </aside>

              <section style={styles.mainColLayer2}>
                <LeaderboardStack
                  entries={centerEntries}
                  runTypeId={centerScope.runTypeId}
                  scoped
                  highlightId={showHighlight ? activeHighlightParticipantId : undefined}
                  highlightRunId={showHighlight ? activeHighlightRunId : undefined}
                  highlightRef={highlightRef}
                  dim={false}
                  loading={centerLoading}
                  error={centerError}
                  emptyHint="Пока нет результатов в этом зачёте."
                />
              </section>

              <aside
                style={{
                  ...styles.sideColLayer3,
                  ...styles.colCarouselFlankRight,
                  pointerEvents: 'none',
                }}
                aria-hidden
              >
                <LeaderboardStack
                  entries={rightEntries}
                  runTypeId={rightRunType}
                  scoped
                  highlightId={undefined}
                  highlightRunId={undefined}
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
                style={{ ...styles.arrowBtn, ...styles.arrowBtnRight, right: w(8) }}
                onClick={() => shiftCarousel(1)}
              >
                <img
                  src={FIGMA_ARROW_NEXT_ICON}
                  alt=""
                  aria-hidden
                  style={{ ...styles.arrowIconImageInner, transform: 'rotate(-90deg)' }}
                />
              </button>
            </div>
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
  highlightRunId,
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
  highlightRunId?: string;
  highlightRef: RefObject<HTMLDivElement | null> | null;
  dim: boolean;
  loading?: boolean;
  error?: string | null;
  emptyHint?: string;
}) {
  const title = getRunOption(runTypeId).title.toUpperCase();
  const rows = dim ? entries.slice(0, MAX_LEADERBOARD_ROWS) : entries;

  return (
    <div
      style={{
        ...styles.stackCard,
        ...(dim ? styles.stackDim : {}),
        ...(dim ? {} : styles.stackCardMain),
      }}
    >
      <div style={styles.stackHeaderBar}>
        <p style={styles.stackHeaderLabel}>{title}</p>
      </div>
      <div
        style={{
          ...styles.stackBody,
          ...(dim ? styles.stackBodyDim : styles.stackBodyMain),
        }}
      >
        {loading ? <p style={styles.muted}>Загрузка…</p> : null}
        {!loading && error ? <p style={styles.err}>{error}</p> : null}
        {!loading && !error && rows.length === 0 && !dim ? (
          <p style={styles.muted}>{emptyHint ?? 'Нет данных.'}</p>
        ) : null}
        {!loading && !error && rows.length > 0
          ? rows.map((e, i) => {
              const isHighlight =
                (highlightRunId !== undefined && e.runId === highlightRunId) ||
                (highlightRunId === undefined && Boolean(highlightId) && e.participantId === highlightId);
              const rowRef = isHighlight && highlightRef ? highlightRef : undefined;
              const top3 = i < 3;
              const resultStr = scoped ? primaryMetric(e, runTypeId) : globalMetric(e);
              return (
                <div
                  key={e.runId}
                  ref={rowRef as Ref<HTMLDivElement> | undefined}
                  style={{
                    ...styles.lbRow,
                    ...(dim ? styles.lbRowBack : {}),
                    ...(top3 ? styles.lbRowTop : {}),
                  }}
                >
                  <div style={styles.lbRowLeft}>
                    <span style={{ ...styles.lbRank, ...(dim ? styles.lbRankBack : {}) }}>
                      {e.rank ?? i + 1}
                    </span>
                    <span
                      style={{
                        ...styles.lbName,
                        ...(dim ? styles.lbNameBack : {}),
                        ...(isHighlight ? styles.lbNameHighlight : {}),
                      }}
                    >
                      {e.participantName}
                    </span>
                  </div>
                  <span style={{ ...styles.lbResult, ...(dim ? styles.lbResultBack : {}) }}>{resultStr}</span>
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

/** ~2× прежней ширины колонки: слой 1 (слева) и 3 (справа) — задний план, слой 2 (центр) — передний. */
const LB_LAYER_SIDE_WIDTH = w(1480);
const LB_LAYER_CENTER_WIDTH = w(1580);

const styles: Record<string, CSSProperties> = {
  page: {
    gap: h(12),
    justifyContent: 'flex-start',
    minHeight: '100%',
    overflow: 'hidden',
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
    overflow: 'hidden',
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
    gap: w(20),
    flexWrap: 'wrap',
  },
  searchRow: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    gap: w(14),
    flexWrap: 'nowrap',
    transition: 'transform 220ms ease, width 220ms ease',
    transformOrigin: 'center center',
    width: w(1040),
    justifyContent: 'flex-start',
  },
  searchRowFocused: {
    width: w(1220),
    justifyContent: 'flex-start',
  },
  searchFindBtnSlot: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'flex-start',
    flexShrink: 0,
    width: w(230),
  },
  searchFindBtnSlotVisible: {
    opacity: 1,
  },
  searchFindBtnSlotHidden: {
    opacity: 0,
  },
  searchFindBtn: {
    flexShrink: 0,
    minHeight: h(72),
    padding: `${h(18)} ${w(36)}`,
    borderRadius: w(16),
    border: 'none',
    background: ui.color.red,
    color: '#fff',
    fontFamily: '"Druk Wide Cyr"',
    fontSize: w(24),
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    fontWeight: 500,
    fontSynthesis: 'none',
    cursor: 'pointer',
    transition: 'opacity 220ms ease, transform 220ms ease',
  },
  searchFindBtnText: {
    display: 'inline-block',
    lineHeight: 1,
  },
  searchFindBtnVisible: {
    opacity: 1,
    transform: 'translateX(0)',
    pointerEvents: 'auto',
  },
  searchFindBtnHidden: {
    opacity: 0,
    transform: 'translateX(-10px)',
    pointerEvents: 'none',
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
    width: '100%',
    position: 'relative',
    transition: 'min-width 220ms ease, border-color 220ms ease, box-shadow 220ms ease',
  },
  searchBarFocused: {
    minWidth: w(620),
  },
  searchBarActiveFocus: {
    borderColor: 'rgba(255,255,255,0.52)',
    boxShadow: '0 0 0 1px rgba(255,255,255,0.24)',
  },
  searchIcon: {
    width: w(30),
    height: h(30),
    color: 'rgba(255,255,255,0.85)',
    lineHeight: 0,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  searchInput: {
    flex: 1,
    minWidth: 0,
    background: 'transparent',
    border: 'none',
    outline: 'none',
    color: '#fff',
    fontFamily: '"Druk Wide Cyr"',
    fontSize: w(24),
    fontWeight: 500,
    letterSpacing: '0.02em',
    fontSynthesis: 'none',
  },
  searchInputWithSwitchButtons: {
    paddingRight: w(84),
  },
  searchSwitchButtonsInInput: {
    position: 'absolute',
    right: w(12),
    top: '50%',
    transform: 'translateY(-50%)',
    display: 'flex',
    flexDirection: 'column',
    gap: h(4),
    zIndex: 2,
  },
  searchSwitchBtnInInput: {
    width: w(34),
    height: h(24),
    borderRadius: w(7),
    border: '1px solid rgba(255,255,255,0.45)',
    background: 'rgba(255,255,255,0.08)',
    color: '#fff',
    padding: 0,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchSwitchIcon: {
    fontFamily: td.fontDruk,
    fontWeight: 400,
    fontSynthesis: 'none',
    lineHeight: 1,
    fontSize: w(16),
    marginTop: w(-2),
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
    fontFamily: '"Druk Wide Cyr"',
    fontSize: w(22),
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    textDecoration: 'none',
    fontWeight: 500,
    fontSynthesis: 'none',
    whiteSpace: 'nowrap',
  },
  genderTabs: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'stretch',
    width: LB_LAYER_CENTER_WIDTH,
    maxWidth: LB_LAYER_CENTER_WIDTH,
    margin: '0 auto',
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
    fontFamily: '"Druk Wide Cyr"',
    fontSize: w(30),
    textTransform: 'uppercase',
    fontWeight: 500,
    lineHeight: h(39),
    fontSynthesis: 'none',
  },
  genderTabActive: {
    background: '#fff',
    color: '#333',
  },
  genderTabIdle: {
    background: 'transparent',
    color: 'rgba(255,255,255,0.6)',
  },
  leaderboardRow: {
    position: 'relative',
    display: 'block',
    flex: 1,
    minHeight: h(940),
    width: '100%',
    maxWidth: w(2360),
    margin: '0 auto',
    paddingLeft: 0,
    paddingRight: 0,
    boxSizing: 'border-box',
    overflow: 'hidden',
  },
  arrowBtn: {
    position: 'absolute' as const,
    top: '50%',
    transform: 'translateY(calc(-50% - 10px))',
    width: w(112),
    height: w(112),
    borderRadius: w(47),
    border: 'none',
    background: '#e6233a',
    color: '#fff',
    lineHeight: 1,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 6,
    boxSizing: 'border-box',
    padding: `${h(18)} ${w(18)}`,
    transition: 'transform 160ms ease, filter 160ms ease',
  },
  arrowBtnLeft: {
    transform: 'translate(-10%, calc(-50% - 10px))',
  },
  arrowBtnRight: {
    transform: 'translate(10%, calc(-50% - 10px))',
  },
  arrowIconImageInner: {
    width: '50%',
    height: '50%',
    display: 'block',
    objectFit: 'contain',
    pointerEvents: 'none',
    flexShrink: 0,
  },
  /** Слой 1 — левый лидерборд, задний план; `left` = гориз. padding `HeaderChrome` (как у логотипа). */
  sideColLayer1: {
    position: 'absolute',
    left: w(50),
    top: h(48),
    width: LB_LAYER_SIDE_WIDTH,
    minWidth: 0,
    zIndex: 1,
    boxSizing: 'border-box',
  },
  /** Слой 3 — правый лидерборд; `right` = гориз. padding `HeaderChrome` (как у блока с «На главную»). */
  sideColLayer3: {
    position: 'absolute',
    right: w(50),
    top: h(48),
    width: LB_LAYER_SIDE_WIDTH,
    minWidth: 0,
    zIndex: 1,
    boxSizing: 'border-box',
  },
  colCarouselFlankLeft: {
    transformOrigin: 'left center',
    transform: 'translateX(0) scale(0.92) translateZ(0)',
    opacity: 0.58,
    transition: 'transform 0.45s ease, opacity 0.45s ease',
  },
  colCarouselFlankRight: {
    transformOrigin: 'right center',
    transform: 'translateX(0) scale(0.92) translateZ(0)',
    opacity: 0.58,
    transition: 'transform 0.45s ease, opacity 0.45s ease',
  },
  /** Слой 2 — центральный лидерборд, передний план, по центру, шире боковых. */
  mainColLayer2: {
    position: 'absolute',
    left: '50%',
    top: 0,
    width: LB_LAYER_CENTER_WIDTH,
    minWidth: 0,
    zIndex: 4,
    transform: 'translateX(-50%) translateZ(0)',
    transition: 'transform 0.45s ease',
    boxSizing: 'border-box',
  },
  stackCard: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    /** Стабильная высота под 10 строк + шапка + паддинги списка (без скачков при <10). */
    minHeight: h(880),
    maxHeight: h(980),
    borderRadius: w(20),
    borderTop: '2px solid rgba(255,255,255,0.9)',
    background: 'linear-gradient(180deg, #000000 0%, #181818 100%)',
    boxSizing: 'border-box',
    overflow: 'hidden',
  },
  stackCardMain: {
    border: '1px solid rgba(255, 100, 119, 0.6)',
    boxShadow:
      '0 0 0 1px rgba(230, 35, 58, 0.45), 0 18px 48px rgba(0,0,0,0.55), 0 0 60px rgba(230, 35, 58, 0.12)',
  },
  stackDim: {
    opacity: 0.9,
    filter: 'grayscale(1) saturate(0)',
  },
  stackHeaderBar: {
    width: '100%',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    background: 'transparent',
    padding: `${h(28)} ${w(22)} ${h(24)}`,
    flexShrink: 0,
    boxSizing: 'border-box',
  },
  stackHeaderLabel: {
    margin: 0,
    width: '100%',
    textAlign: 'center',
    background: '#e6233a',
    padding: `${h(24)} ${w(18)}`,
    display: 'block',
    borderRadius: w(28),
    fontFamily: '"Druk Wide Cyr"',
    /** На шаг крупнее табов «Мужчины / Женщины» (там w(30)). */
    /** +10% к прежним w(34) → ~37.4 */
    fontSize: w(38),
    color: '#fff',
    textTransform: 'uppercase',
    fontWeight: 500,
    fontSynthesis: 'none',
    letterSpacing: '0.03em',
    lineHeight: 1.15,
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
    scrollBehavior: 'smooth',
    overscrollBehavior: 'contain',
  },
  /** Центральный leaderboard: полный список + аккуратный тонкий scrollbar. */
  stackBodyMain: {
    scrollbarWidth: 'thin',
    scrollbarColor: 'rgba(255,255,255,0.28) transparent',
  },
  /** Только список: Ч/Б, без яркого цвета; шапка «забег» остаётся цветной. */
  stackBodyDim: {
    filter: 'grayscale(1) saturate(0) contrast(0.82) brightness(0.82)',
  },
  /** Задние карточки: базовый размер строки −15% к центральному w(20). */
  lbRowBack: {
    fontSize: w(17),
    color: 'rgba(214,218,224,0.9)',
  },
  lbRow: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: w(20),
    padding: `${h(14)} ${w(14)}`,
    borderRadius: w(16),
    color: '#fff',
    textTransform: 'uppercase',
    fontSize: w(20),
  },
  lbRowTop: {
    background: 'rgba(255,255,255,0.11)',
  },
  lbRowLeft: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    gap: w(24),
    minWidth: 0,
    flex: 1,
  },
  lbRankBack: {
    fontSize: w(20),
    color: 'rgba(230,233,237,0.9)',
  },
  lbRank: {
    fontFamily: '"Druk Wide Cyr"',
    fontStyle: 'italic',
    fontWeight: 500,
    fontSynthesis: 'none',
    minWidth: w(52),
    color: '#fff',
    fontSize: w(30),
    letterSpacing: '0.02em',
  },
  lbNameBack: {
    fontSize: w(20),
    color: 'rgba(220,224,229,0.88)',
  },
  lbName: {
    flex: 1,
    minWidth: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    fontFamily: '"Druk Wide Cyr"',
    fontWeight: 500,
    fontSize: w(30),
    letterSpacing: '0.03em',
    fontSynthesis: 'none',
  },
  lbNameHighlight: {
    color: ui.color.red,
  },
  lbResultBack: {
    fontSize: w(26),
    color: 'rgba(232,236,240,0.9)',
  },
  lbResult: {
    fontFamily: '"Druk Wide Cyr"',
    fontWeight: 500,
    fontSynthesis: 'none',
    fontSize: w(30),
    letterSpacing: '0.09em',
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
};
