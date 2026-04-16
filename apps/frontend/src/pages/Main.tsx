import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Gender, RunTypeId } from '@treadmill-challenge/shared';
import { getRunTypeShortName } from '@treadmill-challenge/shared';
import { ArOzioViewport } from '../arOzio/ArOzioViewport';
import { ScreenContainer } from '../arOzio/ScreenContainer';
import { h, w } from '../arOzio/dimensions';
import { api } from '../api/client';
import { AdminPinModal } from '../features/admin/AdminPinModal';
import { logEvent } from '../logging/logEvent';
import { pluralizePeople } from '../utils/russianPlural';

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
  sex: Gender;
};

function splitNameLines(fullName: string): { nameLine1: string; nameLine2?: string } {
  const text = fullName.trim();
  if (!text) return { nameLine1: 'Участник' };
  const parts = text.split(/\s+/);
  if (parts.length <= 1) return { nameLine1: parts[0] };
  return { nameLine1: parts[0], nameLine2: parts.slice(1).join(' ') };
}

const ADMIN_TAP_SEQ = ['amazing', 'amazing', 'red', 'red', 'amazing', 'red'] as const;

export default function Main() {
  const [queueCards, setQueueCards] = useState<QueueCardItem[]>([]);
  const [loadingQueue, setLoadingQueue] = useState(true);
  const [queueBlockVisible, setQueueBlockVisible] = useState(false);
  const [heroFullLoaded, setHeroFullLoaded] = useState(false);
  const [pinModalOpen, setPinModalOpen] = useState(false);
  const heroFullImgRef = useRef<HTMLImageElement>(null);
  const adminTapIdx = useRef(0);

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
              <p style={styles.logoMark} aria-label="AMAZING RED">
                <span
                  style={styles.logoAmazing}
                  onClick={() => onAdminTap('amazing')}
                  role="presentation"
                >
                  AMAZING
                </span>
                <span style={styles.logoRed} onClick={() => onAdminTap('red')} role="presentation">
                  RED
                </span>
              </p>
            </div>

            <div style={styles.heroForeground}>
              <h1 style={styles.headline}>
                Беги
                <br />
                на максимум!
              </h1>

              <div
                style={{
                  ...styles.queueBlock,
                  opacity: blockShown ? 1 : 0,
                  transform: blockShown ? 'translateY(0)' : `translateY(${h(10)})`,
                  transition: 'opacity 280ms ease-out, transform 280ms ease-out',
                  willChange: blockShown ? undefined : 'opacity, transform',
                }}
              >
                <p style={styles.queueTitle}>
                  <span style={styles.queueTitleWhite}>Очередь забега</span>
                  <span style={styles.queueTitleWhite}>:</span>
                  <span> </span>
                  <span style={styles.queueAccent}>{queueSummary}</span>
                </p>

                {!loadingQueue && queueCards.length === 0 ? (
                  <article style={styles.emptyQueueState}>
                    <p style={styles.emptyQueueTitle}>Очереди нет</p>
                    <p style={styles.emptyQueueText}>Стань первым участником этого забега</p>
                  </article>
                ) : (
                  <div className="ar-ozio-cards-scroll" style={styles.cardsRow}>
                    {queueCards.map((card, i) => {
                      const isActive = i === 0;
                      const { nameLine1, nameLine2 } = splitNameLines(card.participantName);
                      return (
                        <article
                          key={card.runSessionId}
                          style={{
                            ...styles.card,
                            ...(isActive ? styles.cardActive : styles.cardInactive),
                          }}
                        >
                          <div style={styles.cardTop}>
                            <span style={styles.cardOrder}>{String(i + 1)}</span>
                            <span
                              style={{
                                ...styles.tagPill,
                                ...(isActive ? styles.tagPillActive : styles.tagPillInactive),
                              }}
                            >
                              {getRunTypeShortName(card.runTypeId)}
                            </span>
                            <span
                              style={{
                                ...styles.tagPill,
                                ...(isActive ? styles.tagPillActive : styles.tagPillInactive),
                                marginLeft: w(8),
                              }}
                            >
                              {card.sex === 'female' ? 'Ж' : 'М'}
                            </span>
                          </div>
                          <div style={styles.cardName}>
                            <span>{nameLine1}</span>
                            {nameLine2 != null && (
                              <>
                                <br />
                                <span>{nameLine2}</span>
                              </>
                            )}
                          </div>
                        </article>
                      );
                    })}
                  </div>
                )}
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
            <Link to="/leaderboard" style={styles.btnLeaderboard}>
              Лидерборд
            </Link>
            <Link
              to="/register"
              style={styles.btnParticipate}
              onClick={() =>
                logEvent(
                  'landing_click_register',
                  {},
                  { readableMessage: 'Пользователь нажал кнопку «Принять участие»' }
                )
              }
            >
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
    background: '#080809',
    boxShadow: 'inset 0 -280px 250px -350px #e6233a',
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
    padding: `${h(50)} ${w(40)} 0`,
  },
  logoMark: {
    margin: 0,
    display: 'flex',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'baseline',
    gap: '0.28em',
    fontSize: w(37),
    lineHeight: 1,
    letterSpacing: '0.02em',
    textTransform: 'uppercase',
    fontWeight: 400,
  },
  logoAmazing: {
    color: '#ffffff',
    cursor: 'pointer',
    userSelect: 'none',
  },
  logoRed: {
    color: '#e6233a',
    cursor: 'pointer',
    userSelect: 'none',
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
    gap: w(68),
    padding: `${h(40)} ${w(40)} ${h(40)}`,
    justifyContent: 'flex-end',
  },
  headline: {
    margin: 0,
    fontWeight: 400,
    fontSize: w(128),
    lineHeight: 1,
    textTransform: 'uppercase',
    color: '#fff',
  },
  queueBlock: {
    display: 'flex',
    flexDirection: 'column',
    gap: w(40),
    minHeight: h(420),
  },
  queueTitle: {
    margin: 0,
    fontWeight: 400,
    fontSize: w(48),
    lineHeight: 1.2,
    textTransform: 'uppercase',
  },
  queueTitleWhite: {
    color: '#fff',
  },
  queueAccent: {
    color: '#e6233a',
  },
  cardsRow: {
    display: 'flex',
    flexDirection: 'row',
    gap: w(29),
    overflowX: 'auto',
    WebkitOverflowScrolling: 'touch',
  },
  emptyQueueState: {
    minHeight: h(220),
    borderRadius: w(40),
    border: '1px solid rgba(255,255,255,0.14)',
    background: 'rgba(255,255,255,0.04)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: h(12),
    padding: `${h(22)} ${w(24)}`,
  },
  emptyQueueTitle: {
    margin: 0,
    fontSize: w(56),
    lineHeight: 1.05,
    textTransform: 'uppercase',
    color: '#fff',
  },
  emptyQueueText: {
    margin: 0,
    fontSize: w(30),
    lineHeight: 1.2,
    color: 'rgba(255,255,255,0.72)',
    textTransform: 'uppercase',
    textAlign: 'center',
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
    backgroundColor: '#e6233a',
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
    color: '#fff',
  },
  tagPill: {
    fontWeight: 400,
    fontSize: w(20),
    lineHeight: 1.2,
    textTransform: 'uppercase',
    color: '#fff',
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
    lineHeight: 1.1,
    textTransform: 'uppercase',
    color: '#fff',
    textAlign: 'left',
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
    color: '#fff',
    fontWeight: 400,
    fontSize: w(56),
    lineHeight: 1,
    textTransform: 'uppercase',
    textDecoration: 'none',
    borderRadius: w(48),
    border: '1px solid #1e1e1e',
    boxSizing: 'border-box',
  },
  btnParticipate: {
    flex: '1 1 0',
    minWidth: 0,
    minHeight: h(270),
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#e6233a',
    color: '#fff',
    fontWeight: 400,
    fontSize: w(56),
    lineHeight: 1,
    textTransform: 'uppercase',
    textDecoration: 'none',
    borderRadius: w(48),
    boxSizing: 'border-box',
  },
};
