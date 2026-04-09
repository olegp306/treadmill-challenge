import { useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { ArOzioViewport } from '../../arOzio/ArOzioViewport';
import { w } from '../../arOzio/dimensions';
import { ParticipateFormProvider } from '../../context/ParticipateFormContext';
import { participatePage as ps } from './participateStyles';

const STEP_TITLES = ['', 'Имя и телефон', 'Пол', 'Режим забега', 'Проверка'];

function getStep(pathname: string): number {
  const m = pathname.match(/\/participate\/(\d)(?:\/|$)/);
  if (!m) return 0;
  const n = parseInt(m[1], 10);
  return n >= 1 && n <= 4 ? n : 0;
}

export default function ParticipateLayout() {
  return (
    <ParticipateFormProvider>
      <ParticipateLayoutInner />
    </ParticipateFormProvider>
  );
}

function ParticipateLayoutInner() {
  const location = useLocation();
  const navigate = useNavigate();
  const step = getStep(location.pathname);
  const displayStep = step >= 1 && step <= 4 ? step : 1;

  useEffect(() => {
    if (!location.pathname.startsWith('/participate')) return;
    if (location.pathname === '/participate') return;
    const n = getStep(location.pathname);
    if (n < 1 || n > 4) navigate('/participate/1', { replace: true });
  }, [location.pathname, navigate]);

  return (
    <ArOzioViewport>
      <div style={ps.page}>
        <header style={ps.header}>
          <p style={ps.logoMark} aria-label="AMAZING RED">
            <span style={ps.logoAmazing}>AMAZING</span>
            <span style={ps.logoRed}>RED</span>
          </p>
          <div style={ps.stepDots} aria-label={`Шаг ${displayStep} из 4`}>
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                style={{
                  width: w(16),
                  height: w(16),
                  borderRadius: '50%',
                  background: i === displayStep ? '#e6233a' : '#1e1e1e',
                  border: `2px solid ${i <= displayStep ? '#e6233a' : '#30363d'}`,
                  transition: 'background 0.3s ease, border-color 0.3s ease',
                }}
              />
            ))}
          </div>
          <h1 style={ps.stepTitle}>{STEP_TITLES[displayStep]}</h1>
        </header>
        <div style={ps.sheet}>
          <div className="ar-ozio-step-panel">
            <Outlet />
          </div>
        </div>
      </div>
    </ArOzioViewport>
  );
}
