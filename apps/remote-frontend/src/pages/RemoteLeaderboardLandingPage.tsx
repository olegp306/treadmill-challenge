import { Fragment, useCallback, useEffect, useState, type CSSProperties } from 'react';
import { LogoMark } from '@local-fe/ui/components/LogoMark';
import { RemoteLeaderboardView } from './RemoteLeaderboardPage';
import './RemoteLeaderboardLandingPage.css';

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
    text: 'Возвращайся в лидерборд и смотри, как меняется твое место в рейтинге!',
  },
];

const DISCIPLINES = [
  {
    title: 'Максимум за 5 минут',
    titleLines: ['Максимум', 'за 5 минут'],
    text: 'Пробеги максимальное расстояние за 5 минут.',
    image: '/assets/leaderboard2/mode-stopwatch.png',
  },
  {
    title: 'Золотой километр',
    titleLines: ['Золотой', 'километр'],
    text: 'Один километр на время: короткая дистанция, где важна каждая секунда.',
    image: '/assets/leaderboard2/shoe-1112.png',
  },
  {
    title: 'Стайер-спринт на 5 км',
    titleLines: ['Стайер-спринт', 'на 5 км'],
    text: 'Пять километров на выносливость и стабильный темп до финиша.',
    image: '/assets/leaderboard2/hero-figma.png',
  },
];

const PRIZES = [
  {
    label: 'Призы месяца:',
    brand: 'PUMA',
    model: 'DEVIATE NITRO ELITE TRAIL',
    text: 'Главный приз для лучших участников месяца в каждой дисциплине.',
    image: '/assets/leaderboard2/shoe-1111.png',
  },
  {
    label: 'Готов попасть в топ-10?',
    brand: 'PUMA',
    model: 'DEVIATE NITRO',
    text: 'Выбирай дисциплину, показывай максимум и следи за своим результатом в рейтинге.',
    image: '/assets/leaderboard2/shoe-1111.png',
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

const HISTORY = [
  { run: 'Стайер-спринт на 5 км', name: 'Александр Александров', result: '12:37' },
  { run: 'Золотой километр', name: 'Григорий Григорьев', result: '05:37' },
  { run: 'Максимум за 5 минут', name: 'Дмитрий Дмитриев', result: '1530 м' },
];

function loopIndex(current: number, delta: -1 | 1, length: number) {
  return (current + delta + length) % length;
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
  const [activePrize, setActivePrize] = useState(0);
  const [countdown, setCountdown] = useState<CountdownState>(() => getCountdownState());
  const [participantCount, setParticipantCount] = useState(0);
  const [isJoinPopupOpen, setIsJoinPopupOpen] = useState(false);
  const discipline = DISCIPLINES[activeDiscipline];
  const prize = PRIZES[activePrize];
  const handleEntryCountChange = useCallback((count: number) => {
    setParticipantCount(count);
  }, []);
  const handleJoinPopupClick = useCallback((event: { preventDefault: () => void }) => {
    event.preventDefault();
    setIsJoinPopupOpen(true);
  }, []);

  useEffect(() => {
    document.body.classList.add('leaderboard2-route');
    const hash = window.location.hash;
    if (hash) {
      window.setTimeout(() => {
        document.querySelector(hash)?.scrollIntoView({ block: 'start' });
      }, 0);
    }
    return () => document.body.classList.remove('leaderboard2-route');
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
    <main className="leaderboard2">
      <header className="leaderboard2__header" aria-label="AMAZING RED">
        <LogoMark className="leaderboard2__logo" />
      </header>

      <section className="leaderboard2__heroCard" aria-label="Treadmill Challenge">
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
          className="leaderboard2__modeCard"
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
              <span className="leaderboard2__modeFullText">{discipline.text}</span>
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
              onClick={() => setActiveDiscipline((current) => loopIndex(current, -1, DISCIPLINES.length))}
            />
            <CarouselButton
              direction="next"
              label="Следующий режим"
              onClick={() => setActiveDiscipline((current) => loopIndex(current, 1, DISCIPLINES.length))}
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
            <Fragment>
              MAGMAX
              <br />
              NITRO 2
            </Fragment>
          </span>
          <em>{prize.text}</em>
        </div>
      </section>

      <section className="leaderboard2__finalCta" id="final-cta">
        <h2>
          Готов попасть
          <br />в топ-10 и забрать
          <br />свою пару
        </h2>
        <strong>
          <span>PUMA MagMax</span>
          <span>NITRO 2?</span>
        </strong>
        <p>Выбирай дисциплину, показывай максимум и следи за своим результатом в рейтинге.</p>
        <div className="leaderboard2__finalCtaGeo" aria-hidden>
          <span className="leaderboard2__finalCtaGeoCorner leaderboard2__finalCtaGeoCorner--topLeft" />
          <span className="leaderboard2__finalCtaGeoCorner leaderboard2__finalCtaGeoCorner--topRight" />
          <span className="leaderboard2__finalCtaGeoText">55° 50' 8" N&nbsp;&nbsp;&nbsp;37° 37' 2" E.</span>
          <span className="leaderboard2__finalCtaGeoCorner leaderboard2__finalCtaGeoCorner--bottomLeft" />
          <span className="leaderboard2__finalCtaGeoCorner leaderboard2__finalCtaGeoCorner--bottomRight" />
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
                <span>[ 0{index + 1} ]</span>
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
          <span>Май 2026</span>
        </div>
        <div className="leaderboard2__historyTabs">
          <button type="button">Женщины</button>
          <button type="button" className="leaderboard2__historyTabActive">
            Мужчины
          </button>
        </div>
        <div className="leaderboard2__historyGrid">
          {HISTORY.map((item) => (
            <article key={item.run}>
              <p>{item.run}</p>
              <h3>{item.name}</h3>
              <strong>{item.result}</strong>
            </article>
          ))}
        </div>
      </section>

      <footer className="leaderboard2__footer">
        <LogoMark className="leaderboard2__footerLogo" />
        <p className="leaderboard2__socialsLabel">Мы в социальных сетях</p>
        <div className="leaderboard2__socials" aria-hidden>
          <span />
          <span />
          <span />
          <span />
          <span />
        </div>
        <form className="leaderboard2__subscribe">
          <label>
            Подпишитесь на рассылку
            <input type="email" placeholder="Ваш адрес электронной почты" />
          </label>
          <button type="button">Подписаться</button>
        </form>
        <p className="leaderboard2__subscribeNote">
          Подписываясь на рассылку, вы соглашаетесь на обработку персональных данных в соответствии с условиями политики
          конфиденциальности.
        </p>
        <p className="leaderboard2__copyright">© Inventive Retail Group, 2026</p>
      </footer>

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
