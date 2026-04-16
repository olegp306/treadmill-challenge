import type { RunTypeId } from '@treadmill-challenge/shared';
import type { RunOptionDefinition } from './runOptions';
import { rs } from './runSelectionStyles';

type Props = {
  options: RunOptionDefinition[];
  selected: RunTypeId;
  onSelect: (runTypeId: RunTypeId) => void;
};

/** Three-segment selector (Figma hero tabs). */
export function RunTypeTabBar({ options, selected, onSelect }: Props) {
  const orderedOptions = [...options].sort((a, b) => a.runTypeId - b.runTypeId);
  return (
    <div style={rs.tabBar} role="tablist" aria-label="Формат забега">
      {orderedOptions.map((opt) => {
        const isSel = opt.runTypeId === selected;
        return (
          <button
            key={opt.runTypeId}
            type="button"
            role="tab"
            aria-selected={isSel}
            className="ar-reg-run-tab"
            style={{
              ...rs.tabBtn,
              ...(isSel ? rs.tabBtnSelected : rs.tabBtnIdle),
            }}
            onClick={() => onSelect(opt.runTypeId)}
          >
            <span style={rs.tabBtnTitle}>{opt.title}</span>
          </button>
        );
      })}
    </div>
  );
}
