import type { ReleaseInfo } from '@cnv-monitor/shared';

import { Content, Label, Popover } from '@patternfly/react-core';

import { BAR_HEIGHT, extractShortVersion, MILESTONE_SHAPES } from './ganttConstants';

type GanttMilestoneMarkerProps = {
  milestone: ReleaseInfo['milestones'][number];
  barY: number;
  posX: (dateStr: string) => number;
};

export const GanttMilestoneMarker = ({ barY, milestone, posX }: GanttMilestoneMarkerProps) => {
  const milestoneX = posX(milestone.date);
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- defensive: runtime data
  const shape = MILESTONE_SHAPES[milestone.type] || MILESTONE_SHAPES.batch;
  const shortVer = extractShortVersion(milestone.name);
  const isBatchOrGa = milestone.type === 'batch' || milestone.type === 'ga';
  const fmtDate = new Date(milestone.date).toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  const milestoneLabelColor =
    milestone.type === 'ga' ? 'red' : milestone.type === 'feature_freeze' ? 'orange' : 'blue';

  return (
    <g>
      {isBatchOrGa && (
        <line
          opacity={0.8}
          stroke={shape.color}
          strokeWidth={1.5}
          x1={milestoneX}
          x2={milestoneX}
          y1={barY - 2}
          y2={barY + BAR_HEIGHT + 2}
        />
      )}
      <Popover
        bodyContent={
          <div>
            <Content className="app-mb-xs" component="p">
              {milestone.name}
            </Content>
            <Content className="app-text-muted" component="small">
              {fmtDate}
            </Content>
            {milestone.type !== 'batch' && (
              <Label isCompact className="app-ml-sm" color={milestoneLabelColor}>
                {milestone.type.replace('_', ' ')}
              </Label>
            )}
          </div>
        }
        headerContent={<strong>{shortVer}</strong>}
        position="top"
        triggerAction="hover"
      >
        <text
          className="app-gantt-milestone"
          fill={shape.color}
          fontSize={milestone.type === 'ga' ? 16 : 12}
          fontWeight={milestone.type === 'ga' ? 700 : 600}
          textAnchor="middle"
          x={milestoneX}
          y={barY + BAR_HEIGHT / 2 + 5}
        >
          {shape.symbol}
        </text>
      </Popover>
      {isBatchOrGa && (
        <g className="app-gantt-date-label-group">
          <text
            className="app-gantt-date-label app-gantt-date-ver"
            textAnchor="middle"
            x={milestoneX}
            y={barY + BAR_HEIGHT + 13}
          >
            {shortVer}
          </text>
          <text
            className="app-gantt-date-label app-gantt-date-day"
            textAnchor="middle"
            x={milestoneX}
            y={barY + BAR_HEIGHT + 25}
          >
            {new Date(milestone.date).toLocaleDateString('en-US', {
              day: 'numeric',
              month: 'short',
            })}
          </text>
        </g>
      )}
    </g>
  );
};
