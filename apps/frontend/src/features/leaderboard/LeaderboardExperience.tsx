import type { CSSProperties, ReactNode, Ref, RefObject } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import type { Gender, RunTypeId } from '@treadmill-challenge/shared';
import { api } from '../../api/client';
import { ArOzioViewport } from '../../arOzio/ArOzioViewport';
import { ScreenContainer } from '../../arOzio/ScreenContainer';
import { h, w } from '../../arOzio/dimensions';
import type { LeaderboardEntry } from '../../hooks/useLeaderboard';
import { getRunOption } from '../run-selection/runOptions';
import { HeaderChrome } from '../../ui/components/HeaderChrome';
import { Sheet } from '../../ui/components/Sheet';
import { ui } from '../../ui/tokens';
import { formatRunResult, formatTimeResultMmSs } from '../../utils/runResultFormat';
import { useInactivityReset } from '../../hooks/useInactivityReset';
import {
  LEADERBOARD_SEARCH_FEEDBACK_MS,
  LEADERBOARD_SEARCH_MIN_QUERY_LENGTH,
  leaderboardNameMatchesQuery,
  shouldRunLeaderboardSearchOnKey,
} from './leaderboardSearchInteraction';

/** Стабильная высота фоновых колонок: до 10 строк. */
const MAX_LEADERBOARD_ROWS = 10;

/** Загрузка данных: 3 мужских зачёта + 3 женских (индексы 0–2 и 3–5). Отображение: всегда один пол + три формата. */
export const CAROUSEL_ORDER: Array<{ runTypeId: RunTypeId; sex: Gender }> = [
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

export type SlideState = {
  loading: boolean;
  error: string | null;
  entries: LeaderboardEntry[];
};

export type LeaderboardExperienceProps = {
  /** When true, show the «На главную» link next to search (local kiosk). */
  showHomeLink: boolean;
  /** Resolve `?runSessionId=` via live API (local only). */
  enableRunSessionUrlHighlight: boolean;
  /** Navigate home on inactivity (local); remote should disable. */
  enableInactivityReset: boolean;
  inactivityNavigateTo?: string;
  /** Returns six slides in CAROUSEL_ORDER. */
  fetchAllSlides: () => Promise<SlideState[]>;
  /** Refetch interval; 0 = load once only. */
  pollIntervalMs?: number;
  /** When set and all slides are empty (no error), show this instead of empty column hints. */
  backupUnavailableMessage?: string | null;
  /**
   * `kiosk` = iPad waiting leaderboard (fullscreen shell, scrollIntoView centers in viewport).
   * `desktop` = remote public page: scrollable shell + highlight scroll only inside the center list.
   * `embed` = reusable remote leaderboard block for landing/iframes: search on its own row, wider tabs, compact carousel.
   */
  layoutMode?: 'kiosk' | 'desktop' | 'embed';
  /** Landing/mobile embed already has page branding above the rating block. */
  hideEmbedBrand?: boolean;
  /** Landing/mobile embed places search around the gender tabs or inside the stack. */
  embedSearchPlacement?: 'above-tabs' | 'below-tabs' | 'stack-top';
  /** Hide search only for narrow embedded landing layouts that match the mobile Figma composition. */
  hideEmbedSearchOnNarrow?: boolean;
  /** Optional placeholder copy for embedded contexts with custom design requirements. */
  embedSearchPlaceholder?: string;
};

type NameSearchMatch = { runTypeId: RunTypeId; sex: Gender; participantId: string; runId: string };

/** Частичный поиск по фрагментам имени участника во всех слайдах лидерборда. */
function collectNameMatches(slides: SlideState[], needle: string): NameSearchMatch[] {
  if (needle.trim().length < LEADERBOARD_SEARCH_MIN_QUERY_LENGTH) return [];
  const out: NameSearchMatch[] = [];
  CAROUSEL_ORDER.forEach((scope, slideIdx) => {
    const entries = slides[slideIdx]?.entries ?? [];
    for (const e of entries) {
      if (leaderboardNameMatchesQuery(e.participantName, needle)) {
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

export function LeaderboardExperience({
  showHomeLink,
  enableRunSessionUrlHighlight,
  enableInactivityReset,
  inactivityNavigateTo = '/',
  fetchAllSlides,
  pollIntervalMs = 0,
  backupUnavailableMessage = null,
  layoutMode = 'kiosk',
  hideEmbedBrand = false,
  embedSearchPlacement = 'above-tabs',
  hideEmbedSearchOnNarrow = false,
  embedSearchPlaceholder,
}: LeaderboardExperienceProps) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const centerListScrollRef = useRef<HTMLDivElement | null>(null);
  /** Какой формат забега (0/1/2) в центре; левый/правый — соседи по кругу среди трёх форматов. */
  const [carouselIndex, setCarouselIndex] = useState(0);
  /** Все три лидерборда показывают зачёты только этого пола. */
  const [selectedSex, setSelectedSex] = useState<Gender>('male');
  const [slides, setSlides] = useState<SlideState[]>(() =>
    Array.from({ length: 6 }, () => emptySlide())
  );
  const [searchInputDraft, setSearchInputDraft] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [searchFindFeedbackActive, setSearchFindFeedbackActive] = useState(false);
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

  useInactivityReset({
    enabled: enableInactivityReset,
    onTimeout: () => {
      navigate(inactivityNavigateTo, { replace: true });
    },
  });

  const highlightRef = useRef<HTMLDivElement | null>(null);
  const searchRowRef = useRef<HTMLDivElement | null>(null);
  const urlScopeSynced = useRef(false);
  const fadeTimerRef = useRef<number | null>(null);
  const searchFeedbackTimerRef = useRef<number | null>(null);

  /** Загрузка / опрос шести зачётов через переданный источник данных. */
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setSlides(Array.from({ length: 6 }, () => emptySlide()));
      try {
        const next = await fetchAllSlides();
        if (cancelled) return;
        setSlides(next);
      } catch (e) {
        if (cancelled) return;
        const msg = e instanceof Error ? e.message : 'Ошибка загрузки';
        setSlides(Array.from({ length: 6 }, () => ({ loading: false, error: msg, entries: [] })));
      }
    };
    void load();
    if (!pollIntervalMs || pollIntervalMs <= 0) {
      return () => {
        cancelled = true;
      };
    }
    const id = window.setInterval(() => void load(), pollIntervalMs);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [fetchAllSlides, pollIntervalMs]);

  /** Подсветка строго по `runSessionId`: участник и зачёт из API. */
  useEffect(() => {
    if (!enableRunSessionUrlHighlight) {
      setHighlightParticipantId(undefined);
      setResolvedHighlightScope(null);
      return;
    }
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
  }, [searchParams, enableRunSessionUrlHighlight]);

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
      if (searchFeedbackTimerRef.current !== null) {
        window.clearTimeout(searchFeedbackTimerRef.current);
        searchFeedbackTimerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (searchInputDraft.trim().length >= LEADERBOARD_SEARCH_MIN_QUERY_LENGTH) return;
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
    if (q.length < LEADERBOARD_SEARCH_MIN_QUERY_LENGTH) return;
    const matches = collectNameMatches(slides, q);
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

  const triggerNameSearch = useCallback(() => {
    const q = searchInputDraft.trim();
    if (q.length < LEADERBOARD_SEARCH_MIN_QUERY_LENGTH) return;
    if (searchFeedbackTimerRef.current !== null) {
      window.clearTimeout(searchFeedbackTimerRef.current);
    }
    setSearchFindFeedbackActive(true);
    runNameSearch();
    searchFeedbackTimerRef.current = window.setTimeout(() => {
      setSearchFindFeedbackActive(false);
      searchFeedbackTimerRef.current = null;
    }, LEADERBOARD_SEARCH_FEEDBACK_MS);
  }, [runNameSearch, searchInputDraft]);

  const cycleNameSearchMatch = useCallback(
    (delta: -1 | 1) => {
      if (nameSearchMatches.length <= 1) return;
      const nextRaw = nameSearchMatchIndex + delta;
      const next = Math.max(0, Math.min(nameSearchMatches.length - 1, nextRaw));
      if (next === nameSearchMatchIndex) return;
      setNameSearchMatchIndex(next);
      applyNameSearchMatch(nameSearchMatches[next]!);
    },
    [nameSearchMatches, nameSearchMatchIndex, applyNameSearchMatch]
  );

  useEffect(() => {
    if (!showHighlight || (!activeHighlightParticipantId && !activeHighlightRunId) || !highlightRef.current) return;
    const row = highlightRef.current;
    const t = window.setTimeout(() => {
      if (layoutMode === 'desktop') {
        const parent = centerListScrollRef.current;
        if (!parent) return;
        const pr = parent.getBoundingClientRect();
        const rr = row.getBoundingClientRect();
        const rowCenter = rr.top + rr.height / 2;
        const viewCenter = pr.top + pr.height / 2;
        parent.scrollTop += rowCenter - viewCenter;
        return;
      }
      row.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }, 160);
    return () => clearTimeout(t);
  }, [
    layoutMode,
    showHighlight,
    activeHighlightParticipantId,
    activeHighlightRunId,
    centerEntries,
    carouselIndex,
  ]);

  const shiftCarousel = useCallback((delta: -1 | 1) => {
    const next = (carouselIndex + delta + 3) % 3;
    switchCarouselWithFade(next);
  }, [carouselIndex, switchCarouselWithFade]);

  const setGenderTab = useCallback((sex: Gender) => {
    setSelectedSex(sex);
  }, []);

  const centerLoading = slides[centerIdx]?.loading ?? true;
  const centerError = slides[centerIdx]?.error ?? null;
  const dataUnavailable =
    Boolean(backupUnavailableMessage) &&
    slides.every((s) => !s.loading && !s.error && s.entries.length === 0);
  const isEmbedLayout = layoutMode === 'embed';
  const isRemoteLikeLayout = layoutMode === 'desktop' || isEmbedLayout;
  const isNarrowEmbedLayout = isEmbedLayout && typeof window !== 'undefined' && window.innerWidth <= 520;
  const hideSearchControls = isNarrowEmbedLayout && hideEmbedSearchOnNarrow;
  const useStackSearch = !hideSearchControls && isNarrowEmbedLayout && embedSearchPlacement === 'stack-top';
  const useBelowTabsSearch = !hideSearchControls && isEmbedLayout && embedSearchPlacement === 'below-tabs';
  const isSearchExpanded = isSearchFocused || searchInputDraft.trim().length > 0;
  const canSubmitNameSearch = searchInputDraft.trim().length >= LEADERBOARD_SEARCH_MIN_QUERY_LENGTH;
  const showSearchFindButton = canSubmitNameSearch || useBelowTabsSearch;
  const showSearchSwitchButtons = nameSearchMatches.length > 1;
  const canGoSearchUp = showSearchSwitchButtons && nameSearchMatchIndex > 0;
  const canGoSearchDown = showSearchSwitchButtons && nameSearchMatchIndex < nameSearchMatches.length - 1;

  const searchControls = (
    <div
      ref={searchRowRef}
      style={{
        ...styles.searchRow,
        ...(isEmbedLayout ? styles.searchRowEmbed : {}),
        ...(isNarrowEmbedLayout ? styles.searchRowEmbedNarrow : {}),
        ...(isNarrowEmbedLayout && !showSearchFindButton ? styles.searchRowEmbedNarrowIdle : {}),
        ...(isSearchExpanded ? styles.searchRowFocused : {}),
        ...(isEmbedLayout && isSearchExpanded ? styles.searchRowEmbedFocused : {}),
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
          ...(isEmbedLayout ? styles.searchBarEmbed : {}),
          ...(isNarrowEmbedLayout ? styles.searchBarEmbedNarrow : {}),
          ...(isSearchExpanded ? styles.searchBarFocused : {}),
          ...(isEmbedLayout && isSearchExpanded ? styles.searchBarEmbedFocused : {}),
          ...(isSearchFocused ? styles.searchBarActiveFocus : {}),
        }}
      >
        <span style={styles.searchIcon} aria-hidden>
          <svg viewBox="0 0 24 24" width="100%" height="100%" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="2" />
            <path d="M16 16L21 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </span>
        <input
          type="text"
          value={searchInputDraft}
          onChange={(e) => setSearchInputDraft(e.target.value)}
          onKeyDown={(e) => {
            if (!shouldRunLeaderboardSearchOnKey(e.key, searchInputDraft)) return;
            e.preventDefault();
            triggerNameSearch();
          }}
          placeholder={
            embedSearchPlaceholder && isEmbedLayout
              ? embedSearchPlaceholder
              : isNarrowEmbedLayout
                ? 'Поиск'
                : isSearchFocused
                  ? 'Введите имя и фамилию полностью'
                  : 'Поиск'
          }
          style={{
            ...styles.searchInput,
            ...(isEmbedLayout ? styles.searchInputEmbed : {}),
            ...(isNarrowEmbedLayout ? styles.searchInputEmbedNarrow : {}),
            ...(showSearchSwitchButtons ? styles.searchInputWithSwitchButtons : {}),
            ...(showSearchSwitchButtons && isNarrowEmbedLayout ? styles.searchInputWithSwitchButtonsNarrow : {}),
          }}
          autoComplete="off"
        />
        {showSearchSwitchButtons ? (
          <span style={{ ...styles.searchSwitchButtonsInInput, ...(isNarrowEmbedLayout ? styles.searchSwitchButtonsInInputNarrow : {}) }}>
            <button
              type="button"
              aria-label="Предыдущий найденный участник"
              style={{ ...styles.searchSwitchBtnInInput, ...(isNarrowEmbedLayout ? styles.searchSwitchBtnInInputNarrow : {}) }}
              disabled={!canGoSearchUp}
              onClick={() => cycleNameSearchMatch(-1)}
            >
              <span
                style={{
                  ...styles.searchSwitchIconImage,
                  ...(isNarrowEmbedLayout ? styles.searchSwitchIconImageNarrow : {}),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: canGoSearchUp ? '#ffffff' : 'rgba(255,255,255,0.34)',
                }}
              >
                <LbSearchChevronUp />
              </span>
            </button>
            <button
              type="button"
              aria-label="Следующий найденный участник"
              style={{ ...styles.searchSwitchBtnInInput, ...(isNarrowEmbedLayout ? styles.searchSwitchBtnInInputNarrow : {}) }}
              disabled={!canGoSearchDown}
              onClick={() => cycleNameSearchMatch(1)}
            >
              <span
                style={{
                  ...styles.searchSwitchIconImage,
                  ...(isNarrowEmbedLayout ? styles.searchSwitchIconImageNarrow : {}),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: canGoSearchDown ? ui.color.red : 'rgba(255,255,255,0.34)',
                }}
              >
                <LbSearchChevronDown />
              </span>
            </button>
          </span>
        ) : null}
      </label>
      <span
        style={{
          ...styles.searchFindBtnSlot,
          ...(isEmbedLayout ? styles.searchFindBtnSlotEmbed : {}),
          ...(isNarrowEmbedLayout ? styles.searchFindBtnSlotEmbedNarrow : {}),
          ...(showSearchFindButton ? styles.searchFindBtnSlotVisible : styles.searchFindBtnSlotHidden),
          ...(isNarrowEmbedLayout && !showSearchFindButton ? styles.searchFindBtnSlotNarrowHidden : {}),
        }}
        aria-hidden={!showSearchFindButton}
      >
        <button
          type="button"
          style={{
            ...styles.searchFindBtn,
            ...(isEmbedLayout ? styles.searchFindBtnEmbed : {}),
            ...(isNarrowEmbedLayout ? styles.searchFindBtnEmbedNarrow : {}),
            ...(showSearchFindButton ? styles.searchFindBtnVisible : styles.searchFindBtnHidden),
            ...(searchFindFeedbackActive ? styles.searchFindBtnFeedback : {}),
          }}
          onClick={triggerNameSearch}
          disabled={!canSubmitNameSearch || searchFindFeedbackActive}
          aria-busy={searchFindFeedbackActive}
        >
          <span style={styles.searchFindBtnText}>Найти</span>
        </button>
      </span>
      {showHomeLink ? (
        <Link to="/" style={styles.btnHome}>
          На главную
        </Link>
      ) : null}
    </div>
  );

  return (
    <ArOzioViewport variant={isRemoteLikeLayout ? 'remote' : 'kiosk'}>
      <ScreenContainer style={{ ...styles.page, ...(isEmbedLayout ? styles.pageEmbed : {}) }}>
        <Sheet style={{ ...styles.sheet, ...(isEmbedLayout ? styles.sheetEmbed : {}) }}>
          <div style={{ ...styles.sheetInner, ...(isEmbedLayout ? styles.sheetInnerEmbed : {}) }}>
            {!isNarrowEmbedLayout && !(isEmbedLayout && hideEmbedBrand) ? (
              <HeaderChrome
                style={{ ...styles.headerRow, ...(isEmbedLayout ? styles.headerRowEmbed : {}) }}
                logoStyle={styles.logoMark}
                right={
                  isEmbedLayout ? undefined :
                  <div style={styles.headerRight}>
                    {!hideSearchControls ? searchControls : null}
                  </div>
                }
              />
            ) : null}

            {isNarrowEmbedLayout && !hideEmbedBrand ? (
              <div style={styles.embedNarrowBrand} aria-label="AMAZING RED">
                <span>AMAZING</span>
                <span style={styles.embedNarrowBrandRed}>RED</span>
              </div>
            ) : null}

            {isEmbedLayout && !isNarrowEmbedLayout && !useBelowTabsSearch ? <div style={styles.embedSearchWrap}>{searchControls}</div> : null}
            {isNarrowEmbedLayout && !hideSearchControls && !useStackSearch && !useBelowTabsSearch ? <div style={styles.embedSearchWrapNarrow}>{searchControls}</div> : null}

            <div style={{ ...styles.genderTabs, ...(isEmbedLayout ? styles.genderTabsEmbed : {}), ...(isNarrowEmbedLayout ? styles.genderTabsEmbedNarrow : {}) }}>
              <button
                type="button"
                style={{
                  ...styles.genderTab,
                  ...(isEmbedLayout ? styles.genderTabEmbed : {}),
                  ...(isNarrowEmbedLayout ? styles.genderTabEmbedNarrow : {}),
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
                  ...(isEmbedLayout ? styles.genderTabEmbed : {}),
                  ...(isNarrowEmbedLayout ? styles.genderTabEmbedNarrow : {}),
                  ...(selectedSex === 'male' ? styles.genderTabActive : styles.genderTabIdle),
                }}
                onClick={() => setGenderTab('male')}
              >
                Мужчины
              </button>
            </div>

            {isEmbedLayout && !isNarrowEmbedLayout && useBelowTabsSearch ? <div style={styles.embedSearchWrap}>{searchControls}</div> : null}
            {isNarrowEmbedLayout && useBelowTabsSearch ? <div style={styles.embedSearchWrapNarrow}>{searchControls}</div> : null}

            <div
              style={{
                ...styles.leaderboardRow,
                ...(isEmbedLayout ? styles.leaderboardRowEmbed : {}),
                ...(isNarrowEmbedLayout ? styles.leaderboardRowEmbedNarrow : {}),
                opacity: isCarouselFading ? 0.14 : 1,
                transition: `opacity ${CAROUSEL_FADE_MS}ms ease`,
              }}
            >
              {dataUnavailable ? (
                <p
                  style={{
                    ...styles.muted,
                    marginTop: h(160),
                    fontSize: w(34),
                    maxWidth: w(1600),
                    marginLeft: 'auto',
                    marginRight: 'auto',
                  }}
                >
                  {backupUnavailableMessage}
                </p>
              ) : (
                <>
              <button
                type="button"
                aria-label="Предыдущий зачёт"
                style={{
                  ...styles.arrowBtn,
                  ...styles.arrowBtnLeft,
                  ...(isEmbedLayout ? styles.arrowBtnEmbed : {}),
                  ...(isNarrowEmbedLayout ? styles.arrowBtnEmbedNarrow : {}),
                  left: isEmbedLayout ? w(4) : w(8),
                }}
                onClick={() => shiftCarousel(-1)}
              >
                <LbCarouselArrow rotationDeg={180} />
              </button>

              {!isEmbedLayout ? (
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
              ) : null}

              <section style={{ ...styles.mainColLayer2, ...(isEmbedLayout ? styles.mainColLayer2Embed : {}) }}>
                <LeaderboardStack
                  entries={centerEntries}
                  runTypeId={centerScope.runTypeId}
                  scoped
                  highlightId={showHighlight ? activeHighlightParticipantId : undefined}
                  highlightRunId={showHighlight ? activeHighlightRunId : undefined}
                  highlightRef={highlightRef}
                  scrollBodyRef={isRemoteLikeLayout ? centerListScrollRef : undefined}
                  dim={false}
                  loading={centerLoading}
                  error={centerError}
                  compact={isEmbedLayout}
                  narrow={isNarrowEmbedLayout}
                  pageScrollPassthrough={isEmbedLayout}
                  topSlot={useStackSearch ? searchControls : undefined}
                  emptyHint="Пока нет результатов в этом зачёте."
                />
              </section>

              {!isEmbedLayout ? (
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
              ) : null}

              <button
                type="button"
                aria-label="Следующий зачёт"
                style={{
                  ...styles.arrowBtn,
                  ...styles.arrowBtnRight,
                  ...(isEmbedLayout ? styles.arrowBtnEmbed : {}),
                  ...(isNarrowEmbedLayout ? styles.arrowBtnEmbedNarrow : {}),
                  right: isEmbedLayout ? w(4) : w(8),
                }}
                onClick={() => shiftCarousel(1)}
              >
                <LbCarouselArrow rotationDeg={0} />
              </button>
                </>
              )}
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
  scrollBodyRef,
  dim,
  loading,
  error,
  emptyHint,
  compact = false,
  narrow = false,
  pageScrollPassthrough = false,
  topSlot,
}: {
  entries: LeaderboardEntry[];
  runTypeId: RunTypeId;
  scoped: boolean;
  highlightId?: string;
  highlightRunId?: string;
  highlightRef: RefObject<HTMLDivElement | null> | null;
  /** Center column only: scroll container for desktop highlight alignment. */
  scrollBodyRef?: RefObject<HTMLDivElement | null>;
  dim: boolean;
  loading?: boolean;
  error?: string | null;
  emptyHint?: string;
  compact?: boolean;
  narrow?: boolean;
  pageScrollPassthrough?: boolean;
  topSlot?: ReactNode;
}) {
  const title = getRunOption(runTypeId).title.toUpperCase();
  const rows = dim || narrow ? entries.slice(0, MAX_LEADERBOARD_ROWS) : entries;

  return (
    <div
      style={{
        ...styles.stackCard,
        ...(dim ? styles.stackDim : {}),
        ...(dim ? {} : styles.stackCardMain),
        ...(compact ? styles.stackCardCompact : {}),
        ...(narrow ? styles.stackCardNarrow : {}),
      }}
    >
      <div style={{ ...styles.stackHeaderBar, ...(narrow ? styles.stackHeaderBarNarrow : {}) }}>
        <p style={{ ...styles.stackHeaderLabel, ...(compact ? styles.stackHeaderLabelCompact : {}), ...(narrow ? styles.stackHeaderLabelNarrow : {}) }}>
          <span style={narrow ? styles.stackHeaderTextNarrow : undefined}>{title}</span>
          {narrow ? <span style={styles.stackHeaderChevronNarrow} aria-hidden /> : null}
        </p>
      </div>
      {topSlot ? <div style={{ ...styles.stackTopSlot, ...(narrow ? styles.stackTopSlotNarrow : {}) }}>{topSlot}</div> : null}
      <div
        ref={scrollBodyRef as Ref<HTMLDivElement> | undefined}
        style={{
          ...styles.stackBody,
          ...(dim ? styles.stackBodyDim : styles.stackBodyMain),
          ...(compact ? styles.stackBodyCompact : {}),
          ...(narrow ? styles.stackBodyNarrow : {}),
          ...(narrow && pageScrollPassthrough ? styles.stackBodyNarrowShowcase : {}),
          ...(pageScrollPassthrough ? styles.stackBodyPageScrollPassthrough : {}),
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
                    ...(compact ? styles.lbRowCompact : {}),
                    ...(narrow ? styles.lbRowNarrow : {}),
                  }}
                >
                  <div
                    style={{
                      ...styles.lbRowLeft,
                      ...(compact ? styles.lbRowLeftCompact : {}),
                      ...(narrow ? styles.lbRowLeftNarrow : {}),
                    }}
                  >
                    <span
                      style={{
                        ...styles.lbRank,
                        ...(dim ? styles.lbRankBack : {}),
                        ...(compact ? styles.lbRankCompact : {}),
                        ...(narrow ? styles.lbRankNarrow : {}),
                      }}
                    >
                      {e.rank ?? i + 1}
                    </span>
                    <span
                      style={{
                        ...styles.lbName,
                        ...(dim ? styles.lbNameBack : {}),
                        ...(isHighlight ? styles.lbNameHighlight : {}),
                        ...(compact ? styles.lbNameCompact : {}),
                        ...(narrow ? styles.lbNameNarrow : {}),
                      }}
                    >
                      {e.participantName}
                    </span>
                  </div>
                  <span
                    style={{
                      ...styles.lbResult,
                      ...(dim ? styles.lbResultBack : {}),
                      ...(compact ? styles.lbResultCompact : {}),
                      ...(narrow ? styles.lbResultNarrow : {}),
                    }}
                  >
                    {resultStr}
                  </span>
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
  pageEmbed: {
    paddingTop: 0,
    paddingRight: 0,
    paddingBottom: 0,
    paddingLeft: 0,
    height: 'auto',
    minHeight: '100%',
  },
  sheet: {
    flex: 1,
    minHeight: 0,
    width: '100%',
    borderRadius: w(48),
    boxSizing: 'border-box',
  },
  sheetEmbed: {
    borderRadius: w(26),
    borderColor: 'rgba(255,255,255,0.1)',
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
  sheetInnerEmbed: {
    gap: '30px',
    padding: `${h(30)} ${w(28)} ${h(30)}`,
  },
  headerRow: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: w(24),
    flexWrap: 'wrap',
  },
  headerRowEmbed: {
    justifyContent: 'flex-start',
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
  searchRowEmbed: {
    width: '100%',
    maxWidth: '100%',
    height: '88px',
    alignItems: 'stretch',
    flexWrap: 'nowrap',
    gap: '16px',
  },
  searchRowEmbedNarrow: {
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1fr) 92px',
    alignItems: 'stretch',
    height: '56px',
    gap: '8px',
  },
  searchRowEmbedNarrowIdle: {
    gridTemplateColumns: '1fr',
  },
  searchRowEmbedFocused: {
    width: '100%',
  },
  embedSearchWrap: {
    width: '100%',
    display: 'flex',
    justifyContent: 'center',
  },
  embedSearchWrapNarrow: {
    width: '100%',
    display: 'block',
  },
  embedNarrowBrand: {
    display: 'flex',
    alignItems: 'baseline',
    gap: '3px',
    alignSelf: 'flex-start',
    margin: '0 0 -2px 2px',
    color: '#fff',
    fontFamily: '"Druk Wide Cyr"',
    fontSize: '5px',
    lineHeight: 1,
    letterSpacing: '0.04em',
    textTransform: 'uppercase',
  },
  embedNarrowBrandRed: {
    color: ui.color.red,
  },
  searchFindBtnSlot: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'flex-start',
    flexShrink: 0,
    width: w(230),
  },
  searchFindBtnSlotEmbed: {
    width: '259px',
    alignItems: 'stretch',
  },
  searchFindBtnSlotEmbedNarrow: {
    width: '92px',
    height: '56px',
    alignItems: 'stretch',
  },
  searchFindBtnSlotVisible: {
    opacity: 1,
  },
  searchFindBtnSlotHidden: {
    opacity: 0,
  },
  searchFindBtnSlotNarrowHidden: {
    display: 'none',
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
  searchFindBtnEmbed: {
    width: '100%',
    minHeight: '88px',
    padding: '20px',
    borderRadius: '24px',
    fontSize: '24px',
    lineHeight: 1,
  },
  searchFindBtnEmbedNarrow: {
    width: '100%',
    height: '56px',
    minHeight: '56px',
    padding: '12px 10px',
    borderRadius: '14px',
    fontSize: '12px',
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
  searchFindBtnFeedback: {
    opacity: 0.68,
    filter: 'brightness(0.72)',
    cursor: 'default',
    transform: 'translateX(0) scale(0.985)',
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
  searchBarEmbed: {
    minWidth: 0,
    width: 'auto',
    flex: '1 1 auto',
    height: '88px',
    minHeight: '88px',
    padding: '20px',
    borderRadius: '24px',
    gap: '16px',
  },
  searchBarEmbedNarrow: {
    height: '56px',
    minHeight: '56px',
    padding: '12px 14px',
    borderRadius: '14px',
    gap: '8px',
  },
  searchBarEmbedFocused: {
    minWidth: 0,
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
  searchInputEmbed: {
    fontSize: '24px',
    letterSpacing: '1.2px',
    textTransform: 'uppercase',
    color: '#fff',
  },
  searchInputEmbedNarrow: {
    fontFamily: '"Druk Wide Cyr", "Oswald", Arial, sans-serif',
    fontSize: '13px',
    fontWeight: 500,
    letterSpacing: '0.65px',
    textTransform: 'uppercase',
  },
  searchInputWithSwitchButtons: {
    paddingRight: w(188),
  },
  searchInputWithSwitchButtonsNarrow: {
    paddingRight: '92px',
  },
  searchSwitchButtonsInInput: {
    position: 'absolute',
    right: w(24),
    top: '50%',
    transform: 'translateY(-50%)',
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    gap: w(28),
    zIndex: 2,
  },
  searchSwitchButtonsInInputNarrow: {
    right: '8px',
    gap: '8px',
  },
  searchSwitchBtnInInput: {
    width: w(76),
    height: h(60),
    borderRadius: w(10),
    border: 'none',
    background: 'transparent',
    color: '#fff',
    padding: 0,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchSwitchBtnInInputNarrow: {
    width: '36px',
    height: '32px',
    borderRadius: '8px',
  },
  searchSwitchIconImage: {
    width: w(64),
    height: h(40),
    display: 'block',
    objectFit: 'contain',
    pointerEvents: 'none',
  },
  searchSwitchIconImageNarrow: {
    width: '26px',
    height: '20px',
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
  genderTabsEmbed: {
    width: '100%',
    maxWidth: '100%',
    height: '80px',
    minHeight: '80px',
    borderRadius: '27px',
    padding: '9px',
    gap: 0,
  },
  genderTabsEmbedNarrow: {
    marginTop: '0',
    height: '64px',
    minHeight: '64px',
    borderRadius: '22px',
    padding: '7px',
    gap: '4px',
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
  genderTabEmbed: {
    borderRadius: '24px',
    fontSize: '24px',
    lineHeight: 1.3,
    letterSpacing: '0',
  },
  genderTabEmbedNarrow: {
    borderRadius: '19px',
    fontSize: '15px',
    lineHeight: 1.3,
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
  leaderboardRowEmbed: {
    minHeight: h(940),
    maxWidth: '100%',
  },
  leaderboardRowEmbedNarrow: {
    minHeight: '0',
    overflow: 'visible',
  },
  arrowBtn: {
    position: 'absolute' as const,
    top: '50%',
    transform: 'translateY(calc(-50% - 10px))',
    width: w(86),
    height: w(86),
    borderRadius: '50%',
    border: 'none',
    background: ui.color.red,
    color: '#fff',
    lineHeight: 1,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 6,
    boxSizing: 'border-box',
    padding: 0,
    transition: 'transform 160ms ease, filter 160ms ease',
  },
  arrowBtnLeft: {
    transform: 'translate(-2%, calc(-50% - 10px))',
  },
  arrowBtnRight: {
    transform: 'translate(2%, calc(-50% - 10px))',
  },
  arrowBtnEmbed: {
    width: w(68),
    height: w(68),
    zIndex: 8,
  },
  arrowBtnEmbedNarrow: {
    display: 'none',
  },
  arrowIconImageInner: {
    width: '42%',
    height: '42%',
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
  mainColLayer2Embed: {
    position: 'relative',
    left: 'auto',
    top: 'auto',
    width: '100%',
    maxWidth: '100%',
    transform: 'none',
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
  stackCardCompact: {
    minHeight: h(820),
    maxHeight: h(900),
  },
  stackCardNarrow: {
    height: 'auto',
    minHeight: '0',
    maxHeight: 'none',
    borderRadius: '18px',
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
  stackHeaderBarNarrow: {
    padding: '10px 12px 8px',
  },
  stackHeaderLabelCompact: {
    fontSize: '20px',
    padding: 'clamp(7px, 2vw, 12px) clamp(8px, 2.4vw, 14px)',
    borderRadius: 'clamp(8px, 2.4vw, 16px)',
  },
  stackHeaderLabelNarrow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '10px',
    background: ui.color.red,
    border: '1px solid rgba(255,255,255,0.08)',
    boxShadow: 'none',
    fontSize: '14px',
    padding: '11px 14px',
    borderRadius: '14px',
    textAlign: 'left',
    lineHeight: 1.15,
  },
  stackHeaderTextNarrow: {
    minWidth: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  stackHeaderChevronNarrow: {
    width: '10px',
    height: '10px',
    borderRight: '2px solid rgba(255,255,255,0.9)',
    borderBottom: '2px solid rgba(255,255,255,0.9)',
    transform: 'rotate(45deg) translateY(-2px)',
    flexShrink: 0,
  },
  stackTopSlot: {
    padding: '0 8px 8px',
    flexShrink: 0,
  },
  stackTopSlotNarrow: {
    padding: '0 12px 18px',
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
  stackBodyCompact: {
    padding: `${h(16)} ${w(14)} ${h(20)}`,
    gap: h(10),
  },
  stackBodyNarrow: {
    padding: '8px 12px 12px',
    gap: '8px',
    overflowY: 'auto',
    maxHeight: 'none',
    scrollbarWidth: 'thin',
    scrollbarColor: 'rgba(255,255,255,0.22) transparent',
  },
  stackBodyNarrowShowcase: {
    maxHeight: 'none',
  },
  stackBodyPageScrollPassthrough: {
    overflowY: 'hidden',
    overscrollBehavior: 'auto',
    touchAction: 'pan-y',
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
  lbRowCompact: {
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1fr) auto',
    gap: 'clamp(4px, 1.4vw, 8px)',
    padding: 'clamp(4px, 1.3vw, 7px) clamp(5px, 1.5vw, 9px)',
    borderRadius: 'clamp(6px, 2vw, 12px)',
  },
  lbRowNarrow: {
    gridTemplateColumns: 'minmax(0, 1fr) auto',
    alignItems: 'center',
    minHeight: '40px',
    gap: '8px',
    padding: '8px 10px',
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
  lbRowLeftCompact: {
    gap: 'clamp(4px, 1.4vw, 8px)',
  },
  lbRowLeftNarrow: {
    gap: '7px',
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
  lbRankCompact: {
    minWidth: 'clamp(14px, 4vw, 24px)',
    fontSize: '20px',
  },
  lbRankNarrow: {
    minWidth: '18px',
    fontSize: '12px',
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
  lbNameCompact: {
    fontSize: '20px',
    letterSpacing: '0.015em',
  },
  lbNameNarrow: {
    fontSize: '12px',
    lineHeight: 1.08,
    whiteSpace: 'nowrap',
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
  lbResultCompact: {
    fontSize: '20px',
    letterSpacing: '0.04em',
    maxWidth: 'clamp(44px, 18vw, 96px)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  lbResultNarrow: {
    justifySelf: 'end',
    marginLeft: 0,
    maxWidth: '84px',
    fontSize: '12px',
    letterSpacing: '0.02em',
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

/** Bundled SVG arrows (no CDN); used by local + remote kiosk leaderboard. */
function LbCarouselArrow({ rotationDeg }: { rotationDeg: number }) {
  return (
    <span style={{ ...styles.arrowIconImageInner, display: 'flex', transform: `rotate(${rotationDeg}deg)` }}>
      <svg viewBox="0 0 24 24" width="100%" height="100%" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
        <path
          d="M8.5 5.5L15.5 12L8.5 18.5"
          stroke="#ffffff"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

function LbSearchChevronUp() {
  return (
    <svg viewBox="0 0 24 24" width="100%" height="100%" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <path
        d="M5.5 15.5L12 8.5L18.5 15.5"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function LbSearchChevronDown() {
  return (
    <svg viewBox="0 0 24 24" width="100%" height="100%" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <path
        d="M5.5 8.5L12 15.5L18.5 8.5"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
