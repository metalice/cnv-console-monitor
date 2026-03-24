import React, { useMemo, useState } from 'react';

import type { ReleaseInfo } from '@cnv-monitor/shared';

import {
  Card,
  CardBody,
  CardTitle,
  Flex,
  FlexItem,
  Label,
  Spinner,
  Tooltip,
} from '@patternfly/react-core';
import { AngleDownIcon, AngleRightIcon, OutlinedQuestionCircleIcon } from '@patternfly/react-icons';
import { SortByDirection, Table, Tbody, Td, Thead, Tr } from '@patternfly/react-table';

import { type ColumnDef, useColumnManagement } from '../../hooks/useColumnManagement';
import { useTableSort } from '../../hooks/useTableSort';
import { TableToolbar } from '../common/TableToolbar';
import { ThWithHelp } from '../common/ThWithHelp';

const TIMELINE_COLUMNS: ColumnDef[] = [
  { id: 'version', title: 'Version' },
  { id: 'phase', title: 'Phase' },
  { id: 'gaDate', title: 'GA Date' },
  { id: 'zStream', title: 'Current Z-Stream' },
  { id: 'lastReleased', title: 'Last Released' },
  { id: 'nextRelease', title: 'Next Release' },
  { id: 'countdown', title: 'Countdown' },
  { id: 'releases', title: 'Releases' },
];

const SORT_ACCESSORS: Record<number, (r: ReleaseInfo) => string | number | null> = {
  0: release => release.shortname,
  1: release => release.phase,
  2: release => (release.gaDate ? new Date(release.gaDate).getTime() : null),
  3: release => release.currentZStream,
  4: release =>
    release.currentZStreamDate ? new Date(release.currentZStreamDate).getTime() : null,
  5: release => (release.nextRelease ? new Date(release.nextRelease.date).getTime() : null),
  6: release => release.daysUntilNext,
  7: release => release.milestones.filter(m => m.isPast).length,
};

const phaseBadge = (phase: string): React.ReactNode => {
  const color = phase.includes('Concept')
    ? 'purple'
    : phase.includes('Planning') || phase.includes('Development')
      ? 'blue'
      : phase === 'Maintenance'
        ? 'green'
        : 'grey';
  return (
    <Label isCompact color={color}>
      {phase}
    </Label>
  );
};

const countdownBadge = (days: number | null): React.ReactNode => {
  if (days === null) {
    return (
      <Label isCompact color="grey">
        No upcoming
      </Label>
    );
  }
  if (days <= 3) {
    return (
      <Label isCompact color="red">
        {days}d
      </Label>
    );
  }
  if (days <= 7) {
    return (
      <Label isCompact color="orange">
        {days}d
      </Label>
    );
  }
  if (days <= 14) {
    return (
      <Label isCompact color="yellow">
        {days}d
      </Label>
    );
  }
  return (
    <Label isCompact color="grey">
      {days}d
    </Label>
  );
};

const fmtDate = (dateStr: string | null): string =>
  dateStr
    ? new Date(dateStr).toLocaleDateString('en-US', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : '--';

const extractVersion = (name: string): string => {
  const match = /(\d+\.\d+\.?\d*)/.exec(name);
  return match
    ? match[1]
    : name
        .replace(/^Batch\s+/, '')
        .replace(/GA.*$/, '')
        .trim();
};

type ReleaseTimelineProps = {
  releases: ReleaseInfo[] | undefined;
  isLoading: boolean;
  selectedVersion?: string | null;
  onSelectVersion?: (shortname: string) => void;
};

export const ReleaseTimeline: React.FC<ReleaseTimelineProps> = ({
  isLoading,
  onSelectVersion,
  releases,
  selectedVersion,
}) => {
  const [search, setSearch] = useState('');
  const [expandedVersions, setExpandedVersions] = useState(new Set());
  const colMgmt = useColumnManagement('releaseTimeline', TIMELINE_COLUMNS);

  const filtered = useMemo(() => {
    const list = releases || [];
    if (!search) {
      return list;
    }
    const term = search.toLowerCase();
    return list.filter(
      release =>
        release.shortname.toLowerCase().includes(term) ||
        release.phase.toLowerCase().includes(term),
    );
  }, [releases, search]);

  const { getSortParams, sorted } = useTableSort(filtered, SORT_ACCESSORS, {
    direction: SortByDirection.desc,
    index: 0,
  });

  const handleRowClick = (shortname: string) => {
    setExpandedVersions(prev => {
      const next = new Set(prev);
      if (next.has(shortname)) {
        next.delete(shortname);
      } else {
        next.add(shortname);
      }
      return next;
    });
    if (onSelectVersion) {
      onSelectVersion(shortname);
    }
  };

  const colCount = TIMELINE_COLUMNS.filter(c => colMgmt.isColumnVisible(c.id)).length;

  return (
    <Card>
      <CardTitle>
        Version Timeline{' '}
        <Tooltip content="Table view of all CNV versions. Click a row to expand and see the full release history.">
          <OutlinedQuestionCircleIcon className="app-help-icon" />
        </Tooltip>
      </CardTitle>
      <CardBody>
        <TableToolbar
          columns={TIMELINE_COLUMNS}
          resultCount={sorted.length}
          searchPlaceholder="Search by version or phase..."
          searchValue={search}
          totalCount={(releases || []).length}
          visibleIds={colMgmt.visibleIds}
          onResetColumns={colMgmt.resetColumns}
          onSaveColumns={colMgmt.setColumns}
          onSearchChange={setSearch}
        />
        {isLoading ? (
          <Spinner aria-label="Loading releases" />
        ) : (
          <div className="app-table-scroll app-table-wide">
            <Table aria-label="Release timeline" variant="compact">
              <Thead>
                <Tr>
                  {colMgmt.isColumnVisible('version') && (
                    <ThWithHelp
                      help="CNV version shortname."
                      label="Version"
                      sort={getSortParams(0)}
                    />
                  )}
                  {colMgmt.isColumnVisible('phase') && (
                    <ThWithHelp
                      help="Current lifecycle phase."
                      label="Phase"
                      sort={getSortParams(1)}
                    />
                  )}
                  {colMgmt.isColumnVisible('gaDate') && (
                    <ThWithHelp
                      help="General Availability date."
                      label="GA Date"
                      sort={getSortParams(2)}
                    />
                  )}
                  {colMgmt.isColumnVisible('zStream') && (
                    <ThWithHelp
                      help="Current z-stream version."
                      label="Z-Stream"
                      sort={getSortParams(3)}
                    />
                  )}
                  {colMgmt.isColumnVisible('lastReleased') && (
                    <ThWithHelp
                      help="Date of the most recent batch release."
                      label="Last Released"
                      sort={getSortParams(4)}
                    />
                  )}
                  {colMgmt.isColumnVisible('nextRelease') && (
                    <ThWithHelp
                      help="Next scheduled batch or GA release."
                      label="Next Release"
                      sort={getSortParams(5)}
                    />
                  )}
                  {colMgmt.isColumnVisible('countdown') && (
                    <ThWithHelp
                      help="Days until next release."
                      label="Countdown"
                      sort={getSortParams(6)}
                    />
                  )}
                  {colMgmt.isColumnVisible('releases') && (
                    <ThWithHelp
                      help="Total past releases. Click row to expand history."
                      label="Releases"
                      sort={getSortParams(7)}
                    />
                  )}
                </Tr>
              </Thead>
              <Tbody>
                {sorted.map(release => {
                  const isExpanded = expandedVersions.has(release.shortname);
                  const pastMilestones = release.milestones.filter(m => m.isPast);
                  const upcomingMilestones = release.milestones.filter(m => !m.isPast);

                  return (
                    <React.Fragment key={release.shortname}>
                      <Tr
                        isClickable
                        className={
                          selectedVersion === release.shortname ? 'app-selected-row' : undefined
                        }
                        onRowClick={() => handleRowClick(release.shortname)}
                      >
                        {colMgmt.isColumnVisible('version') && (
                          <Td className="app-cell-nowrap">
                            <span className="app-expand-icon">
                              {isExpanded ? <AngleDownIcon /> : <AngleRightIcon />}
                            </span>
                            <strong>{release.shortname.replace('cnv-', 'CNV ')}</strong>
                          </Td>
                        )}
                        {colMgmt.isColumnVisible('phase') && (
                          <Td className="app-cell-nowrap">{phaseBadge(release.phase)}</Td>
                        )}
                        {colMgmt.isColumnVisible('gaDate') && (
                          <Td className="app-cell-nowrap">{fmtDate(release.gaDate)}</Td>
                        )}
                        {colMgmt.isColumnVisible('zStream') && (
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
                        {colMgmt.isColumnVisible('lastReleased') && (
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
                        {colMgmt.isColumnVisible('nextRelease') && (
                          <Td className="app-cell-nowrap">
                            {release.nextRelease
                              ? `${release.nextRelease.name.replace(/Batch |GA Stable Release|GA Release/g, '').trim()} (${fmtDate(release.nextRelease.date)})`
                              : '--'}
                          </Td>
                        )}
                        {colMgmt.isColumnVisible('countdown') && (
                          <Td className="app-cell-nowrap">
                            {countdownBadge(release.daysUntilNext)}
                          </Td>
                        )}
                        {colMgmt.isColumnVisible('releases') && (
                          <Td className="app-cell-nowrap">
                            <Label isCompact color="grey">
                              {pastMilestones.length} released
                            </Label>
                          </Td>
                        )}
                      </Tr>
                      {isExpanded && (
                        <Tr>
                          <Td className="app-expanded-row" colSpan={colCount}>
                            <div className="app-release-history-grid">
                              {upcomingMilestones.length > 0 && (
                                <div className="app-rh-section">
                                  <span className="app-rh-heading">Upcoming</span>
                                  {upcomingMilestones.map((m, i) => (
                                    <Flex
                                      alignItems={{ default: 'alignItemsCenter' }}
                                      className="app-rh-item"
                                      key={i}
                                      spaceItems={{ default: 'spaceItemsSm' }}
                                    >
                                      <FlexItem>
                                        <Label isCompact color="blue">
                                          {extractVersion(m.name)}
                                        </Label>
                                      </FlexItem>
                                      <FlexItem>
                                        <span className="app-text-xs">{fmtDate(m.date)}</span>
                                      </FlexItem>
                                      <FlexItem>
                                        <span className="app-text-xs app-text-muted">{m.name}</span>
                                      </FlexItem>
                                    </Flex>
                                  ))}
                                </div>
                              )}
                              {pastMilestones.length > 0 && (
                                <div className="app-rh-section">
                                  <span className="app-rh-heading">Released</span>
                                  {[...pastMilestones].reverse().map((m, i) => (
                                    <Flex
                                      alignItems={{ default: 'alignItemsCenter' }}
                                      className="app-rh-item app-rh-past"
                                      key={i}
                                      spaceItems={{ default: 'spaceItemsSm' }}
                                    >
                                      <FlexItem>
                                        <Label isCompact color="grey">
                                          {extractVersion(m.name)}
                                        </Label>
                                      </FlexItem>
                                      <FlexItem>
                                        <span className="app-text-xs">{fmtDate(m.date)}</span>
                                      </FlexItem>
                                      <FlexItem>
                                        <span className="app-text-xs app-text-muted">{m.name}</span>
                                      </FlexItem>
                                    </Flex>
                                  ))}
                                </div>
                              )}
                            </div>
                          </Td>
                        </Tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </Tbody>
            </Table>
          </div>
        )}
      </CardBody>
    </Card>
  );
};
