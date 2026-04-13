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
  return (
    <div style={rs.tabBar} role="tablist" aria-label="Формат забега">
      {options.map((opt) => {
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
            {opt.title}
          </button>
        );
      })}
    </div>
  );
}
