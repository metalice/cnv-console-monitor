import React, { useMemo, useState } from 'react';
import { Card, CardBody, CardTitle, Label, Spinner, Tooltip, Flex, FlexItem } from '@patternfly/react-core';
import { Table, Thead, Tr, Tbody, Td, SortByDirection } from '@patternfly/react-table';
import { AngleRightIcon, AngleDownIcon, OutlinedQuestionCircleIcon } from '@patternfly/react-icons';
import { useTableSort } from '../../hooks/useTableSort';
import { useColumnManagement, type ColumnDef } from '../../hooks/useColumnManagement';
import { TableToolbar } from '../common/TableToolbar';
import { ThWithHelp } from '../common/ThWithHelp';
import type { ReleaseInfo } from '@cnv-monitor/shared';

const TIMELINE_COLUMNS: ColumnDef[] = [
  { id: 'version', title: 'Version' }, { id: 'phase', title: 'Phase' },
  { id: 'gaDate', title: 'GA Date' }, { id: 'zStream', title: 'Current Z-Stream' },
  { id: 'lastReleased', title: 'Last Released' }, { id: 'nextRelease', title: 'Next Release' },
  { id: 'countdown', title: 'Countdown' }, { id: 'releases', title: 'Releases' },
];

const SORT_ACCESSORS: Record<number, (r: ReleaseInfo) => string | number | null> = {
  0: (release) => release.shortname,
  1: (release) => release.phase,
  2: (release) => release.gaDate ? new Date(release.gaDate).getTime() : null,
  3: (release) => release.currentZStream,
  4: (release) => release.currentZStreamDate ? new Date(release.currentZStreamDate).getTime() : null,
  5: (release) => release.nextRelease ? new Date(release.nextRelease.date).getTime() : null,
  6: (release) => release.daysUntilNext,
  7: (release) => release.milestones.filter(m => m.isPast).length,
};

const phaseBadge = (phase: string): React.ReactNode => {
  const color = phase.includes('Concept') ? 'purple'
    : phase.includes('Planning') || phase.includes('Development') ? 'blue'
    : phase === 'Maintenance' ? 'green' : 'grey';
  return <Label color={color} isCompact>{phase}</Label>;
};

const countdownBadge = (days: number | null): React.ReactNode => {
  if (days === null) return <Label color="grey" isCompact>No upcoming</Label>;
  if (days <= 3) return <Label color="red" isCompact>{days}d</Label>;
  if (days <= 7) return <Label color="orange" isCompact>{days}d</Label>;
  if (days <= 14) return <Label color="yellow" isCompact>{days}d</Label>;
  return <Label color="grey" isCompact>{days}d</Label>;
};

const fmtDate = (dateStr: string | null): string =>
  dateStr ? new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '--';

const extractVersion = (name: string): string => {
  const match = name.match(/(\d+\.\d+\.?\d*)/);
  return match ? match[1] : name.replace(/^Batch\s+/, '').replace(/GA.*$/, '').trim();
};

type ReleaseTimelineProps = { releases: ReleaseInfo[] | undefined; isLoading: boolean };

export const ReleaseTimeline: React.FC<ReleaseTimelineProps> = ({ releases, isLoading }) => {
  const [search, setSearch] = useState('');
  const [expandedVersions, setExpandedVersions] = useState<Set<string>>(new Set());
  const colMgmt = useColumnManagement('releaseTimeline', TIMELINE_COLUMNS);

  const filtered = useMemo(() => {
    const list = releases || [];
    if (!search) return list;
    const term = search.toLowerCase();
    return list.filter(release => release.shortname.toLowerCase().includes(term) || release.phase.toLowerCase().includes(term));
  }, [releases, search]);

  const { sorted, getSortParams } = useTableSort(filtered, SORT_ACCESSORS, { index: 0, direction: SortByDirection.desc });

  const toggleExpand = (shortname: string) => {
    setExpandedVersions(prev => {
      const next = new Set(prev);
      if (next.has(shortname)) next.delete(shortname); else next.add(shortname);
      return next;
    });
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
        <TableToolbar searchValue={search} onSearchChange={setSearch} searchPlaceholder="Search by version or phase..."
          resultCount={sorted.length} totalCount={(releases || []).length} columns={TIMELINE_COLUMNS}
          visibleIds={colMgmt.visibleIds} onSaveColumns={colMgmt.setColumns} onResetColumns={colMgmt.resetColumns} />
        {isLoading ? <Spinner aria-label="Loading releases" /> : (
          <div className="app-table-scroll app-table-wide">
            <Table aria-label="Release timeline" variant="compact">
              <Thead><Tr>
                {colMgmt.isColumnVisible('version') && <ThWithHelp label="Version" help="CNV version shortname." sort={getSortParams(0)} />}
                {colMgmt.isColumnVisible('phase') && <ThWithHelp label="Phase" help="Current lifecycle phase." sort={getSortParams(1)} />}
                {colMgmt.isColumnVisible('gaDate') && <ThWithHelp label="GA Date" help="General Availability date." sort={getSortParams(2)} />}
                {colMgmt.isColumnVisible('zStream') && <ThWithHelp label="Z-Stream" help="Current z-stream version." sort={getSortParams(3)} />}
                {colMgmt.isColumnVisible('lastReleased') && <ThWithHelp label="Last Released" help="Date of the most recent batch release." sort={getSortParams(4)} />}
                {colMgmt.isColumnVisible('nextRelease') && <ThWithHelp label="Next Release" help="Next scheduled batch or GA release." sort={getSortParams(5)} />}
                {colMgmt.isColumnVisible('countdown') && <ThWithHelp label="Countdown" help="Days until next release." sort={getSortParams(6)} />}
                {colMgmt.isColumnVisible('releases') && <ThWithHelp label="Releases" help="Total past releases. Click row to expand history." sort={getSortParams(7)} />}
              </Tr></Thead>
              <Tbody>
                {sorted.map(release => {
                  const isExpanded = expandedVersions.has(release.shortname);
                  const pastMilestones = release.milestones.filter(m => m.isPast);
                  const upcomingMilestones = release.milestones.filter(m => !m.isPast);

                  return (
                    <React.Fragment key={release.shortname}>
                      <Tr isClickable onRowClick={() => toggleExpand(release.shortname)}>
                        {colMgmt.isColumnVisible('version') && (
                          <Td className="app-cell-nowrap">
                            <span className="app-expand-icon">{isExpanded ? <AngleDownIcon /> : <AngleRightIcon />}</span>
                            <strong>{release.shortname.replace('cnv-', 'CNV ')}</strong>
                          </Td>
                        )}
                        {colMgmt.isColumnVisible('phase') && <Td className="app-cell-nowrap">{phaseBadge(release.phase)}</Td>}
                        {colMgmt.isColumnVisible('gaDate') && <Td className="app-cell-nowrap">{fmtDate(release.gaDate)}</Td>}
                        {colMgmt.isColumnVisible('zStream') && <Td className="app-cell-nowrap">{release.currentZStream ? <Label color="blue" isCompact>{release.currentZStream}</Label> : '--'}</Td>}
                        {colMgmt.isColumnVisible('lastReleased') && (
                          <Td className="app-cell-nowrap">
                            {release.currentZStreamDate ? (<Tooltip content={`${release.daysSinceLastRelease ?? 0} days ago`}><span>{fmtDate(release.currentZStreamDate)}</span></Tooltip>) : '--'}
                          </Td>
                        )}
                        {colMgmt.isColumnVisible('nextRelease') && <Td className="app-cell-nowrap">{release.nextRelease ? `${release.nextRelease.name.replace(/Batch |GA Stable Release|GA Release/g, '').trim()} (${fmtDate(release.nextRelease.date)})` : '--'}</Td>}
                        {colMgmt.isColumnVisible('countdown') && <Td className="app-cell-nowrap">{countdownBadge(release.daysUntilNext)}</Td>}
                        {colMgmt.isColumnVisible('releases') && <Td className="app-cell-nowrap"><Label color="grey" isCompact>{pastMilestones.length} released</Label></Td>}
                      </Tr>
                      {isExpanded && (
                        <Tr>
                          <Td colSpan={colCount} className="app-expanded-row">
                            <div className="app-release-history-grid">
                              {upcomingMilestones.length > 0 && (
                                <div className="app-rh-section">
                                  <span className="app-rh-heading">Upcoming</span>
                                  {upcomingMilestones.map((m, i) => (
                                    <Flex key={i} spaceItems={{ default: 'spaceItemsSm' }} alignItems={{ default: 'alignItemsCenter' }} className="app-rh-item">
                                      <FlexItem><Label color="blue" isCompact>{extractVersion(m.name)}</Label></FlexItem>
                                      <FlexItem><span className="app-text-xs">{fmtDate(m.date)}</span></FlexItem>
                                      <FlexItem><span className="app-text-xs app-text-muted">{m.name}</span></FlexItem>
                                    </Flex>
                                  ))}
                                </div>
                              )}
                              {pastMilestones.length > 0 && (
                                <div className="app-rh-section">
                                  <span className="app-rh-heading">Released</span>
                                  {[...pastMilestones].reverse().map((m, i) => (
                                    <Flex key={i} spaceItems={{ default: 'spaceItemsSm' }} alignItems={{ default: 'alignItemsCenter' }} className="app-rh-item app-rh-past">
                                      <FlexItem><Label color="grey" isCompact>{extractVersion(m.name)}</Label></FlexItem>
                                      <FlexItem><span className="app-text-xs">{fmtDate(m.date)}</span></FlexItem>
                                      <FlexItem><span className="app-text-xs app-text-muted">{m.name}</span></FlexItem>
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
