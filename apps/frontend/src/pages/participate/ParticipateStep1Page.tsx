import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useParticipateForm } from '../../context/ParticipateFormContext';
import { participatePage as ps } from './participateStyles';

export default function ParticipateStep1Page() {
  const navigate = useNavigate();
  const { values, patch } = useParticipateForm();
  const [error, setError] = useState<string | null>(null);

  const next = () => {
    if (!values.name.trim() || !values.phone.trim()) {
      setError('Укажите имя и телефон');
      return;
    }
    setError(null);
    navigate('/participate/2');
  };

  return (
    <>
      <div style={ps.formBody}>
        {error ? <p style={ps.error}>{error}</p> : null}
        <label style={ps.label}>
          Имя
          <input
            type="text"
            value={values.name}
            onChange={(e) => patch({ name: e.target.value })}
            placeholder="Ваше имя"
            autoComplete="name"
            autoFocus
            style={ps.input}
          />
        </label>
        <label style={ps.label}>
          Телефон
          <input
            type="tel"
            value={values.phone}
            onChange={(e) => patch({ phone: e.target.value })}
            placeholder="Номер телефона"
            autoComplete="tel"
            style={ps.input}
          />
        </label>
      </div>
      <div style={ps.footer}>
        <Link to="/" style={ps.btnGhost}>
          Назад
        </Link>
        <button type="button" style={ps.btnPrimary} onClick={next}>
          Далее
        </button>
      </div>
    </>
  );
}
