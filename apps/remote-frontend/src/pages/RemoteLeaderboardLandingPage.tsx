import { Fragment, useCallback, useEffect, useState, type CSSProperties } from 'react';
import { RemoteLeaderboardView } from './RemoteLeaderboardPage';
import rootPackage from '../../../../package.json';
import './RemoteLeaderboardLandingPage.css';

const PRODUCT_VERSION = rootPackage.version;
const FONT_GATE_TIMEOUT_MS = 3_000;
const LEADERBOARD2_DESKTOP_WIDTH = 1364;
const LEADERBOARD2_PHONE_WIDTH = 520;
const LEADERBOARD2_FONT_REQUESTS = [
  '500 16px "Druk Wide Cyr"',
  '700 16px "Druk Wide Cyr"',
  '500 16px "Druk Cyr"',
  '400 16px "Proxima Nova"',
  '500 16px "Proxima Nova"',
  '600 16px "Proxima Nova"',
];
const LEADERBOARD2_PRELOAD_IMAGES = [
  '/assets/leaderboard2/prize-shoe-deviate-nitro-4-figma.png',
  '/assets/leaderboard2/prize-rings-figma.svg',
];

type CountdownState = {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
};

const COUNTDOWN_LABELS: Array<{ key: keyof CountdownState; label: string }> = [
  { key: 'days', label: 'Дней' },
  { key: 'hours', label: 'Часов' },
  { key: 'minutes', label: 'Мин' },
  { key: 'seconds', label: 'Сек' },
];

function getMonthFinishAt(now: Date): Date {
  const target = new Date(now.getFullYear(), now.getMonth() + 1, 0, 22, 0, 0, 0);
  if (now.getTime() < target.getTime()) return target;
  return new Date(now.getFullYear(), now.getMonth() + 2, 0, 22, 0, 0, 0);
}

function getCountdownState(now = new Date()): CountdownState {
  const msLeft = Math.max(0, getMonthFinishAt(now).getTime() - now.getTime());
  const totalSeconds = Math.floor(msLeft / 1000);
  const days = Math.floor(totalSeconds / 86_400);
  const hours = Math.floor((totalSeconds % 86_400) / 3_600);
  const minutes = Math.floor((totalSeconds % 3_600) / 60);
  const seconds = totalSeconds % 60;
  return { days, hours, minutes, seconds };
}

function formatCountdownPart(value: number): string {
  return String(Math.max(0, value)).padStart(2, '0');
}

function formatParticipantCount(value: number): string {
  return new Intl.NumberFormat('ru-RU').format(Math.max(0, value));
}

function getParticipantNoun(value: number): string {
  const abs = Math.abs(value);
  const lastTwo = abs % 100;
  const last = abs % 10;
  if (lastTwo >= 11 && lastTwo <= 14) return 'человек';
  if (last === 1) return 'человек';
  if (last >= 2 && last <= 4) return 'человека';
  return 'человек';
}

const STEPS = [
  {
    number: '01',
    title: 'Выбери дисциплину',
    text: 'Определи формат, в котором хочешь показать максимум.',
  },
  {
    number: '02',
    title: 'Покажи результат',
    text: 'Пробеги дистанцию на интерактивной дорожке - система зафиксирует результат.',
  },
  {
    number: '03',
    title: 'Следи за позицией',
    text: 'Возвращайся в лидерборд и смотри, как меняется твое место в рейтинге.',
  },
];

const DISCIPLINES = [
  {
    title: 'Максимум за 5 минут',
    titleLines: ['Максимум', 'за 5 минут'],
    text: 'Пробеги максимальное расстояние за 5 минут.',
    desktopDescription: [
      { text: 'Пробеги максимальное расстояние за 5 минут.' },
      { text: 'Максимум мощности' },
      { text: 'за короткое время' },
    ],
    image: '/assets/leaderboard2/mode-5min-figma.png',
  },
  {
    title: 'Золотой километр',
    titleLines: ['Золотой', 'километр'],
    text: 'Один километр на время: короткая дистанция, где важна каждая секунда.',
    desktopDescription: [
      { text: 'Сотвори историю' },
      { text: 'Покажи лучшее время' },
      { text: 'на дистанции 1 километр', bold: true },
    ],
    image: '/assets/leaderboard2/mode-golden-figma.png',
  },
  {
    title: 'Стайер-спринт на 5 км',
    titleLines: ['Стайер-спринт', 'на 5 км'],
    text: 'Пять километров на выносливость и стабильный темп до финиша.',
    desktopDescription: [{ text: 'Пять километров на выносливость и стабильный темп до финиша.' }],
    image: '/assets/leaderboard2/mode-stayer-figma.png',
  },
];

const PRIZES = [
  {
    label: 'Призы месяца:',
    brand: 'PUMA',
    model: 'DEVIATE NITRO 4',
    text: 'Главный приз для лучших участников месяца в каждой дисциплине.',
    image: '/assets/leaderboard2/prize-shoe-deviate-nitro-4-figma.png',
  },
  {
    label: 'Готов попасть в топ-10?',
    brand: 'PUMA',
    model: 'DEVIATE NITRO 4',
    text: 'Выбирай дисциплину, показывай максимум и следи за своим результатом в рейтинге.',
    image: '/assets/leaderboard2/prize-shoe-deviate-nitro-4-figma.png',
  },
];

const FAQ = [
  {
    q: 'Как определяется победитель?',
    a: 'Лучший результат месяца в каждой дисциплине среди мужчин и женщин.',
  },
  { q: 'Можно ли улучшить результат?', a: 'Да, возвращайся и пробуй снова в выбранной дисциплине.' },
  { q: 'Когда обновляется рейтинг?', a: 'Рейтинг обновляется после фиксации результата забега.' },
  { q: 'Сколько всего победителей?', a: 'Каждый месяц выбираются 6 победителей.' },
];

const HISTORY = {
  female: [
    { run: 'Стайер-спринт на 5 км', name: 'Кабанова Настя', result: '--:--' },
    { run: 'Золотой километр', name: 'Газалова Диана', result: '05:20.38' },
    { run: 'Максимум за 5 минут', name: 'Смирнова Анна', result: '15 м' },
  ],
  male: [
    { run: 'Стайер-спринт на 5 км', name: 'Клюка Дмитрий', result: '--:--' },
    { run: 'Золотой километр', name: 'Князев Максим', result: '03:34.22' },
    { run: 'Максимум за 5 минут', name: 'Дд Иван', result: '1242 м' },
  ],
} satisfies Record<'female' | 'male', Array<{ run: string; name: string; result: string }>>;

const HISTORY_MONTHS = ['Май 2026', 'Июнь 2026', 'Июль 2026', 'Август 2026', 'Сентябрь 2026', 'Октябрь 2026', 'Ноябрь 2026', 'Декабрь 2026'];

function loopIndex(current: number, delta: -1 | 1, length: number) {
  return (current + delta + length) % length;
}

function splitHistoryName(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length <= 1) return { lastName: name, firstName: '' };
  return { lastName: parts[0], firstName: parts.slice(1).join(' ') };
}

function CarouselButton({
  direction,
  onClick,
  label,
}: {
  direction: 'prev' | 'next';
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      className={`leaderboard2__carouselButton leaderboard2__carouselButton--${direction}`}
      type="button"
      onClick={onClick}
      aria-label={label}
    >
      <span className="leaderboard2__carouselIcon" aria-hidden />
    </button>
  );
}

export default function RemoteLeaderboardLandingPage() {
  const [activeDiscipline, setActiveDiscipline] = useState(0);
  const [disciplineDirection, setDisciplineDirection] = useState<'prev' | 'next'>('next');
  const [activePrize, setActivePrize] = useState(0);
  const [countdown, setCountdown] = useState<CountdownState>(() => getCountdownState());
  const [participantCount, setParticipantCount] = useState(0);
  const [isJoinPopupOpen, setIsJoinPopupOpen] = useState(false);
  const [fontsReady, setFontsReady] = useState(false);
  const [historyGender, setHistoryGender] = useState<'female' | 'male'>('male');
  const [historyMonth, setHistoryMonth] = useState(HISTORY_MONTHS[0]);
  const discipline = DISCIPLINES[activeDiscipline];
  const prize = PRIZES[activePrize];
  const mobilePrizeModelParts = [prize.model];
  const handleEntryCountChange = useCallback((count: number) => {
    setParticipantCount(count);
  }, []);
  const handleJoinPopupClick = useCallback((event: { preventDefault: () => void }) => {
    event.preventDefault();
    setIsJoinPopupOpen(true);
  }, []);
  const handleDisciplineChange = useCallback((direction: -1 | 1) => {
    setDisciplineDirection(direction < 0 ? 'prev' : 'next');
    setActiveDiscipline((current) => loopIndex(current, direction, DISCIPLINES.length));
  }, []);

  useEffect(() => {
    document.body.classList.add('leaderboard2-route');
    let frame = 0;

    const updateResponsiveStage = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        const viewportWidth = window.innerWidth;
        const phoneWidth = viewportWidth <= LEADERBOARD2_PHONE_WIDTH;
        const touchTabletWidth = window.matchMedia('(max-width: 900px) and (hover: none) and (pointer: coarse)').matches;
        const useMobileLayout = phoneWidth || (touchTabletWidth && navigator.maxTouchPoints > 0);
        const useDesktopScale = !useMobileLayout && viewportWidth < LEADERBOARD2_DESKTOP_WIDTH;
        const scale = Math.min(1, viewportWidth / LEADERBOARD2_DESKTOP_WIDTH);
        document.body.classList.toggle('leaderboard2-route--desktop-scaled', useDesktopScale);
        document.documentElement.style.setProperty('--lb2-desktop-scale', String(scale));

        const page = document.querySelector<HTMLElement>('.leaderboard2');
        const scaledHeight = page ? Math.ceil(page.scrollHeight * scale) : window.innerHeight;
        document.documentElement.style.setProperty('--lb2-desktop-scaled-height', `${scaledHeight}px`);
      });
    };

    updateResponsiveStage();
    window.addEventListener('resize', updateResponsiveStage);
    window.addEventListener('orientationchange', updateResponsiveStage);

    const page = document.querySelector<HTMLElement>('.leaderboard2');
    const resizeObserver = page && 'ResizeObserver' in window ? new ResizeObserver(updateResponsiveStage) : null;
    if (page && resizeObserver) {
      resizeObserver.observe(page);
    }

    const hash = window.location.hash;
    if (hash) {
      window.setTimeout(() => {
        document.querySelector(hash)?.scrollIntoView({ block: 'start' });
      }, 0);
    }

    return () => {
      window.cancelAnimationFrame(frame);
      resizeObserver?.disconnect();
      window.removeEventListener('resize', updateResponsiveStage);
      window.removeEventListener('orientationchange', updateResponsiveStage);
      document.body.classList.remove('leaderboard2-route', 'leaderboard2-route--desktop-scaled');
      document.documentElement.style.removeProperty('--lb2-desktop-scale');
      document.documentElement.style.removeProperty('--lb2-desktop-scaled-height');
    };
  }, []);

  useEffect(() => {
    const links = LEADERBOARD2_PRELOAD_IMAGES.map((href) => {
      const existing = document.head.querySelector<HTMLLinkElement>(`link[rel="preload"][as="image"][href="${href}"]`);
      if (existing) return null;
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'image';
      link.href = href;
      document.head.appendChild(link);
      return link;
    });

    return () => {
      links.forEach((link) => link?.remove());
    };
  }, []);

  useEffect(() => {
    const fontSet = document.fonts;
    if (!fontSet?.load) {
      setFontsReady(true);
      return undefined;
    }

    let cancelled = false;
    const timeout = window.setTimeout(() => {
      if (!cancelled) setFontsReady(true);
    }, FONT_GATE_TIMEOUT_MS);

    Promise.all([...LEADERBOARD2_FONT_REQUESTS.map((font) => fontSet.load(font)), fontSet.ready])
      .catch(() => undefined)
      .then(() => {
        if (cancelled) return;
        window.clearTimeout(timeout);
        window.requestAnimationFrame(() => {
          if (!cancelled) setFontsReady(true);
        });
      });

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, []);

  useEffect(() => {
    const updateCountdown = () => setCountdown(getCountdownState());
    updateCountdown();
    const timer = window.setInterval(updateCountdown, 1_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!isJoinPopupOpen) return undefined;
    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsJoinPopupOpen(false);
    };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isJoinPopupOpen]);

  return (
    <main className={`leaderboard2 ${fontsReady ? 'leaderboard2--fontGateReady' : 'leaderboard2--fontGate'}`} aria-busy={!fontsReady}>
      <section className="leaderboard2__heroCard" aria-label="Treadmill Challenge">
        <span className="leaderboard2__version leaderboard2__version--top" aria-label={`Версия продукта ${PRODUCT_VERSION}`}>
          v{PRODUCT_VERSION}
        </span>
        <div className="leaderboard2__heroMedia" aria-hidden />
        <div className="leaderboard2__heroBracket leaderboard2__heroBracket--left" aria-hidden />
        <div className="leaderboard2__heroBracket leaderboard2__heroBracket--right" aria-hidden />
        <svg className="leaderboard2__heroCenterMarker" viewBox="0 0 20 20" aria-hidden="true" focusable="false">
          <g fill="none" stroke="currentColor" strokeLinecap="square" strokeWidth="0.8">
            <path d="M1 4V1h3" />
            <path d="M16 1h3v3" />
            <path d="M19 16v3h-3" />
            <path d="M4 19H1v-3" />
          </g>
          <g fill="none" stroke="currentColor" strokeWidth="0.7">
            <circle cx="10" cy="10" r="5.35" />
            <path d="M4.65 10h10.7M10 4.65v10.7M6.15 7.25h7.7M6.15 12.75h7.7" />
            <path d="M8.45 4.95C7.05 6.6 6.35 8.28 6.35 10s.7 3.4 2.1 5.05M11.55 4.95c1.4 1.65 2.1 3.33 2.1 5.05s-.7 3.4-2.1 5.05" />
          </g>
        </svg>
        <div className="leaderboard2__place leaderboard2__place--city">
          <span>Москва</span>
        </div>
        <div className="leaderboard2__place leaderboard2__place--address">
          <span>Ходынский бульвар 4</span>
        </div>
        <h1 className="leaderboard2__heroTitle">
          <span className="leaderboard2__heroTitleFirstLine">Беги</span>
          <br />
          <span className="leaderboard2__heroTitleSecondLine">
            на <br className="leaderboard2__heroMobileBreak" />
            максимум.
          </span>
        </h1>
      </section>

      <section className="leaderboard2__timerCard" aria-label="До обновления итогов">
        <div className="leaderboard2__timer">
          <div className="leaderboard2__timerValues">
            {COUNTDOWN_LABELS.map((part, index) => (
              <Fragment key={part.label}>
                <span className="leaderboard2__timerValue">{formatCountdownPart(countdown[part.key])}</span>
                {index < COUNTDOWN_LABELS.length - 1 ? <span className="leaderboard2__timerSeparator">:</span> : null}
              </Fragment>
            ))}
          </div>
          <div className="leaderboard2__timerLabels">
            {COUNTDOWN_LABELS.map((part) => (
              <span className="leaderboard2__timerLabel" key={part.label}>{part.label}</span>
            ))}
          </div>
        </div>
        <p className="leaderboard2__participants">
          <span>{formatParticipantCount(participantCount)}</span> {getParticipantNoun(participantCount)} уже {participantCount === 1 ? 'участвует' : 'участвуют'}
        </p>
      </section>

      <section className="leaderboard2__intro" aria-labelledby="leaderboard2-intro-title">
        <p className="leaderboard2__marker">[ 0 1 ]</p>
        <div className="leaderboard2__introContent">
          <h2 id="leaderboard2-intro-title" className="leaderboard2__introTitle">
            <span className="leaderboard2__introDesktop">
              Каждый месяц лучшие
              <br />
              мужчины и женщины в каждой
              <br />
              дисциплине получают пару
              <br />
              новых кроссовок.
            </span>
            <span className="leaderboard2__introMobile">
              Каждый месяц
              <br />
              лучшие мужчины
              <br />
              и женщины
              <br />
              в каждой
              <br />
              дисциплине
              <br />
              получают пару
              <br />
              новых кроссовок.
            </span>
          </h2>
          <div className="leaderboard2__actions">
            <a href="#rating">Смотреть рейтинг</a>
            <a href="#join" onClick={handleJoinPopupClick}>Принять вызов</a>
          </div>
        </div>
      </section>

      <section className="leaderboard2__stats" id="stats" aria-label="Параметры челленджа">
        <div className="leaderboard2__statsRay leaderboard2__statsRay--top" aria-hidden />
        <div className="leaderboard2__statsRay leaderboard2__statsRay--bottom" aria-hidden />
        <div className="leaderboard2__statsWordmark" aria-label="AMAZING RED">
          <span>AMAZING</span>
          <span>RED</span>
        </div>
        <img className="leaderboard2__statsShoe" src="/assets/leaderboard2/stats-layer-figma.png" alt="" />
        <div className="leaderboard2__statCell leaderboard2__statCell--modes">
          <strong>3</strong>
          <span>Беговых режима</span>
        </div>
        <div className="leaderboard2__statCell leaderboard2__statCell--winners">
          <strong>6</strong>
          <span>Победителей каждый месяц</span>
        </div>
      </section>

      <section className="leaderboard2__how" id="how" aria-labelledby="leaderboard2-how-title">
        <div className="leaderboard2__sectionHead leaderboard2__sectionHead--split">
          <p className="leaderboard2__marker">[ 0 2 ]</p>
          <h2 id="leaderboard2-how-title">Как это работает</h2>
        </div>
        <div className="leaderboard2__stepGrid">
          {STEPS.map((step, index) => (
            <article
              className={index === 0 ? 'leaderboard2__step leaderboard2__step--accent' : 'leaderboard2__step'}
              key={step.number}
            >
              <span>{step.number}</span>
              <div>
                <h3>{step.title}</h3>
                <p>{step.text}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="leaderboard2__disciplines" id="disciplines" aria-labelledby="leaderboard2-disciplines-title">
        <h2 id="leaderboard2-disciplines-title">Режимы забега</h2>
        <div
          key={activeDiscipline}
          className={`leaderboard2__modeCard leaderboard2__modeCard--${disciplineDirection}`}
          style={{ '--leaderboard2-mode-image': `url(${discipline.image})` } as CSSProperties}
        >
          <img className="leaderboard2__modeGlobes" src="/assets/leaderboard2/mode-globes.svg" alt="" aria-hidden />
          <img
            className="leaderboard2__modeMobileStrip"
            src="/assets/leaderboard2/mode-mobile-strip.svg"
            alt=""
            aria-hidden
          />
          <div className="leaderboard2__modeText">
            <strong>
              {discipline.titleLines.map((line) => (
                <span key={line}>{line}</span>
              ))}
            </strong>
            <p>
              <span className="leaderboard2__modeFullText">
                {discipline.desktopDescription.map((line, index) => (
                  <Fragment key={`${line.text}-${index}`}>
                    {index > 0 ? <br aria-hidden /> : null}
                    <span className={line.bold ? 'leaderboard2__modeDescriptionBold' : undefined}>{line.text}</span>
                  </Fragment>
                ))}
              </span>
              <span className="leaderboard2__modeShortText">
                {discipline.text.split('.')[0].split(' ').slice(0, 2).join(' ')}
                <br />
                {discipline.text.split('.')[0].split(' ').slice(2).join(' ')}.
              </span>
            </p>
          </div>
          <div className="leaderboard2__modeControls">
            <CarouselButton
              direction="prev"
              label="Предыдущий режим"
              onClick={() => handleDisciplineChange(-1)}
            />
            <CarouselButton
              direction="next"
              label="Следующий режим"
              onClick={() => handleDisciplineChange(1)}
            />
          </div>
          <a className="leaderboard2__modeCta" href="#join" onClick={handleJoinPopupClick}>
            Принять вызов
          </a>
        </div>
      </section>

      <section className="leaderboard2__rating" id="rating" aria-labelledby="leaderboard2-rating-title">
        <div className="leaderboard2__sectionHead leaderboard2__sectionHead--rating">
          <p className="leaderboard2__marker">[ 04 ]</p>
          <h2 id="leaderboard2-rating-title">
            <span>Рейтинг</span>
            {' '}
            <span>участников</span>
          </h2>
        </div>
        <div
          className="leaderboard2__leaderboardFrameWrap"
        >
          <RemoteLeaderboardView
            embed
            hideEmbedBrand
            embedSearchPlacement="stack-top"
            embedSearchPlaceholder="поиск участника"
            onEntryCountChange={handleEntryCountChange}
          />
        </div>
      </section>

    <section className="leaderboard2__prize" id="prizes" aria-label="Призы месяца">
        <span className="leaderboard2__cornerMark leaderboard2__cornerMark--topLeft" aria-hidden />
        <span className="leaderboard2__cornerMark leaderboard2__cornerMark--topRight" aria-hidden />
        <span className="leaderboard2__cornerMark leaderboard2__cornerMark--bottomLeft" aria-hidden />
        <span className="leaderboard2__cornerMark leaderboard2__cornerMark--bottomRight" aria-hidden />
        <img className="leaderboard2__prizeRings" src="/assets/leaderboard2/prize-rings-figma.svg" alt="" aria-hidden />
        <img className="leaderboard2__prizeShoeDodge" src="/assets/leaderboard2/prize-shoe-deviate-nitro-4-figma.png" alt="" aria-hidden />
        <img className="leaderboard2__prizeShoeMain" src="/assets/leaderboard2/prize-shoe-deviate-nitro-4-figma.png" alt="" aria-hidden />
        <span className="leaderboard2__prizeGlobe" aria-hidden>
          <img className="leaderboard2__prizeGlobeBrackets" src="/assets/leaderboard2/prize-globe-brackets-figma.svg" alt="" />
          <img className="leaderboard2__prizeGlobeIcon" src="/assets/leaderboard2/prize-globe-figma.svg" alt="" />
        </span>
        <div className="leaderboard2__prizeHeader">
          <CarouselButton
            direction="prev"
            label="Предыдущий приз"
            onClick={() => setActivePrize((current) => loopIndex(current, -1, PRIZES.length))}
          />
          <CarouselButton
            direction="next"
            label="Следующий приз"
            onClick={() => setActivePrize((current) => loopIndex(current, 1, PRIZES.length))}
          />
        </div>
        <img className="leaderboard2__prizeImage" src={prize.image} alt="" />
        <div className="leaderboard2__prizeText">
          <p>{prize.label}</p>
          <strong>{prize.brand}</strong>
          <span className="leaderboard2__prizeModel leaderboard2__prizeModel--desktop">{prize.model}</span>
          <span className="leaderboard2__prizeModel leaderboard2__prizeModel--mobile">
            {mobilePrizeModelParts.map((part, index) => (
              <span
                className={`leaderboard2__prizeModelLine leaderboard2__prizeModelLine--${index + 1}`}
                key={part}
              >
                {part}
              </span>
            ))}
          </span>
          <em>{prize.text}</em>
        </div>
      </section>

      <section className="leaderboard2__finalCta" id="final-cta">
        <h2>
          Готов попасть в топ-10
          <br />и забрать свою пару
        </h2>
        <strong>
          <span className="leaderboard2__finalCtaModelDesktop">Deviate Nitro 4?</span>
          <span className="leaderboard2__finalCtaModelMobile">DEVIATE NITRO 4?</span>
        </strong>
        <div className="leaderboard2__finalCtaGeo" aria-hidden>
          <span className="leaderboard2__finalCtaGeoDesktop">
            <span className="leaderboard2__finalCtaGeoCorner leaderboard2__finalCtaGeoCorner--topLeft" />
            <span className="leaderboard2__finalCtaGeoCorner leaderboard2__finalCtaGeoCorner--topRight" />
            <span className="leaderboard2__finalCtaGeoText">55.7508° N</span>
            <span className="leaderboard2__finalCtaGeoCorner leaderboard2__finalCtaGeoCorner--bottomLeft" />
            <span className="leaderboard2__finalCtaGeoCorner leaderboard2__finalCtaGeoCorner--bottomRight" />
          </span>
          <span className="leaderboard2__finalCtaGeoDesktop leaderboard2__finalCtaGeoDesktop--east">
            <span className="leaderboard2__finalCtaGeoCorner leaderboard2__finalCtaGeoCorner--topLeft" />
            <span className="leaderboard2__finalCtaGeoCorner leaderboard2__finalCtaGeoCorner--topRight" />
            <span className="leaderboard2__finalCtaGeoText">37.6172° E.</span>
            <span className="leaderboard2__finalCtaGeoCorner leaderboard2__finalCtaGeoCorner--bottomLeft" />
            <span className="leaderboard2__finalCtaGeoCorner leaderboard2__finalCtaGeoCorner--bottomRight" />
          </span>
          <p className="leaderboard2__finalCtaText">
            <span>Выбирай дисциплину, показывай максимум </span>
            <span>и следи за своим результатом в рейтинге</span>
          </p>
          <span className="leaderboard2__finalCtaGeoGroup">
            <span className="leaderboard2__finalCtaGeoCorner leaderboard2__finalCtaGeoCorner--topLeft" />
            <span className="leaderboard2__finalCtaGeoCorner leaderboard2__finalCtaGeoCorner--topRight" />
            <span className="leaderboard2__finalCtaGeoText">55.7508° N</span>
            <span className="leaderboard2__finalCtaGeoCorner leaderboard2__finalCtaGeoCorner--bottomLeft" />
            <span className="leaderboard2__finalCtaGeoCorner leaderboard2__finalCtaGeoCorner--bottomRight" />
          </span>
          <span className="leaderboard2__finalCtaGeoGroup">
            <span className="leaderboard2__finalCtaGeoCorner leaderboard2__finalCtaGeoCorner--topLeft" />
            <span className="leaderboard2__finalCtaGeoCorner leaderboard2__finalCtaGeoCorner--topRight" />
            <span className="leaderboard2__finalCtaGeoText">37.6172° E.</span>
            <span className="leaderboard2__finalCtaGeoCorner leaderboard2__finalCtaGeoCorner--bottomLeft" />
            <span className="leaderboard2__finalCtaGeoCorner leaderboard2__finalCtaGeoCorner--bottomRight" />
          </span>
        </div>
        <a href="#join" onClick={handleJoinPopupClick}>Принять вызов</a>
      </section>

      <section className="leaderboard2__faq" id="faq" aria-labelledby="leaderboard2-faq-title">
        <p className="leaderboard2__marker leaderboard2__faqMarker">[ 0 5 ]</p>
        <h2 id="leaderboard2-faq-title">
          <span>Частые</span>
          {' '}
          <span>вопросы</span>
        </h2>
        <div className="leaderboard2__faqList">
          {FAQ.map((item, index) => (
            <details key={item.q} open={index === 0}>
              <summary>
                <span>[{String(index + 1).padStart(2, '0')}]</span>
                <span className="leaderboard2__faqQuestion">{item.q}</span>
              </summary>
              <p>{item.a}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="leaderboard2__history" id="history" aria-labelledby="leaderboard2-history-title">
        <div className="leaderboard2__historyHead">
          <h2 id="leaderboard2-history-title">История забегов</h2>
          <label className="leaderboard2__historyMonth" aria-label="Месяц истории забегов">
            <select value={historyMonth} onChange={(event) => setHistoryMonth(event.target.value)}>
              {HISTORY_MONTHS.map((month) => (
                <option key={month} value={month}>
                  {month}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="leaderboard2__historyTabs">
          <button
            type="button"
            className={historyGender === 'female' ? 'leaderboard2__historyTabActive' : undefined}
            onClick={() => setHistoryGender('female')}
          >
            Женщины
          </button>
          <button
            type="button"
            className={historyGender === 'male' ? 'leaderboard2__historyTabActive' : undefined}
            onClick={() => setHistoryGender('male')}
          >
            Мужчины
          </button>
        </div>
        <div className="leaderboard2__historyGrid">
          {HISTORY[historyGender].map((item) => {
            const name = splitHistoryName(item.name);
            return (
              <article key={item.run}>
                <p>{item.run}</p>
                <h3>
                  <span>{name.lastName}</span>
                  {name.firstName ? <span>{name.firstName}</span> : null}
                </h3>
                <strong>{item.result}</strong>
              </article>
            );
          })}
        </div>
      </section>

      {isJoinPopupOpen ? (
        <div
          className="leaderboard2__joinOverlay"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setIsJoinPopupOpen(false);
          }}
        >
          <section
            className="leaderboard2__joinPopup"
            role="dialog"
            aria-modal="true"
            aria-labelledby="leaderboard2-join-title"
          >
            <button
              className="leaderboard2__joinClose"
              type="button"
              aria-label="Закрыть"
              onClick={() => setIsJoinPopupOpen(false)}
            >
              <span aria-hidden />
            </button>
            <div className="leaderboard2__joinContent">
              <p id="leaderboard2-join-title" className="leaderboard2__joinEyebrow">
                Покажи свою
                <br />
                скорость
              </p>
              <div className="leaderboard2__joinTitle">
                <span>в ТЦ «Авиапарк»</span>
                <strong>3 этаж</strong>
              </div>
              <div className="leaderboard2__joinMeta">
                <p>Москва, Ходынский бул., 4</p>
                <p>+7 (495) 287-09-20</p>
              </div>
              <a
                className="leaderboard2__joinRoute"
                href="https://yandex.ru/maps/?text=Москва,%20Ходынский%20бул.,%204,%20Авиапарк"
                target="_blank"
                rel="noreferrer"
              >
                Проложить маршрут
                <span aria-hidden />
              </a>
            </div>
            <img className="leaderboard2__joinMap" src="/assets/leaderboard2/popup-map.png" alt="Карта проезда к ТЦ Авиапарк" />
          </section>
        </div>
      ) : null}
    </main>
  );
}
