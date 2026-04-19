import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { RunTypeId } from '@treadmill-challenge/shared';
import { getRunTypeShortName } from '@treadmill-challenge/shared';
import { ArOzioViewport } from '../arOzio/ArOzioViewport';
import { ScreenContainer } from '../arOzio/ScreenContainer';
import { h, w } from '../arOzio/dimensions';
import { api } from '../api/client';
import { AdminPinModal } from '../features/admin/AdminPinModal';
import {
  clearLoggedRunSessionId,
  getLoggedParticipantId,
  getLoggedRunSessionId,
  logEvent,
} from '../logging/logEvent';
import { pluralizePeople } from '../utils/russianPlural';
import { LogoMark } from '../ui/components/LogoMark';
import { APP_VERSION } from '../appVersion';
import { ui } from '../ui/tokens';
import { TD_LEADERBOARD_WAITING_PATH } from '../features/td/tdLeaderboardRoutes';

/** Figma hero — local assets (WebP + JPEG fallback, tiny LQIP blur). */
const HERO_BG_WEBP = '/assets/hero/hero-bg.webp';
const HERO_BG_FULL = '/assets/hero/hero-bg.jpg';
const HERO_BG_LQ = '/assets/hero/hero-bg-lq.jpg';

type QueueCardItem = {
  runSessionId: string;
  queueNumber: number;
  participantName: string;
  runTypeId: RunTypeId;
  runType: string;
  status: string;
};

/** «Фамилия Имя Отчество?» из одной строки API — каждое поле рендерится отдельно для своего ellipsis. */
function splitParticipantNameParts(fullName: string): {
  surname: string;
  firstName?: string;
  patronymic?: string;
} {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { surname: 'Участник' };
  if (parts.length === 1) return { surname: parts[0] };
  if (parts.length === 2) return { surname: parts[0], firstName: parts[1] };
  return {
    surname: parts[0],
    firstName: parts[1],
    patronymic: parts.slice(2).join(' '),
  };
}

const ADMIN_TAP_SEQ = ['amazing', 'amazing', 'red', 'red', 'amazing', 'red'] as const;

/** Set only from this page when navigating to `/register/queue-full` after a synchronous full-queue check. */
const QUEUE_FULL_ENTRY_STATE = { fromMainParticipateQueueFull: true as const };

export default function Main() {
  const navigate = useNavigate();
  const [queueCards, setQueueCards] = useState<QueueCardItem[]>([]);
  const [loadingQueue, setLoadingQueue] = useState(true);
  const [queueBlockVisible, setQueueBlockVisible] = useState(false);
  const [heroFullLoaded, setHeroFullLoaded] = useState(false);
  const [pinModalOpen, setPinModalOpen] = useState(false);
  const [showUiVersion, setShowUiVersion] = useState(false);
  const heroFullImgRef = useRef<HTMLImageElement>(null);
  const adminTapIdx = useRef(0);
  /** Triple consecutive taps on AMAZING (RED resets) reveal build version — independent of admin tap sequence. */
  const amazingVersionTapRef = useRef(0);

  useLayoutEffect(() => {
    const el = heroFullImgRef.current;
    if (!el) return;
    if (el.complete && el.naturalWidth > 0) {
      setHeroFullLoaded(true);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const POLL_MS = 5000;

    async function loadQueue(showLoading: boolean): Promise<void> {
      if (showLoading) {
        setLoadingQueue(true);
      }
      try {
        const data = await api.getRunQueue();
        if (!cancelled) {
          setQueueCards(data.entries as QueueCardItem[]);
          setQueueBlockVisible(true);
        }
      } catch {
        if (!cancelled) {
          setQueueCards([]);
          setQueueBlockVisible(true);
        }
      } finally {
        if (!cancelled && showLoading) {
          setLoadingQueue(false);
        }
      }
    }

    void loadQueue(true);
    const timer = window.setInterval(() => {
      void loadQueue(false);
    }, POLL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  const queuePeopleCount = queueCards.length;
  const queueSummary = pluralizePeople(queuePeopleCount);
  const blockShown = heroFullLoaded && queueBlockVisible;

  const onParticipateClick = useCallback(
    async (e: React.MouseEvent<HTMLAnchorElement>) => {
      e.preventDefault();

      let queueData: Awaited<ReturnType<typeof api.getRunQueue>>;
      try {
        queueData = await api.getRunQueue();
        setQueueCards(queueData.entries as QueueCardItem[]);
        setQueueBlockVisible(true);
      } catch {
        logEvent(
          'landing_click_register_after_queue_fetch_failed',
          {},
          {
            readableMessage:
              'Не удалось получить состояние очереди перед «Принять участие» — переход к регистрации',
          }
        );
        navigate('/register');
        return;
      }

      const isGlobalQueueFull =
        queueData.activeSessionCount >= queueData.maxGlobalQueueSize;

      /**
       * При полном пуле (running + queued = max) с главной всегда показываем
       * `/register/queue-full` (QueueFullPage). Нельзя уходить в `/run/queue` — там сценарий
       * «Дорожка занята / Сойти с забега / ОК» (другой кейс: ещё есть место в очереди).
       */
      if (isGlobalQueueFull) {
        logEvent(
          'landing_register_queue_full',
          {
            activeSessionCount: queueData.activeSessionCount,
            maxGlobalQueueSize: queueData.maxGlobalQueueSize,
          },
          {
            readableMessage:
              'Пользователь нажал «Принять участие» при полной глобальной очереди — показан экран переполнения',
          }
        );
        navigate('/register/queue-full', { state: QUEUE_FULL_ENTRY_STATE });
        return;
      }

      const resumeStoredRunSessionIfActive = async (): Promise<boolean> => {
        const storedRunSessionId = getLoggedRunSessionId();
        if (!storedRunSessionId) return false;
        try {
          const session = await api.getRunSessionState(storedRunSessionId);
          if (session.status === 'queued' || session.status === 'running') {
            const pos = session.queuePosition ?? session.queueNumber ?? 1;
            logEvent(
              'landing_resume_active_run_session',
              { runSessionId: session.runSessionId, status: session.status },
              {
                participantId: session.participantId,
                runSessionId: session.runSessionId,
                readableMessage:
                  'На главной нажали «Принять участие» при активном забеге — возврат в очередь',
              }
            );
            navigate('/run/queue', {
              state: {
                participantId: session.participantId,
                runSessionId: session.runSessionId,
                runTypeId: session.runTypeId,
                position: pos,
                participantSex: 'male',
                demoMode: false,
                initialSessionStatus: session.status === 'running' ? 'running' : 'queued',
                initialOtherSessionRunning: session.otherSessionRunning,
              },
            });
            return true;
          }
        } catch {
          // Stale id or network error — allow a fresh participation attempt.
        }
        clearLoggedRunSessionId();
        return false;
      };

      const resumed = await resumeStoredRunSessionIfActive();
      if (resumed) return;

      const loggedParticipantId = getLoggedParticipantId();
      if (loggedParticipantId) {
        logEvent(
          'landing_skip_queue_full_already_registered',
          {},
          {
            participantId: loggedParticipantId,
            readableMessage:
              'На главной нажали «Принять участие» — участник уже зарегистрирован, переход к выбору забега',
          }
        );
        navigate('/run-select', {
          state: {
            participantId: loggedParticipantId,
            participantFirstName: '',
            participantSex: 'male',
          },
        });
        return;
      }

      logEvent(
        'landing_click_register',
        {},
        { readableMessage: 'Пользователь нажал кнопку «Принять участие»' }
      );
      navigate('/register');
    },
    [navigate]
  );

  const onAdminTap = (zone: 'amazing' | 'red') => {
    const expected = ADMIN_TAP_SEQ[adminTapIdx.current];
    if (zone !== expected) {
      adminTapIdx.current = 0;
      return;
    }
    adminTapIdx.current += 1;
    if (adminTapIdx.current >= ADMIN_TAP_SEQ.length) {
      adminTapIdx.current = 0;
      setPinModalOpen(true);
    }
  };

  const onAmazingPointer = () => {
    amazingVersionTapRef.current += 1;
    if (amazingVersionTapRef.current >= 3) {
      amazingVersionTapRef.current = 0;
      setShowUiVersion(true);
    }
    onAdminTap('amazing');
  };

  const onRedPointer = () => {
    amazingVersionTapRef.current = 0;
    onAdminTap('red');
  };

  return (
    <ArOzioViewport>
      <ScreenContainer style={styles.page}>
          <section style={styles.heroSection} aria-label="Заставка">
            <div style={styles.heroBgPlate} aria-hidden />
            <div style={styles.heroImageWrap} aria-hidden>
              <img
                src={HERO_BG_LQ}
                alt=""
                style={styles.heroLqImage}
                decoding="async"
                fetchPriority="low"
              />
              <picture style={styles.heroPicture}>
                <source srcSet={HERO_BG_WEBP} type="image/webp" />
                <img
                  ref={heroFullImgRef}
                  src={HERO_BG_FULL}
                  alt=""
                  style={{
                    ...styles.heroImage,
                    opacity: heroFullLoaded ? 1 : 0,
                    transition: 'opacity 280ms ease-out',
                  }}
                  decoding="async"
                  fetchPriority="high"
                  onLoad={() => setHeroFullLoaded(true)}
                  onError={() => setHeroFullLoaded(true)}
                />
              </picture>
            </div>
            <div
              style={{
                ...styles.heroContentLayer,
                opacity: heroFullLoaded ? 1 : 0,
                transition: 'opacity 280ms ease-out',
                pointerEvents: heroFullLoaded ? 'auto' : 'none',
              }}
            >
            <div style={styles.logoRow}>
              <LogoMark
                aria-label="AMAZING RED"
                style={styles.logoMark}
                onAmazingClick={onAmazingPointer}
                onRedClick={onRedPointer}
              />
            </div>

            {showUiVersion ? (
              <div
                role="status"
                aria-live="polite"
                style={{
                  position: 'absolute',
                  top: h(28),
                  right: w(40),
                  zIndex: 10,
                  fontSize: w(22),
                  lineHeight: 1.2,
                  fontWeight: 400,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  color: 'rgba(255,255,255,0.42)',
                  pointerEvents: 'none',
                  maxWidth: '50%',
                  textAlign: 'right',
                }}
              >
                v{APP_VERSION}
              </div>
            ) : null}

            <div style={styles.heroForeground}>
              <div
                style={{
                  ...styles.heroMainStack,
                  opacity: blockShown ? 1 : 0,
                  transform: blockShown ? 'translateY(0)' : `translateY(${h(10)})`,
                  transition: 'opacity 280ms ease-out, transform 280ms ease-out',
                  willChange: blockShown ? undefined : 'opacity, transform',
                }}
              >
                <h1 style={styles.headline}>
                  Беги
                  <br />
                  на максимум!
                </h1>

                <div
                  style={{
                    ...styles.queueBlock,
                    ...(!loadingQueue && queueCards.length === 0 ? styles.queueBlockEmpty : null),
                  }}
                >
                  {!loadingQueue && queueCards.length > 0 ? (
                    <p style={styles.queueTitle}>
                      <span style={styles.queueTitleWhite}>Очередь забега</span>
                      <span style={styles.queueTitleWhite}>:</span>
                      <span> </span>
                      <span style={styles.queueAccent}>{queueSummary}</span>
                    </p>
                  ) : null}

                  {!loadingQueue && queueCards.length === 0 ? (
                    <div
                      role="status"
                      aria-live="polite"
                      style={styles.trackFreeStatus}
                    >
                      <span style={styles.trackFreeStatusText}>Дорожка свободна</span>
                    </div>
                  ) : null}

                  {!loadingQueue && queueCards.length > 0 ? (
                    <div className="ar-ozio-cards-scroll" style={styles.cardsRow}>
                      {queueCards.map((card, i) => {
                        const isActive = i === 0;
                        const nameParts = splitParticipantNameParts(card.participantName);
                        return (
                          <article
                            key={card.runSessionId}
                            style={{
                              ...styles.card,
                              ...(isActive ? styles.cardActive : styles.cardInactive),
                            }}
                          >
                            <div style={styles.cardTop}>
                              <span style={styles.cardOrder}>
                                {String(i + 1).padStart(2, '0')}
                              </span>
                              <span
                                style={{
                                  ...styles.tagPill,
                                  ...(isActive ? styles.tagPillActive : styles.tagPillInactive),
                                }}
                              >
                                {getRunTypeShortName(card.runTypeId)}
                              </span>
                            </div>
                            <div style={styles.cardName}>
                              <span style={styles.cardNameLine}>{nameParts.surname}</span>
                              {nameParts.firstName != null ? (
                                <span style={styles.cardNameLine}>{nameParts.firstName}</span>
                              ) : null}
                              {nameParts.patronymic != null && nameParts.patronymic.length > 0 ? (
                                <span style={styles.cardNameLine}>{nameParts.patronymic}</span>
                              ) : null}
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
            </div>
          </section>

          <nav
            style={{
              ...styles.bottomNav,
              opacity: heroFullLoaded ? 1 : 0,
              transition: 'opacity 280ms ease-out',
              pointerEvents: heroFullLoaded ? 'auto' : 'none',
            }}
            aria-label="Основные действия"
          >
            <Link to={TD_LEADERBOARD_WAITING_PATH} style={styles.btnLeaderboard}>
              Лидерборд
            </Link>
            <Link to="/register" style={styles.btnParticipate} onClick={onParticipateClick}>
              Принять участие
            </Link>
          </nav>
        </ScreenContainer>
      <AdminPinModal open={pinModalOpen} onClose={() => setPinModalOpen(false)} />
    </ArOzioViewport>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    gap: w(32),
    justifyContent: 'space-between',
  },
  heroSection: {
    position: 'relative',
    flex: 1,
    minHeight: 0,
    display: 'flex',
    flexDirection: 'column',
    borderRadius: w(70),
    overflow: 'hidden',
  },
  heroBgPlate: {
    position: 'absolute',
    left: '50%',
    top: '50%',
    transform: 'translate(-50%, -50%)',
    width: '100%',
    height: '100%',
    borderRadius: w(70),
    background: ui.color.panel,
    boxShadow: `inset 0 -280px 250px -350px ${ui.color.red}`,
    pointerEvents: 'none',
  },
  heroContentLayer: {
    position: 'relative',
    zIndex: 3,
    flex: 1,
    minHeight: 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'stretch',
  },
  heroLqImage: {
    position: 'absolute',
    width: '100%',
    height: '121.36%',
    left: 0,
    top: '-19.65%',
    objectFit: 'cover',
    filter: 'blur(28px)',
    transform: 'scale(1.08)',
    opacity: 1,
  },
  logoRow: {
    position: 'relative',
    zIndex: 2,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    /** Figma 964:1493 — py-[50px] вокруг логотипа. */
    padding: `${h(50)} ${w(40)} ${h(50)}`,
  },
  logoMark: {
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  heroImageWrap: {
    position: 'absolute',
    left: '50%',
    top: '50%',
    transform: 'translate(-50%, -50%)',
    width: '100%',
    height: '100%',
    borderRadius: w(70),
    overflow: 'hidden',
    opacity: 0.5,
    mixBlendMode: 'color-dodge',
    pointerEvents: 'none',
  },
  heroPicture: {
    position: 'absolute',
    inset: 0,
    width: '100%',
    height: '100%',
    margin: 0,
    display: 'block',
  },
  heroImage: {
    position: 'absolute',
    width: '100%',
    height: '121.36%',
    left: 0,
    top: '-19.65%',
    objectFit: 'cover',
  },
  heroForeground: {
    position: 'relative',
    zIndex: 3,
    flex: 1,
    minHeight: 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'stretch',
    /** Figma 964:1491 — px-40 pb-40, без верхнего паддинга (учтён логотип). */
    padding: `0 ${w(40)} ${h(40)}`,
    justifyContent: 'flex-start',
  },
  /**
   * Figma 964:1491: заголовок top = calc(50% − 155px) при высоте панели 1032px → 361px от верха;
   * блок логотипа ~137px → 361 − 137 = 224px до заголовка. Между заголовком и «Дорожка свободна» ~31px.
   */
  heroMainStack: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: w(31),
    marginTop: h(224),
    width: '100%',
  },
  headline: {
    margin: 0,
    fontWeight: 400,
    fontSize: w(128),
    lineHeight: 1,
    textTransform: 'uppercase',
    color: ui.color.text,
  },
  queueBlock: {
    display: 'flex',
    flexDirection: 'column',
    gap: w(40),
    minHeight: h(420),
  },
  queueBlockEmpty: {
    gap: 0,
    minHeight: h(103),
  },
  queueTitle: {
    margin: 0,
    fontWeight: 400,
    fontSize: w(48),
    lineHeight: 1.2,
    textTransform: 'uppercase',
  },
  queueTitleWhite: {
    color: ui.color.text,
  },
  queueAccent: {
    color: ui.color.red,
  },
  cardsRow: {
    display: 'flex',
    flexDirection: 'row',
    gap: w(29),
    overflowX: 'auto',
    WebkitOverflowScrolling: 'touch',
  },
  /** Figma node 964:2878 — статус «Дорожка свободна», не интерактивный. */
  trackFreeStatus: {
    alignSelf: 'flex-start',
    width: w(648),
    minHeight: h(103),
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: `${h(24)} ${w(32)}`,
    borderRadius: w(40),
    background: 'rgba(230, 35, 58, 0.58)',
    borderTop: `${w(2)} solid #ff3e55`,
    pointerEvents: 'none',
  },
  trackFreeStatusText: {
    margin: 0,
    fontFamily: "'Druk Wide Cyr', 'Oswald', system-ui, sans-serif",
    fontWeight: 400,
    fontSize: w(30),
    lineHeight: 1,
    textTransform: 'uppercase',
    color: ui.color.text,
    textAlign: 'center',
    width: '100%',
  },
  card: {
    flex: '0 0 auto',
    width: w(647),
    minHeight: h(311),
    boxSizing: 'border-box',
    borderRadius: w(40),
    padding: w(24),
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
  },
  cardActive: {
    backgroundColor: ui.color.red,
  },
  cardInactive: {
    backgroundColor: '#000000',
  },
  cardTop: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    gap: w(10),
    width: '100%',
  },
  cardOrder: {
    flex: '1 0 0',
    fontWeight: 400,
    fontSize: w(30),
    lineHeight: 1,
    textTransform: 'uppercase',
    color: ui.color.text,
  },
  tagPill: {
    fontWeight: 400,
    fontSize: w(20),
    lineHeight: 1.2,
    textTransform: 'uppercase',
    color: ui.color.text,
    padding: `${h(10)} ${w(12)}`,
    borderRadius: w(16),
    whiteSpace: 'nowrap',
  },
  tagPillActive: {
    backgroundColor: '#b02838',
  },
  tagPillInactive: {
    backgroundColor: '#141414',
  },
  cardName: {
    fontWeight: 400,
    fontSize: w(40),
    lineHeight: 1,
    textTransform: 'uppercase',
    color: ui.color.text,
    textAlign: 'left',
    minWidth: 0,
    width: '100%',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    gap: 0,
    alignItems: 'stretch',
  },
  /** Одна строка ФИО: свой ellipsis; column flex + gap 0 без br между block-строками (br давал лишнюю высоту line-box). */
  cardNameLine: {
    flexShrink: 0,
    minWidth: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    maxWidth: '100%',
    lineHeight: 1.1,
  },
  bottomNav: {
    display: 'flex',
    flexDirection: 'row',
    flexWrap: 'nowrap',
    gap: w(32),
    width: '100%',
    flexShrink: 0,
  },
  btnLeaderboard: {
    flex: '1 1 0',
    minWidth: 0,
    minHeight: h(270),
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#000',
    color: ui.color.text,
    fontWeight: 400,
    fontSize: w(56),
    lineHeight: 1,
    textTransform: 'uppercase',
    textDecoration: 'none',
    borderRadius: w(48),
    border: `1px solid ${ui.color.panelBorder}`,
    boxSizing: 'border-box',
  },
  btnParticipate: {
    flex: '1 1 0',
    minWidth: 0,
    minHeight: h(270),
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: ui.color.red,
    color: ui.color.text,
    fontWeight: 400,
    fontSize: w(56),
    lineHeight: 1,
    textTransform: 'uppercase',
    textDecoration: 'none',
    borderRadius: w(48),
    boxSizing: 'border-box',
  },
};
