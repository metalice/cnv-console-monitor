import type { ReleaseInfo } from '@cnv-monitor/shared';

import { BAR_HEIGHT, PHASE_COLORS, ROW_HEIGHT } from './ganttConstants';
import { GanttMilestoneMarker } from './GanttMilestoneMarker';

const MIN_BAR_WIDTH = 4;

type GanttRowProps = {
  release: ReleaseInfo;
  index: number;
  isSelected: boolean;
  totalWidth: number;
  headerHeight: number;
  posX: (dateStr: string) => number;
  onSelect: () => void;
};

export const GanttRow = ({
  headerHeight,
  index,
  isSelected,
  onSelect,
  posX,
  release,
  totalWidth,
}: GanttRowProps) => {
  const rowY = headerHeight + index * ROW_HEIGHT;
  const barY = rowY + (ROW_HEIGHT - BAR_HEIGHT) / 2;
  const startX = release.startDate ? posX(release.startDate) : 0;
  const endX = release.endDate ? posX(release.endDate) : totalWidth;
  const barWidth = Math.max(MIN_BAR_WIDTH, endX - startX);
  const phaseColor = PHASE_COLORS[release.phase] ?? '#8a8d90';

  return (
    <g className="app-gantt-row" onClick={onSelect}>
      <rect
        className={`app-gantt-row-bg ${isSelected ? 'app-gantt-row-selected' : ''}`}
        height={ROW_HEIGHT}
        width={totalWidth}
        x={0}
        y={rowY}
      />
      <text className="app-gantt-version-label" x={8} y={barY + BAR_HEIGHT / 2 + 4}>
        {release.shortname.replace('cnv-', '')}
      </text>
      <rect
        className="app-gantt-bar"
        fill={phaseColor}
        height={BAR_HEIGHT}
        opacity={0.9}
        rx={4}
        width={barWidth}
        x={startX}
        y={barY}
      />
      {release.milestones
        .filter(milestone => {
          const milestoneX = posX(milestone.date);
          return milestoneX >= 0 && milestoneX <= totalWidth;
        })
        .map((milestone, milestoneIdx) => (
          // eslint-disable-next-line react/no-array-index-key
          <GanttMilestoneMarker barY={barY} key={milestoneIdx} milestone={milestone} posX={posX} />
        ))}
    </g>
  );
};
