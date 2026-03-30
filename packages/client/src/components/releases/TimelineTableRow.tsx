import type { ReleaseInfo } from '@cnv-monitor/shared';

import { Label, Tooltip } from '@patternfly/react-core';
import { AngleDownIcon, AngleRightIcon } from '@patternfly/react-icons';
import { Td, Tr } from '@patternfly/react-table';

import { countdownColor, countdownLabel, fmtDate, phaseBadgeColor } from './timelineHelpers';

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
          <Label isCompact color={phaseBadgeColor(release.phase)}>
            {release.phase}
          </Label>
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
          {release.nextRelease
            ? `${release.nextRelease.name.replace(/Batch |GA Stable Release|GA Release/g, '').trim()} (${fmtDate(release.nextRelease.date)})`
            : '--'}
        </Td>
      )}
      {isColumnVisible('countdown') && (
        <Td className="app-cell-nowrap">
          <Label isCompact color={countdownColor(release.daysUntilNext)}>
            {countdownLabel(release.daysUntilNext)}
          </Label>
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
