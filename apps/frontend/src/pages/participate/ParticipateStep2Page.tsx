import { useNavigate } from 'react-router-dom';
import { useParticipateForm, type Sex } from '../../context/ParticipateFormContext';
import { participatePage as ps } from './participateStyles';

export default function ParticipateStep2Page() {
  const navigate = useNavigate();
  const { values, patch } = useParticipateForm();

  const setSex = (sex: Sex) => patch({ sex });

  return (
    <>
      <div style={ps.formBody}>
        <div style={ps.choiceRow}>
          <button
            type="button"
            onClick={() => setSex('male')}
            style={{
              ...ps.choiceBtn,
              ...(values.sex === 'male' ? ps.choiceBtnActive : {}),
            }}
          >
            Муж
          </button>
          <button
            type="button"
            onClick={() => setSex('female')}
            style={{
              ...ps.choiceBtn,
              ...(values.sex === 'female' ? ps.choiceBtnActive : {}),
            }}
          >
            Жен
          </button>
        </div>
      </div>
      <div style={ps.footer}>
        <button type="button" style={ps.btnGhost} onClick={() => navigate('/participate/1')}>
          Назад
        </button>
        <button type="button" style={ps.btnPrimary} onClick={() => navigate('/participate/3')}>
          Далее
        </button>
      </div>
    </>
  );
}
