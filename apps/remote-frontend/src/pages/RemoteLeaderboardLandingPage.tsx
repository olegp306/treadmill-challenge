import { useEffect, useState } from 'react';
import { LogoMark } from '@local-fe/ui/components/LogoMark';
import './RemoteLeaderboardLandingPage.css';

const TIMER_PARTS = [
  { value: '06', label: 'Дней' },
  { value: '14', label: 'Часов' },
  { value: '23', label: 'Мин' },
  { value: '12', label: 'Сек' },
];

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
    title: 'Следи за рейтингом',
    text: 'Возвращайся в лидерборд и смотри, как меняется твое место в рейтинге!',
  },
];

const DISCIPLINES = [
  {
    title: 'Максимум за 5 минут',
    text: 'Пробеги максимальное расстояние за 5 минут. Максимум мощности на короткое время.',
  },
  {
    title: 'Золотой километр',
    text: 'Один километр на время: короткая дистанция, где важна каждая секунда.',
  },
  {
    title: 'Стайер-спринт на 5 км',
    text: 'Пять километров на выносливость и стабильный темп до финиша.',
  },
];

const PRIZES = [
  {
    label: 'Призы месяца:',
    brand: 'PUMA',
    model: 'MAGMAX NITRO 2',
    text: 'Главный приз для лучших участников месяца в каждой дисциплине.',
    image: '/assets/leaderboard2/shoe-1112.png',
  },
  {
    label: 'Готов попасть в топ-10?',
    brand: 'PUMA',
    model: 'MAGMAX NITRO 2',
    text: 'Выбирай дисциплину, показывай максимум и следи за своим результатом в рейтинге.',
    image: '/assets/leaderboard2/shoe-1112.png',
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
  const discipline = DISCIPLINES[activeDiscipline];
  const prize = PRIZES[activePrize];

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

  return (
    <main className="leaderboard2">
      <header className="leaderboard2__header" aria-label="AMAZING RED">
        <LogoMark className="leaderboard2__logo" />
      </header>

      <section className="leaderboard2__heroCard" aria-label="Treadmill Challenge">
        <div className="leaderboard2__heroMedia" aria-hidden />
        <div className="leaderboard2__heroBracket leaderboard2__heroBracket--left" aria-hidden />
        <div className="leaderboard2__heroBracket leaderboard2__heroBracket--right" aria-hidden />
        <img className="leaderboard2__heroCenterMarker" src="/assets/leaderboard2/center-marker.png" alt="" aria-hidden />
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
          {TIMER_PARTS.map((part, index) => (
            <div className="leaderboard2__timerPart" key={part.label}>
              <div className="leaderboard2__timerValue">
                {part.value}
                {index < TIMER_PARTS.length - 1 ? <span>:</span> : null}
              </div>
              <div className="leaderboard2__timerLabel">{part.label}</div>
            </div>
          ))}
        </div>
        <p className="leaderboard2__participants">
          <span>1 284</span> человека уже участвуют
        </p>
      </section>

      <section className="leaderboard2__intro" aria-labelledby="leaderboard2-intro-title">
        <p className="leaderboard2__marker">( 01 )</p>
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
              Каждый месяц лучшие атлеты в каждой дисциплине выигрывают новые кроссовки.
            </span>
          </h2>
          <div className="leaderboard2__actions">
            <a href="#rating">Смотреть рейтинг</a>
            <a href="#rating">Принять вызов</a>
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
        <div className="leaderboard2__statCell">
          <strong>3</strong>
          <span>Беговых режима</span>
        </div>
        <div className="leaderboard2__statCell">
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
        <div className="leaderboard2__modeCard">
          <div className="leaderboard2__modeText">
            <strong>{discipline.title}</strong>
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
          <a className="leaderboard2__modeCta" href="#rating">
            Принять вызов
          </a>
        </div>
      </section>

      <section className="leaderboard2__rating" id="rating" aria-labelledby="leaderboard2-rating-title">
        <div className="leaderboard2__sectionHead leaderboard2__sectionHead--rating">
          <h2 id="leaderboard2-rating-title">Рейтинг участников</h2>
          <p className="leaderboard2__marker">[ 04 ]</p>
        </div>
        <div className="leaderboard2__leaderboardFrameWrap">
          <iframe
            className="leaderboard2__leaderboardFrame"
            src="/leaderboard?embed=1&runTypeId=0&sex=male"
            title="Remote leaderboard"
            loading="eager"
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
          <span>{prize.model}</span>
          <em>{prize.text}</em>
        </div>
      </section>

      <section className="leaderboard2__finalCta" id="final-cta">
        <h2>
          Готов попасть
          <br />в топ-10
          <br />и забрать свою пару
        </h2>
        <strong>
          <span>PUMA MAGMAX</span>
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
        <a href="#rating">Принять вызов</a>
      </section>

      <section className="leaderboard2__faq" id="faq" aria-labelledby="leaderboard2-faq-title">
        <p className="leaderboard2__marker leaderboard2__faqMarker">[ 05 ]</p>
        <h2 id="leaderboard2-faq-title">
          <span>Частые</span>
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
    </main>
  );
}
