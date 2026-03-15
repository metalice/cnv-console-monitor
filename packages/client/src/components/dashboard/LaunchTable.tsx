import React, { useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardBody, Tooltip, Label, EmptyState, EmptyStateBody } from '@patternfly/react-core';
import { Table, Thead, Tr, Tbody, Td, SortByDirection } from '@patternfly/react-table';
import { ExternalLinkAltIcon } from '@patternfly/react-icons';
import type { LaunchGroup, PublicConfig } from '@cnv-monitor/shared';
import { useTableSort } from '../../hooks/useTableSort';
import { useColumnManagement, type ColumnDef } from '../../hooks/useColumnManagement';
import { StatusBadge } from '../common/StatusBadge';
import { PassRateBar } from '../common/PassRateBar';
import { ThWithHelp } from '../common/ThWithHelp';
import { LaunchProgress } from '../common/LaunchProgress';
import { TableToolbar } from '../common/TableToolbar';

const DASHBOARD_COLUMNS: ColumnDef[] = [
  { id: 'version', title: 'Version' },
  { id: 'tier', title: 'Tier' },
  { id: 'component', title: 'Component', isDefault: false },
  { id: 'status', title: 'Status' },
  { id: 'passRate', title: 'Pass Rate' },
  { id: 'tests', title: 'Tests' },
  { id: 'failed', title: 'Failed' },
  { id: 'lastRun', title: 'Last Run' },
  { id: 'rp', title: 'RP' },
];

const SORT_ACCESSORS: Record<number, (g: LaunchGroup) => string | number | null> = {
  0: (group) => group.cnvVersion,
  1: (group) => group.tier,
  2: (group) => group.component ?? '',
  3: (group) => group.latestLaunch.status,
  4: (group) => group.passRate,
  5: (group) => group.totalTests,
  6: (group) => group.failedTests,
  7: (group) => group.latestLaunch.start_time,
};

type LaunchTableProps = {
  groups: LaunchGroup[];
  availableComponents: string[];
  tableSearch: string;
  onSearchChange: (val: string) => void;
  config: PublicConfig | undefined;
};

export const LaunchTable: React.FC<LaunchTableProps> = ({ groups, availableComponents, tableSearch, onSearchChange, config }) => {
  const navigate = useNavigate();
  const colMgmt = useColumnManagement('dashboard', DASHBOARD_COLUMNS);
  const vis = colMgmt.isColumnVisible;

  const { sorted: sortedGroupsRaw, getSortParams } = useTableSort(groups, SORT_ACCESSORS, { index: 7, direction: SortByDirection.desc });

  const sortedGroups = useMemo(() => {
    if (!tableSearch.trim()) return sortedGroupsRaw;
    const searchLower = tableSearch.toLowerCase();
    return sortedGroupsRaw.filter(group =>
      group.cnvVersion.toLowerCase().includes(searchLower) || group.tier.toLowerCase().includes(searchLower)
      || (group.component ?? '').toLowerCase().includes(searchLower) || group.latestLaunch.status.toLowerCase().includes(searchLower),
    );
  }, [sortedGroupsRaw, tableSearch]);

  const showComponentCol = availableComponents.length > 1 || vis('component');

  const navigateToGroup = useCallback((group: LaunchGroup) => {
    if (group.launches.length > 1) {
      const ids = group.launches.map(launch => launch.rp_id).join(',');
      navigate(`/launch/${group.latestLaunch.rp_id}?launches=${ids}&version=${encodeURIComponent(group.cnvVersion)}&tier=${encodeURIComponent(group.tier)}`);
    } else {
      navigate(`/launch/${group.latestLaunch.rp_id}`);
    }
  }, [navigate]);

  const fmtTime = (ts: string | number) => {
    const dateObj = new Date(ts);
    return `${dateObj.toLocaleDateString()} ${dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  };

  return (
    <Card>
      <CardBody>
        <TableToolbar searchValue={tableSearch} onSearchChange={onSearchChange} searchPlaceholder="Search by version, tier, component..." resultCount={sortedGroups.length} totalCount={groups.length} columns={DASHBOARD_COLUMNS} visibleIds={colMgmt.visibleIds} onSaveColumns={colMgmt.setColumns} onResetColumns={colMgmt.resetColumns} />
        <div className="app-table-scroll">
          <Table aria-label="Launch status table" variant="compact" isStickyHeader>
            <Thead>
              <Tr>
                {vis('version') && <ThWithHelp label="Version" help="CNV version" sort={getSortParams(0)} />}
                {vis('tier') && <ThWithHelp label="Tier" help="Test tier and variant" sort={getSortParams(1)} />}
                {showComponentCol && vis('component') && <ThWithHelp label="Component" help="Jira component mapped from Jenkins team" sort={getSortParams(2)} />}
                {vis('status') && <ThWithHelp label="Status" help="Launch status" sort={getSortParams(3)} />}
                {vis('passRate') && <ThWithHelp label="Pass Rate" help="Aggregated pass rate" sort={getSortParams(4)} />}
                {vis('tests') && <ThWithHelp label="Tests" help="Passed / Total" sort={getSortParams(5)} />}
                {vis('failed') && <ThWithHelp label="Failed" help="Failed test count" sort={getSortParams(6)} />}
                {vis('lastRun') && <ThWithHelp label="Last Run" help="Start time of the latest launch" sort={getSortParams(7)} />}
                {vis('rp') && <ThWithHelp label="RP" help="Link to ReportPortal" />}
              </Tr>
            </Thead>
            <Tbody>
              {sortedGroups.length === 0 && (
                <Tr><Td colSpan={colMgmt.visibleColumns.length}><EmptyState variant="sm"><EmptyStateBody>No launches match the selected filters.</EmptyStateBody></EmptyState></Td></Tr>
              )}
              {sortedGroups.map((group) => (
                <Tr key={`${group.cnvVersion}-${group.tier}-${group.component}`} isClickable onRowClick={() => navigateToGroup(group)}>
                  {vis('version') && <Td dataLabel="Version" className="app-cell-nowrap"><strong>{group.cnvVersion}</strong></Td>}
                  {vis('tier') && <Td dataLabel="Tier" className="app-cell-nowrap">{group.tier}</Td>}
                  {showComponentCol && vis('component') && <Td dataLabel="Component" className="app-cell-nowrap"><Label color="grey" isCompact>{group.component || '--'}</Label></Td>}
                  {vis('status') && <Td dataLabel="Status" className="app-cell-nowrap">{group.latestLaunch.status === 'IN_PROGRESS' ? <LaunchProgress launchRpId={group.latestLaunch.rp_id} /> : <StatusBadge status={group.latestLaunch.status} />}</Td>}
                  {vis('passRate') && <Td dataLabel="Pass Rate" className="app-cell-nowrap"><PassRateBar rate={group.passRate} passed={group.passedTests} total={group.totalTests} failed={group.failedTests} skipped={group.skippedTests} launchName={group.latestLaunch.name} startTime={group.latestLaunch.start_time} launchCount={group.launches.length} /></Td>}
                  {vis('tests') && <Td dataLabel="Tests" className="app-cell-nowrap">{group.passedTests}/{group.totalTests}</Td>}
                  {vis('failed') && <Td dataLabel="Failed" className="app-cell-nowrap">{group.failedTests}</Td>}
                  {vis('lastRun') && <Td dataLabel="Last Run" className="app-cell-nowrap"><Tooltip content={new Date(group.latestLaunch.start_time).toLocaleString()}><span className="app-cursor-help">{fmtTime(group.latestLaunch.start_time)}</span></Tooltip></Td>}
                  {vis('rp') && <Td dataLabel="RP" onClick={(e) => e.stopPropagation()}>{config && <a href={`${config.rpLaunchBaseUrl}/${group.latestLaunch.rp_id}`} target="_blank" rel="noreferrer" aria-label="Open in ReportPortal"><ExternalLinkAltIcon /></a>}</Td>}
                </Tr>
              ))}
            </Tbody>
          </Table>
        </div>
      </CardBody>
    </Card>
  );
};
