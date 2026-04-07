import type { ReleaseInfo } from '@cnv-monitor/shared';

import { Label, Tooltip } from '@patternfly/react-core';
import { AngleDownIcon, AngleRightIcon } from '@patternfly/react-icons';
import { Td, Tr } from '@patternfly/react-table';

import { PhaseBadge } from './PhaseBadge';
import { countdownColor, countdownLabel, fmtDate } from './timelineHelpers';

type TimelineTableRowProps = {
  release: ReleaseInfo;
  isExpanded: boolean;
  isSelected: boolean;
  isColumnVisible: (id: string) => boolean;
  onRowClick: () => void;
};

export const TimelineTableRow = ({
  isColumnVisible,
  isExpanded,
  isSelected,
  onRowClick,
  release,
}: TimelineTableRowProps) => {
  const pastCount = release.milestones.filter(milestone => milestone.isPast).length;

  return (
    <Tr isClickable className={isSelected ? 'app-selected-row' : undefined} onRowClick={onRowClick}>
      {isColumnVisible('version') && (
        <Td className="app-cell-nowrap">
          <span className="app-expand-icon">
            {isExpanded ? <AngleDownIcon /> : <AngleRightIcon />}
          </span>
          <strong>{release.shortname.replace('cnv-', 'CNV ')}</strong>
        </Td>
      )}
      {isColumnVisible('phase') && (
        <Td className="app-cell-nowrap">
          <PhaseBadge phase={release.phase} />
        </Td>
      )}
      {isColumnVisible('gaDate') && <Td className="app-cell-nowrap">{fmtDate(release.gaDate)}</Td>}
      {isColumnVisible('zStream') && (
        <Td className="app-cell-nowrap">
          {release.currentZStream ? (
            <Label isCompact color="blue">
              {release.currentZStream}
            </Label>
          ) : (
            '--'
          )}
        </Td>
      )}
      {isColumnVisible('lastReleased') && (
        <Td className="app-cell-nowrap">
          {release.currentZStreamDate ? (
            <Tooltip content={`${release.daysSinceLastRelease ?? 0} days ago`}>
              <span>{fmtDate(release.currentZStreamDate)}</span>
            </Tooltip>
          ) : (
            '--'
          )}
        </Td>
      )}
      {isColumnVisible('nextRelease') && (
        <Td className="app-cell-nowrap">
          {release.nextRelease ? (
            <Tooltip
              content={`${release.nextRelease.name.replace(/Batch |GA Stable Release|GA Release/g, '').trim()} (${fmtDate(release.nextRelease.date)})`}
            >
              <span
                style={{
                  display: 'inline-block',
                  maxWidth: '200px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  verticalAlign: 'middle',
                }}
              >
                {release.nextRelease.name
                  .replace(/Batch |GA Stable Release|GA Release/g, '')
                  .trim()}{' '}
                ({fmtDate(release.nextRelease.date)})
              </span>
            </Tooltip>
          ) : (
            '--'
          )}
        </Td>
      )}
      {isColumnVisible('countdown') && (
        <Td
          className="app-cell-nowrap"
          style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis' }}
        >
          {(() => {
            const full = countdownLabel(release.daysUntilNext, release.nextRelease?.name);
            const MAX_LEN = 20;
            const display = full.length > MAX_LEN ? `${full.substring(0, MAX_LEN)}…` : full;
            return (
              <Tooltip content={full}>
                <Label isCompact color={countdownColor(release.daysUntilNext)}>
                  {display}
                </Label>
              </Tooltip>
            );
          })()}
        </Td>
      )}
      {isColumnVisible('releases') && (
        <Td className="app-cell-nowrap">
          <Label isCompact color="grey">
            {pastCount} released
          </Label>
        </Td>
      )}
    </Tr>
  );
};
