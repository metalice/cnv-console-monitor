import type { ReleaseInfo } from '@cnv-monitor/shared';

import { Flex, FlexItem, Label } from '@patternfly/react-core';
import { Td, Tr } from '@patternfly/react-table';

import { extractVersion, fmtDate } from './timelineHelpers';

type MilestoneListProps = {
  milestones: ReleaseInfo['milestones'];
  heading: string;
  color: 'blue' | 'grey';
  className?: string;
};

const MilestoneList = ({ className, color, heading, milestones }: MilestoneListProps) => (
  <div className="app-rh-section">
    <span className="app-rh-heading">{heading}</span>
    {milestones.map((milestone, idx) => (
      <Flex
        alignItems={{ default: 'alignItemsCenter' }}
        className={`app-rh-item ${className ?? ''}`}
        // eslint-disable-next-line react/no-array-index-key
        key={idx}
        spaceItems={{ default: 'spaceItemsSm' }}
      >
        <FlexItem>
          <Label isCompact color={color}>
            {extractVersion(milestone.name)}
          </Label>
        </FlexItem>
        <FlexItem>
          <span className="app-text-xs">{fmtDate(milestone.date)}</span>
        </FlexItem>
        <FlexItem>
          <span className="app-text-xs app-text-muted">{milestone.name}</span>
        </FlexItem>
      </Flex>
    ))}
  </div>
);

type TimelineExpandedRowProps = {
  release: ReleaseInfo;
  colCount: number;
};

export const TimelineExpandedRow = ({ colCount, release }: TimelineExpandedRowProps) => {
  const pastMilestones = release.milestones.filter(milestone => milestone.isPast);
  const upcomingMilestones = release.milestones.filter(milestone => !milestone.isPast);

  return (
    <Tr>
      <Td className="app-expanded-row" colSpan={colCount}>
        <div className="app-release-history-grid">
          {upcomingMilestones.length > 0 && (
            <MilestoneList color="blue" heading="Upcoming" milestones={upcomingMilestones} />
          )}
          {pastMilestones.length > 0 && (
            <MilestoneList
              className="app-rh-past"
              color="grey"
              heading="Released"
              milestones={[...pastMilestones].reverse()}
            />
          )}
        </div>
      </Td>
    </Tr>
  );
};
