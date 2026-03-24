import React, { useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

import type { LaunchGroup, PublicConfig } from '@cnv-monitor/shared';

import {
  Card,
  CardBody,
  EmptyState,
  EmptyStateBody,
  Label,
  ToolbarItem,
  Tooltip,
} from '@patternfly/react-core';
import { ExternalLinkAltIcon } from '@patternfly/react-icons';
import { SortByDirection, Table, Tbody, Td, Thead, Tr } from '@patternfly/react-table';

import { type ColumnDef, useColumnManagement } from '../../hooks/useColumnManagement';
import { useTableSort } from '../../hooks/useTableSort';
import { ComponentMultiSelect } from '../common/ComponentMultiSelect';
import { LaunchProgress } from '../common/LaunchProgress';
import { PassRateBar } from '../common/PassRateBar';
import { SearchableSelect, type SearchableSelectOption } from '../common/SearchableSelect';
import { StatusBadge } from '../common/StatusBadge';
import { TableToolbar } from '../common/TableToolbar';
import { ThWithHelp } from '../common/ThWithHelp';

const DASHBOARD_COLUMNS: ColumnDef[] = [
  { id: 'version', title: 'Version' },
  { id: 'tier', title: 'Tier' },
  { id: 'component', isDefault: false, title: 'Component' },
  { id: 'status', title: 'Status' },
  { id: 'passRate', title: 'Pass Rate' },
  { id: 'tests', title: 'Tests' },
  { id: 'failed', title: 'Failed' },
  { id: 'lastRun', title: 'Last Run' },
  { id: 'rp', title: 'RP' },
];

const SORT_ACCESSORS: Record<number, (g: LaunchGroup) => string | number | null> = {
  0: group => group.cnvVersion,
  1: group => group.tier,
  2: group => group.component ?? '',
  3: group => group.latestLaunch.status,
  4: group => group.passRate,
  5: group => group.totalTests,
  6: group => group.failedTests,
  7: group => group.latestLaunch.start_time,
};

function fmtTime(ts: string | number): string {
  const dateObj = new Date(ts);
  return `${dateObj.toLocaleDateString()} ${dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
}

type LaunchTableProps = {
  groups: LaunchGroup[];
  availableComponents: string[];
  tableSearch: string;
  onSearchChange: (val: string) => void;
  config: PublicConfig | undefined;
  selectedTiers: Set<string>;
  availableTiers: string[];
  onTiersChange: (value: Set<string>) => void;
  versionFilter: string;
  versionOptions: SearchableSelectOption[];
  onVersionChange: (value: string) => void;
};

export const LaunchTable: React.FC<LaunchTableProps> = ({
  availableComponents,
  availableTiers,
  config,
  groups,
  onSearchChange,
  onTiersChange,
  onVersionChange,
  selectedTiers,
  tableSearch,
  versionFilter,
  versionOptions,
}) => {
  const navigate = useNavigate();
  const colMgmt = useColumnManagement('dashboard', DASHBOARD_COLUMNS);
  const vis = colMgmt.isColumnVisible;

  const { getSortParams, sorted: sortedGroupsRaw } = useTableSort(groups, SORT_ACCESSORS, {
    direction: SortByDirection.desc,
    index: 0,
  });

  const sortedGroups = useMemo(() => {
    if (!tableSearch.trim()) {
      return sortedGroupsRaw;
    }
    const searchLower = tableSearch.toLowerCase();
    return sortedGroupsRaw.filter(
      group =>
        group.cnvVersion.toLowerCase().includes(searchLower) ||
        group.tier.toLowerCase().includes(searchLower) ||
        (group.component ?? '').toLowerCase().includes(searchLower) ||
        group.latestLaunch.status.toLowerCase().includes(searchLower),
    );
  }, [sortedGroupsRaw, tableSearch]);

  const showComponentCol = availableComponents.length > 1 || vis('component');

  const navigateToGroup = useCallback(
    (group: LaunchGroup) => {
      const rpId = group.latestLaunch.rp_id;
      if (!rpId) {
        return;
      }
      const launches = group.launches ?? [];
      if (launches.length > 1) {
        const ids = launches.map(launch => launch.rp_id).join(',');
        navigate(
          `/launch/${rpId}?launches=${ids}&version=${encodeURIComponent(group.cnvVersion)}&tier=${encodeURIComponent(group.tier)}`,
        );
      } else {
        navigate(`/launch/${rpId}`);
      }
    },
    [navigate],
  );

  return (
    <Card>
      <CardBody>
        <TableToolbar
          columns={DASHBOARD_COLUMNS}
          resultCount={sortedGroups.length}
          searchPlaceholder="Search by version, tier, component..."
          searchValue={tableSearch}
          totalCount={groups.length}
          visibleIds={colMgmt.visibleIds}
          onResetColumns={colMgmt.resetColumns}
          onSaveColumns={colMgmt.setColumns}
          onSearchChange={onSearchChange}
        >
          {availableTiers.length > 0 && (
            <ToolbarItem>
              <ComponentMultiSelect
                id="tier-filter"
                isDisabled={availableTiers.length <= 1}
                itemLabel="tiers"
                options={availableTiers}
                placeholder="All Tiers"
                selected={selectedTiers}
                onChange={onTiersChange}
              />
            </ToolbarItem>
          )}
          {versionOptions.length > 2 && (
            <ToolbarItem>
              <SearchableSelect
                id="version-filter"
                options={versionOptions}
                placeholder="All Versions"
                value={versionFilter}
                onChange={onVersionChange}
              />
            </ToolbarItem>
          )}
        </TableToolbar>
        <div className="app-table-scroll">
          <Table isStickyHeader aria-label="Launch status table" variant="compact">
            <Thead>
              <Tr>
                {vis('version') && (
                  <ThWithHelp help="CNV version" label="Version" sort={getSortParams(0)} />
                )}
                {vis('tier') && (
                  <ThWithHelp help="Test tier and variant" label="Tier" sort={getSortParams(1)} />
                )}
                {showComponentCol && vis('component') && (
                  <ThWithHelp
                    help="Jira component mapped from Jenkins team"
                    label="Component"
                    sort={getSortParams(2)}
                  />
                )}
                {vis('status') && (
                  <ThWithHelp help="Launch status" label="Status" sort={getSortParams(3)} />
                )}
                {vis('passRate') && (
                  <ThWithHelp
                    help="Aggregated pass rate"
                    label="Pass Rate"
                    sort={getSortParams(4)}
                  />
                )}
                {vis('tests') && (
                  <ThWithHelp help="Passed / Total" label="Tests" sort={getSortParams(5)} />
                )}
                {vis('failed') && (
                  <ThWithHelp help="Failed test count" label="Failed" sort={getSortParams(6)} />
                )}
                {vis('lastRun') && (
                  <ThWithHelp
                    help="Start time of the latest launch"
                    label="Last Run"
                    sort={getSortParams(7)}
                  />
                )}
                {vis('rp') && <ThWithHelp help="Link to ReportPortal" label="RP" />}
              </Tr>
            </Thead>
            <Tbody>
              {sortedGroups.length === 0 && (
                <Tr>
                  <Td colSpan={colMgmt.visibleColumns.length}>
                    <EmptyState variant="sm">
                      <EmptyStateBody>No launches match the selected filters.</EmptyStateBody>
                    </EmptyState>
                  </Td>
                </Tr>
              )}
              {sortedGroups.map(group => (
                <Tr
                  isClickable
                  key={`${group.cnvVersion}-${group.tier}-${group.component}`}
                  onRowClick={() => navigateToGroup(group)}
                >
                  {vis('version') && (
                    <Td className="app-cell-nowrap" dataLabel="Version">
                      <strong>{group.cnvVersion}</strong>
                    </Td>
                  )}
                  {vis('tier') && (
                    <Td className="app-cell-nowrap" dataLabel="Tier">
                      {group.tier}
                    </Td>
                  )}
                  {showComponentCol && vis('component') && (
                    <Td className="app-cell-nowrap" dataLabel="Component">
                      <Label isCompact color="grey">
                        {group.component || '--'}
                      </Label>
                    </Td>
                  )}
                  {vis('status') && (
                    <Td className="app-cell-nowrap" dataLabel="Status">
                      {group.latestLaunch.status === 'IN_PROGRESS' ? (
                        <LaunchProgress launchRpId={group.latestLaunch.rp_id} />
                      ) : (
                        <StatusBadge status={group.latestLaunch.status} />
                      )}
                    </Td>
                  )}
                  {vis('passRate') && (
                    <Td className="app-cell-nowrap" dataLabel="Pass Rate">
                      <PassRateBar
                        failed={group.failedTests}
                        launchCount={group.launchCount ?? group.launches?.length ?? 1}
                        launchName={group.latestLaunch.name}
                        passed={group.passedTests}
                        rate={group.passRate}
                        skipped={group.skippedTests}
                        startTime={group.latestLaunch.start_time}
                        total={group.totalTests}
                      />
                    </Td>
                  )}
                  {vis('tests') && (
                    <Td className="app-cell-nowrap" dataLabel="Tests">
                      {group.passedTests}/{group.totalTests}
                    </Td>
                  )}
                  {vis('failed') && (
                    <Td className="app-cell-nowrap" dataLabel="Failed">
                      {group.failedTests}
                    </Td>
                  )}
                  {vis('lastRun') && (
                    <Td className="app-cell-nowrap" dataLabel="Last Run">
                      <Tooltip content={new Date(group.latestLaunch.start_time).toLocaleString()}>
                        <span className="app-cursor-help">
                          {fmtTime(group.latestLaunch.start_time)}
                        </span>
                      </Tooltip>
                    </Td>
                  )}
                  {vis('rp') && (
                    <Td dataLabel="RP" onClick={e => e.stopPropagation()}>
                      {config && (
                        <a
                          aria-label="Open in ReportPortal"
                          href={`${config.rpLaunchBaseUrl}/${group.latestLaunch.rp_id}`}
                          rel="noreferrer"
                          target="_blank"
                        >
                          <ExternalLinkAltIcon />
                        </a>
                      )}
                    </Td>
                  )}
                </Tr>
              ))}
            </Tbody>
          </Table>
        </div>
      </CardBody>
    </Card>
  );
};
