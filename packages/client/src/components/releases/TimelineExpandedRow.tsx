import type { ReleaseInfo, ReleaseMilestone } from '@cnv-monitor/shared';

import { Flex, FlexItem, Label } from '@patternfly/react-core';
import { Td, Tr } from '@patternfly/react-table';

import { PhaseBadge } from './PhaseBadge';
import { extractVersion, fmtDate } from './timelineHelpers';

const KEY_TYPES = new Set(['feature_freeze', 'code_freeze', 'blockers_only', 'ga']);

const TYPE_LABELS: Record<string, string> = {
  blockers_only: 'Blockers Only',
  code_freeze: 'Code Freeze',
  feature_freeze: 'Feature Freeze',
  ga: 'GA',
};

const MilestoneRow = ({ milestone }: { milestone: ReleaseMilestone }) => {
  const isKey = KEY_TYPES.has(milestone.type);
  const typeLabel = TYPE_LABELS[milestone.type];

  return (
    <Flex
      alignItems={{ default: 'alignItemsCenter' }}
      className={`app-rh-item ${milestone.isPast ? 'app-rh-past' : ''}`}
      spaceItems={{ default: 'spaceItemsSm' }}
    >
      <FlexItem>
        {isKey && typeLabel ? (
          <PhaseBadge phase={typeLabel} />
        ) : (
          <Label isCompact color={milestone.isPast ? 'grey' : 'blue'}>
            {extractVersion(milestone.name)}
          </Label>
        )}
      </FlexItem>
      <FlexItem>
        <span className={`app-text-xs ${isKey ? 'app-text-bold' : ''}`}>
          {fmtDate(milestone.date)}
        </span>
      </FlexItem>
      <FlexItem>
        <span
          className="app-text-xs app-text-muted"
          style={{
            display: 'inline-block',
            maxWidth: '300px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            verticalAlign: 'middle',
            whiteSpace: 'nowrap',
          }}
        >
          {milestone.name}
        </span>
      </FlexItem>
    </Flex>
  );
};

type TimelineExpandedRowProps = {
  release: ReleaseInfo;
  colCount: number;
};

export const TimelineExpandedRow = ({ colCount, release }: TimelineExpandedRowProps) => {
  const upcoming = release.milestones.filter(milestone => !milestone.isPast);
  const past = release.milestones.filter(milestone => milestone.isPast);

  const upcomingKey = upcoming.filter(milestone => KEY_TYPES.has(milestone.type));
  const upcomingBatch = upcoming.filter(milestone => !KEY_TYPES.has(milestone.type));
  const pastKey = past.filter(milestone => KEY_TYPES.has(milestone.type));
  const pastBatch = past.filter(milestone => !KEY_TYPES.has(milestone.type));

  return (
    <Tr>
      <Td className="app-expanded-row" colSpan={colCount}>
        <div className="app-release-history-grid">
          {(upcomingKey.length > 0 || upcomingBatch.length > 0) && (
            <div className="app-rh-section">
              <span className="app-rh-heading">Upcoming</span>
              {upcomingKey.length > 0 && (
                <>
                  <span className="app-rh-subheading">Key Milestones</span>
                  {upcomingKey.map((milestone, idx) => (
                    // eslint-disable-next-line react/no-array-index-key
                    <MilestoneRow key={`uk-${idx}`} milestone={milestone} />
                  ))}
                </>
              )}
              {upcomingBatch.length > 0 && (
                <>
                  <span className="app-rh-subheading">Z-Stream Releases</span>
                  {upcomingBatch.map((milestone, idx) => (
                    // eslint-disable-next-line react/no-array-index-key
                    <MilestoneRow key={`ub-${idx}`} milestone={milestone} />
                  ))}
                </>
              )}
            </div>
          )}
          {(pastKey.length > 0 || pastBatch.length > 0) && (
            <div className="app-rh-section">
              <span className="app-rh-heading">Released</span>
              {pastKey.length > 0 && (
                <>
                  <span className="app-rh-subheading">Key Milestones</span>
                  {[...pastKey].reverse().map((milestone, idx) => (
                    // eslint-disable-next-line react/no-array-index-key
                    <MilestoneRow key={`pk-${idx}`} milestone={milestone} />
                  ))}
                </>
              )}
              {pastBatch.length > 0 && (
                <>
                  <span className="app-rh-subheading">Z-Stream Releases</span>
                  {[...pastBatch].reverse().map((milestone, idx) => (
                    // eslint-disable-next-line react/no-array-index-key
                    <MilestoneRow key={`pb-${idx}`} milestone={milestone} />
                  ))}
                </>
              )}
            </div>
          )}
        </div>
      </Td>
    </Tr>
  );
};
