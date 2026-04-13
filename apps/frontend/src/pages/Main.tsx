import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import type { RunTypeId } from '@treadmill-challenge/shared';
import { getRunTypeShortName } from '@treadmill-challenge/shared';
import { ArOzioViewport } from '../arOzio/ArOzioViewport';
import { h, w } from '../arOzio/dimensions';
import { api } from '../api/client';

/** Figma: AR x OZIO — iPad, «Заставка фоновая» (426:474), canvas 2360×1640 */
const ASSET_HERO_BG =
  'https://www.figma.com/api/mcp/asset/88913198-2966-446c-af0a-00cfe2c16047';

type QueueCardItem = {
  runSessionId: string;
  queueNumber: number;
  participantName: string;
  runTypeId: RunTypeId;
  runType: string;
  status: string;
};

function splitNameLines(fullName: string): { nameLine1: string; nameLine2?: string } {
  const text = fullName.trim();
  if (!text) return { nameLine1: 'Участник' };
  const parts = text.split(/\s+/);
  if (parts.length <= 1) return { nameLine1: parts[0] };
  return { nameLine1: parts[0], nameLine2: parts.slice(1).join(' ') };
}

export default function Main() {
  const [queueCards, setQueueCards] = useState<QueueCardItem[]>([]);
  const [loadingQueue, setLoadingQueue] = useState(true);

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
          const sorted = [...data.entries].sort((a, b) => a.queueNumber - b.queueNumber);
          setQueueCards(sorted);
        }
      } catch {
        if (!cancelled) {
          setQueueCards([]);
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
  const activeRunningId = useMemo(
    () => queueCards.find((card) => card.status === 'running')?.runSessionId ?? null,
    [queueCards]
  );

  return (
    <ArOzioViewport>
      <div style={styles.page}>
          <section style={styles.heroSection} aria-label="Заставка">
            <div style={styles.heroBgPlate} aria-hidden />
            <div style={styles.logoRow}>
              <p style={styles.logoMark} aria-label="AMAZING RED">
                <span style={styles.logoAmazing}>AMAZING</span>
                <span style={styles.logoRed}>RED</span>
              </p>
            </div>
            <div style={styles.heroImageWrap} aria-hidden>
              <img src={ASSET_HERO_BG} alt="" style={styles.heroImage} />
            </div>

            <div style={styles.heroForeground}>
              <h1 style={styles.headline}>
                Беги
                <br />
                на максимум!
              </h1>

              <div style={styles.queueBlock}>
                <p style={styles.queueTitle}>
                  <span style={styles.queueTitleWhite}>Очередь забега</span>
                  <span style={styles.queueTitleWhite}>:</span>
                  <span> </span>
                  <span style={styles.queueAccent}>{queuePeopleCount} человек</span>
                </p>

                <div className="ar-ozio-cards-scroll" style={styles.cardsRow}>
                  {!loadingQueue && queueCards.length === 0 ? (
                    <article style={{ ...styles.card, ...styles.cardInactive }}>
                      <div style={styles.cardTop}>
                        <span style={styles.cardOrder}>--</span>
                        <span style={{ ...styles.tagPill, ...styles.tagPillInactive }}>Очередь</span>
                      </div>
                      <div style={styles.cardName}>Пока нет участников</div>
                    </article>
                  ) : (
                    queueCards.map((card, i) => {
                      const isActive = activeRunningId
                        ? card.runSessionId === activeRunningId
                        : i === 0;
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
                            <span style={styles.cardOrder}>{String(card.queueNumber).padStart(2, '0')}</span>
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
                    })
                  )}
                </div>
              </div>
            </div>
          </section>

          <nav style={styles.bottomNav} aria-label="Основные действия">
            <Link to="/leaderboard" style={styles.btnLeaderboard}>
              Лидерборд
            </Link>
            <Link to="/register" style={styles.btnParticipate}>
              Принять участие
            </Link>
          </nav>
        </div>
    </ArOzioViewport>
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
    gap: w(32),
    paddingLeft: w(120),
    paddingRight: w(120),
    paddingTop: h(12),
    paddingBottom: h(12),
    boxSizing: 'border-box',
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
  },
  logoRed: {
    color: '#e6233a',
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
    backgroundColor: '#1e1e1e',
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
