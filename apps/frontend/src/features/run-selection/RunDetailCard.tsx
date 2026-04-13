import type { RunOptionDefinition } from './runOptions';
import { rs } from './runSelectionStyles';

type Props = {
  option: RunOptionDefinition | null;
};

export function RunDetailCard({ option }: Props) {
  return (
    <div style={rs.detailCard}>
      <div style={rs.detailTextBlock}>
        <p style={rs.detailTitle}>{option?.title ?? '—'}</p>
        <p style={rs.detailDesc}>
          {option?.description ?? 'Выберите формат забега выше, чтобы увидеть описание.'}
        </p>
      </div>
    </div>
  );
}
