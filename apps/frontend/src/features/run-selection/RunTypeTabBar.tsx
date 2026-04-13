import type { RunType } from '@treadmill-challenge/shared';
import type { RunOptionDefinition } from './runOptions';
import { rs } from './runSelectionStyles';

type Props = {
  options: RunOptionDefinition[];
  selected: RunType;
  onSelect: (runType: RunType) => void;
};

/** Three-segment selector (Figma hero tabs). */
export function RunTypeTabBar({ options, selected, onSelect }: Props) {
  return (
    <div style={rs.tabBar} role="tablist" aria-label="Формат забега">
      {options.map((opt) => {
        const isSel = opt.runType === selected;
        return (
          <button
            key={opt.runType}
            type="button"
            role="tab"
            aria-selected={isSel}
            className="ar-reg-run-tab"
            style={{
              ...rs.tabBtn,
              ...(isSel ? rs.tabBtnSelected : rs.tabBtnIdle),
            }}
            onClick={() => onSelect(opt.runType)}
          >
            {opt.title}
          </button>
        );
      })}
    </div>
  );
}
