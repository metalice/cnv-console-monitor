import React, { useMemo, useState } from 'react';
import { Card, CardBody, CardTitle, ExpandableSection, Label, Spinner, Tooltip } from '@patternfly/react-core';
import { Table, Thead, Tr, Th, Tbody, Td, SortByDirection } from '@patternfly/react-table';
import { useTableSort } from '../../hooks/useTableSort';
import { useColumnManagement, type ColumnDef } from '../../hooks/useColumnManagement';
import { TableToolbar } from '../common/TableToolbar';
import type { ReleaseInfo } from '@cnv-monitor/shared';

const TIMELINE_COLUMNS: ColumnDef[] = [
  { id: 'version', title: 'Version' }, { id: 'phase', title: 'Phase' },
  { id: 'gaDate', title: 'GA Date' }, { id: 'zStream', title: 'Current Z-Stream' },
  { id: 'lastReleased', title: 'Last Released' }, { id: 'nextRelease', title: 'Next Release' },
  { id: 'countdown', title: 'Countdown' }, { id: 'history', title: 'History' },
];

const SORT_ACCESSORS: Record<number, (r: ReleaseInfo) => string | number | null> = {
  0: (release) => release.shortname,
  1: (release) => release.phase,
  2: (release) => release.gaDate ? new Date(release.gaDate).getTime() : null,
  3: (release) => release.currentZStream,
  4: (release) => release.currentZStreamDate ? new Date(release.currentZStreamDate).getTime() : null,
  5: (release) => release.nextRelease ? new Date(release.nextRelease.date).getTime() : null,
  6: (release) => release.daysUntilNext,
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

type ReleaseTimelineProps = { releases: ReleaseInfo[] | undefined; isLoading: boolean };

export const ReleaseTimeline: React.FC<ReleaseTimelineProps> = ({ releases, isLoading }) => {
  const [search, setSearch] = useState('');
  const colMgmt = useColumnManagement('releaseTimeline', TIMELINE_COLUMNS);

  const filtered = useMemo(() => {
    const list = releases || [];
    if (!search) return list;
    const term = search.toLowerCase();
    return list.filter(release => release.shortname.toLowerCase().includes(term) || release.phase.toLowerCase().includes(term));
  }, [releases, search]);

  const { sorted, getSortParams } = useTableSort(filtered, SORT_ACCESSORS, { index: 0, direction: SortByDirection.desc });

  return (
    <Card>
      <CardTitle>Version Timeline</CardTitle>
      <CardBody>
        <TableToolbar searchValue={search} onSearchChange={setSearch} searchPlaceholder="Search by version or phase..."
          resultCount={sorted.length} totalCount={(releases || []).length} columns={TIMELINE_COLUMNS}
          visibleIds={colMgmt.visibleIds} onSaveColumns={colMgmt.setColumns} onResetColumns={colMgmt.resetColumns} />
        {isLoading ? <Spinner aria-label="Loading releases" /> : (
          <div className="app-table-scroll app-table-wide">
            <Table aria-label="Release timeline" variant="compact">
              <Thead><Tr>
                {colMgmt.isColumnVisible('version') && <Th sort={getSortParams(0)}>Version</Th>}
                {colMgmt.isColumnVisible('phase') && <Th sort={getSortParams(1)}>Phase</Th>}
                {colMgmt.isColumnVisible('gaDate') && <Th sort={getSortParams(2)}>GA Date</Th>}
                {colMgmt.isColumnVisible('zStream') && <Th sort={getSortParams(3)}>Current Z-Stream</Th>}
                {colMgmt.isColumnVisible('lastReleased') && <Th sort={getSortParams(4)}>Last Released</Th>}
                {colMgmt.isColumnVisible('nextRelease') && <Th sort={getSortParams(5)}>Next Release</Th>}
                {colMgmt.isColumnVisible('countdown') && <Th sort={getSortParams(6)}>Countdown</Th>}
                {colMgmt.isColumnVisible('history') && <Th>History</Th>}
              </Tr></Thead>
              <Tbody>
                {sorted.map(release => <ReleaseRow key={release.shortname} release={release} isColumnVisible={colMgmt.isColumnVisible} />)}
              </Tbody>
            </Table>
          </div>
        )}
      </CardBody>
    </Card>
  );
};

const ReleaseRow: React.FC<{ release: ReleaseInfo; isColumnVisible: (id: string) => boolean }> = ({ release, isColumnVisible }) => {
  const [expanded, setExpanded] = useState(false);
  const pastMilestones = release.milestones.filter(milestone => milestone.isPast);
  return (
    <Tr>
      {isColumnVisible('version') && <Td className="app-cell-nowrap"><strong>{release.shortname.replace('cnv-', 'CNV ')}</strong></Td>}
      {isColumnVisible('phase') && <Td className="app-cell-nowrap">{phaseBadge(release.phase)}</Td>}
      {isColumnVisible('gaDate') && <Td className="app-cell-nowrap">{fmtDate(release.gaDate)}</Td>}
      {isColumnVisible('zStream') && <Td className="app-cell-nowrap">{release.currentZStream ? <Label color="blue" isCompact>{release.currentZStream}</Label> : '--'}</Td>}
      {isColumnVisible('lastReleased') && (
        <Td className="app-cell-nowrap">
          {release.currentZStreamDate ? (<Tooltip content={`${release.daysSinceLastRelease ?? 0} days ago`}><span>{fmtDate(release.currentZStreamDate)}</span></Tooltip>) : '--'}
        </Td>
      )}
      {isColumnVisible('nextRelease') && <Td className="app-cell-nowrap">{release.nextRelease ? `${release.nextRelease.name.replace(/Batch |GA Stable Release|GA Release/g, '').trim()} (${fmtDate(release.nextRelease.date)})` : '--'}</Td>}
      {isColumnVisible('countdown') && <Td className="app-cell-nowrap">{countdownBadge(release.daysUntilNext)}</Td>}
      {isColumnVisible('history') && (
        <Td>
          {pastMilestones.length > 0 && (
            <ExpandableSection toggleText={`${pastMilestones.length} releases`} isExpanded={expanded} onToggle={(_e, val) => setExpanded(val)}>
              <div className="app-release-history">
                {pastMilestones.map((m, i) => <div key={i}>{fmtDate(m.date)} &mdash; {m.name}</div>)}
              </div>
            </ExpandableSection>
          )}
        </Td>
      )}
    </Tr>
  );
};
