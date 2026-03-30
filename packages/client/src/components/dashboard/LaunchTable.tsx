import { useMemo } from 'react';

import { type LaunchGroup, type PublicConfig } from '@cnv-monitor/shared';

import { Card, CardBody, EmptyState, EmptyStateBody, ToolbarItem } from '@patternfly/react-core';
import { SortByDirection, Table, Tbody, Td, Tr } from '@patternfly/react-table';

import { useColumnManagement } from '../../hooks/useColumnManagement';
import { useNavigateToGroup } from '../../hooks/useNavigateToGroup';
import { useTableSort } from '../../hooks/useTableSort';
import { ComponentMultiSelect } from '../common/ComponentMultiSelect';
import { SearchableSelect, type SearchableSelectOption } from '../common/SearchableSelect';
import { TableToolbar } from '../common/TableToolbar';

import { LaunchTableHead } from './LaunchTableHead';
import { DASHBOARD_COLUMNS, SORT_ACCESSORS } from './launchTableHelpers';
import { LaunchTableRow } from './LaunchTableRow';

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

export const LaunchTable = ({
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
}: LaunchTableProps) => {
  const navigateToGroup = useNavigateToGroup();
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
            <LaunchTableHead
              getSortParams={getSortParams}
              showComponentCol={showComponentCol}
              vis={vis}
            />
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
                <LaunchTableRow
                  config={config}
                  group={group}
                  key={`${group.cnvVersion}-${group.tier}-${group.component}`}
                  showComponentCol={showComponentCol}
                  vis={vis}
                  onRowClick={() => navigateToGroup(group)}
                />
              ))}
            </Tbody>
          </Table>
        </div>
      </CardBody>
    </Card>
  );
};
