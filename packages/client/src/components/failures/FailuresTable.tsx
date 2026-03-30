import React from 'react';

import { type PublicConfig, type TestItem } from '@cnv-monitor/shared';

import { Content, EmptyState, EmptyStateBody, Spinner } from '@patternfly/react-core';
import { CheckCircleIcon } from '@patternfly/react-icons';
import { SortByDirection, Table, Tbody } from '@patternfly/react-table';

import { type StreakInfo } from '../../api/testItems';
import { useColumnManagement } from '../../hooks/useColumnManagement';
import { useTableSort } from '../../hooks/useTableSort';
import { type AggregatedItem } from '../../utils/aggregation';
import { TableToolbar } from '../common/TableToolbar';

import { COLUMNS, SORT_ACCESSORS } from './failuresTableColumns';
import { FailuresTableHead } from './FailuresTableHead';
import { FailuresTableRow } from './FailuresTableRow';
import { SelectionToolbar } from './SelectionToolbar';
import { useFailuresSelection } from './useFailuresSelection';

type FailuresTableProps = {
  aggregated: AggregatedItem[];
  rawCount: number;
  isLoading: boolean;
  isRangeMode: boolean;
  config: PublicConfig | undefined;
  newFailureIds: Set<string>;
  streaks: Record<string, StreakInfo> | undefined;
  onNavigate: (path: string) => void;
  onTriageSelected: (itemIds: number[]) => void;
  onCreateJira: (item: TestItem) => void;
};

export const FailuresTable = ({
  aggregated,
  config,
  isLoading,
  isRangeMode,
  newFailureIds,
  onCreateJira,
  onNavigate,
  onTriageSelected,
  rawCount,
  streaks,
}: FailuresTableProps) => {
  const [tableSearch, setTableSearch] = React.useState('');
  const colMgmt = useColumnManagement('failures', COLUMNS);
  const { getSortParams, sorted } = useTableSort(aggregated, SORT_ACCESSORS, {
    direction: SortByDirection.desc,
    index: 2,
  });

  const searchFiltered = React.useMemo(() => {
    if (!tableSearch.trim()) {
      return sorted;
    }
    const term = tableSearch.toLowerCase();
    return sorted.filter(
      ({ representative: item }) =>
        item.name.toLowerCase().includes(term) ||
        (item.error_message ?? '').toLowerCase().includes(term) ||
        (item.polarion_id ?? '').toLowerCase().includes(term) ||
        (item.jira_key ?? '').toLowerCase().includes(term),
    );
  }, [sorted, tableSearch]);

  const selection = useFailuresSelection(searchFiltered);

  if (isLoading) {
    return <Spinner aria-label="Loading failures" />;
  }
  if (!sorted.length) {
    return (
      <EmptyState headingLevel="h4" icon={CheckCircleIcon} titleText="All caught up!">
        <EmptyStateBody>No untriaged failures.</EmptyStateBody>
      </EmptyState>
    );
  }

  return (
    <>
      <TableToolbar
        columns={COLUMNS}
        resultCount={searchFiltered.length}
        searchPlaceholder="Search by name, error, Polarion or Jira..."
        searchValue={tableSearch}
        totalCount={sorted.length}
        visibleIds={colMgmt.visibleIds}
        onResetColumns={colMgmt.resetColumns}
        onSaveColumns={colMgmt.setColumns}
        onSearchChange={setTableSearch}
      />
      <SelectionToolbar
        selectedCount={selection.selectedIds.size}
        onClassify={() => {
          onTriageSelected([...selection.selectedIds]);
          selection.clearSelection();
        }}
      />
      {!isRangeMode && rawCount !== sorted.length && (
        <Content className="app-text-muted app-mb-xs" component="small">
          {rawCount} total failures grouped into {sorted.length} unique tests
        </Content>
      )}
      <div className="app-table-scroll">
        <Table isStickyHeader aria-label="Untriaged failures" variant="compact">
          <colgroup>
            <col className="app-col-narrow" />
          </colgroup>
          <FailuresTableHead
            allSelected={selection.allSelected}
            getSortParams={getSortParams}
            isColumnVisible={colMgmt.isColumnVisible}
            onSelectAll={selection.handleSelectAll}
          />
          <Tbody>
            {searchFiltered.map(({ allRpIds, occurrences, representative: item }) => (
              <FailuresTableRow
                allRpIds={allRpIds}
                config={config}
                isColumnVisible={colMgmt.isColumnVisible}
                isGroupSelected={selection.isGroupSelected(allRpIds)}
                isNew={item.unique_id ? newFailureIds.has(item.unique_id) : false}
                item={item}
                key={item.unique_id ?? item.rp_id}
                occurrences={occurrences}
                streak={item.unique_id ? streaks?.[item.unique_id] : undefined}
                onCreateJira={onCreateJira}
                onNavigate={onNavigate}
                onSelect={selection.handleSelect}
                onTriageSelected={onTriageSelected}
              />
            ))}
          </Tbody>
        </Table>
      </div>
    </>
  );
};
