import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api/client';
import { useParticipateForm } from '../../context/ParticipateFormContext';
import { participatePage as ps } from './participateStyles';

function runModeLabel(mode: string): string {
  if (mode === 'time') return 'На время';
  if (mode === '1km') return '1 км';
  if (mode === '5km') return '5 км';
  return mode;
}

function sexLabel(sex: string): string {
  return sex === 'female' ? 'Жен' : 'Муж';
}

export default function ParticipateStep4Page() {
  const navigate = useNavigate();
  const { values, reset } = useParticipateForm();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!values.name.trim() || !values.phone.trim()) {
      navigate('/participate/1');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await api.register({
        name: values.name.trim(),
        phone: values.phone.trim(),
        sex: values.sex,
        runMode: values.runMode,
        runName:
          values.runMode === 'time'
            ? 'Time Challenge'
            : values.runMode === '1km'
              ? '1km Challenge'
              : '5km Challenge',
      });
      reset();
      navigate('/result', {
        state: {
          message:
            'Готово! Данные отправлены на дисплей беговой дорожки (TouchDesigner). Вы в очереди.',
        },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось отправить');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div style={ps.formBody}>
        {error ? <p style={ps.error}>{error}</p> : null}
        <div style={ps.summaryRow}>
          <span>Имя</span>
          <span style={ps.summaryValue}>{values.name.trim() || '—'}</span>
        </div>
        <div style={ps.summaryRow}>
          <span>Телефон</span>
          <span style={ps.summaryValue}>{values.phone.trim() || '—'}</span>
        </div>
        <div style={ps.summaryRow}>
          <span>Пол</span>
          <span style={ps.summaryValue}>{sexLabel(values.sex)}</span>
        </div>
        <div style={{ ...ps.summaryRow, borderBottom: 'none' }}>
          <span>Режим</span>
          <span style={ps.summaryValue}>{runModeLabel(values.runMode)}</span>
        </div>
      </div>
      <div style={ps.footer}>
        <button type="button" style={ps.btnGhost} onClick={() => navigate('/participate/3')}>
          Назад
        </button>
        <button
          type="button"
          style={{
            ...ps.btnPrimary,
            ...(loading ? ps.btnPrimaryDisabled : {}),
          }}
          disabled={loading}
          onClick={submit}
        >
          {loading ? 'Отправка…' : 'Старт'}
        </button>
      </div>
    </>
  );
}
