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

  const firstDate = release.milestones.length > 0 ? release.milestones[0].date : release.startDate;
  const lastDate =
    release.milestones.length > 0
      ? release.milestones[release.milestones.length - 1].date
      : release.endDate;

  const startX = firstDate ? posX(firstDate) : 0;
  const endX = lastDate ? posX(lastDate) : totalWidth;
  const barWidth = Math.max(MIN_BAR_WIDTH, endX - startX);
  const phaseColor = PHASE_COLORS[release.phase] ?? '#8a8d90';
  const isAlt = index % 2 === 1;

  const lastReleasedMilestone = [...release.milestones]
    .reverse()
    .find(milestone => milestone.isPast && (milestone.type === 'ga' || milestone.type === 'batch'));
  const splitX = lastReleasedMilestone ? posX(lastReleasedMilestone.date) : startX;
  const releasedWidth = Math.max(0, splitX - startX);
  const upcomingWidth = Math.max(0, endX - splitX);

  return (
    <g className="app-gantt-row" onClick={onSelect}>
      <rect
        className={`app-gantt-row-bg ${isSelected ? 'app-gantt-row-selected' : ''} ${isAlt ? 'app-gantt-row-alt' : ''}`}
        height={ROW_HEIGHT}
        width={totalWidth}
        x={0}
        y={rowY}
      />
      <text className="app-gantt-version-label" x={8} y={barY + BAR_HEIGHT / 2 + 5}>
        {release.shortname.replace('cnv-', '')}
      </text>
      {releasedWidth > 0 && (
        <rect
          className="app-gantt-bar"
          fill="#3e8635"
          height={BAR_HEIGHT}
          rx={4}
          width={releasedWidth}
          x={startX}
          y={barY}
        />
      )}
      {upcomingWidth > 0 && (
        <rect
          className="app-gantt-bar"
          fill={phaseColor}
          height={BAR_HEIGHT}
          opacity={0.15}
          rx={upcomingWidth === barWidth ? 4 : 0}
          stroke={phaseColor}
          strokeDasharray="4 3"
          strokeOpacity={0.4}
          strokeWidth={1}
          width={upcomingWidth}
          x={splitX}
          y={barY}
        />
      )}
      {release.milestones
        .filter(milestone => {
          const milestoneX = posX(milestone.date);
          return milestoneX >= 0 && milestoneX <= totalWidth;
        })
        .map((milestone, milestoneIdx, arr) => {
          const prevX = milestoneIdx > 0 ? posX(arr[milestoneIdx - 1].date) : undefined;
          return (
            <GanttMilestoneMarker
              barY={barY}
              // eslint-disable-next-line react/no-array-index-key
              key={milestoneIdx}
              milestone={milestone}
              posX={posX}
              prevMilestoneX={prevX}
            />
          );
        })}
    </g>
  );
};
