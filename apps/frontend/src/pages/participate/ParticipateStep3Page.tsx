import { useNavigate } from 'react-router-dom';
import { useParticipateForm, type RunMode } from '../../context/ParticipateFormContext';
import { participatePage as ps } from './participateStyles';

export default function ParticipateStep3Page() {
  const navigate = useNavigate();
  const { values, patch } = useParticipateForm();

  const setMode = (runMode: RunMode) => patch({ runMode });

  return (
    <>
      <div style={ps.formBody}>
        <div style={ps.choiceGrid3}>
          <button
            type="button"
            onClick={() => setMode('time')}
            style={{
              ...ps.choiceBtn,
              ...(values.runMode === 'time' ? ps.choiceBtnActive : {}),
            }}
          >
            Время
          </button>
          <button
            type="button"
            onClick={() => setMode('1km')}
            style={{
              ...ps.choiceBtn,
              ...(values.runMode === '1km' ? ps.choiceBtnActive : {}),
            }}
          >
            1 км
          </button>
          <button
            type="button"
            onClick={() => setMode('5km')}
            style={{
              ...ps.choiceBtn,
              ...(values.runMode === '5km' ? ps.choiceBtnActive : {}),
            }}
          >
            5 км
          </button>
        </div>
      </div>
      <div style={ps.footer}>
        <button type="button" style={ps.btnGhost} onClick={() => navigate('/participate/2')}>
          Назад
        </button>
        <button type="button" style={ps.btnPrimary} onClick={() => navigate('/participate/4')}>
          Далее
        </button>
      </div>
    </>
  );
}
