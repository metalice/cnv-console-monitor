import { useMemo, useState } from 'react';

import type { PublicConfig, TestItem } from '@cnv-monitor/shared';

import { SortByDirection, Table, Tbody } from '@patternfly/react-table';

import { useColumnManagement } from '../../hooks/useColumnManagement';
import { useTableSort } from '../../hooks/useTableSort';
import type { AggregatedItem } from '../../utils/aggregation';
import { TableToolbar } from '../common/TableToolbar';

import { TestItemsRow } from './TestItemsRow';
import { GROUP_ACCESSORS, LAUNCH_COLUMNS, SINGLE_ACCESSORS } from './testItemsTableColumns';
import { TestItemsTableHead } from './TestItemsTableHead';

type TestItemsTableProps = {
  displayItems: AggregatedItem[];
  isGroupMode: boolean;
  launchCount: number;
  config: PublicConfig | undefined;
  onNavigate: (path: string) => void;
  onTriage: (rpIds: number[]) => void;
  onCreateJira: (item: TestItem) => void;
  onLinkJira: (rpId: number) => void;
};

export const TestItemsTable = ({
  config,
  displayItems,
  isGroupMode,
  launchCount,
  onCreateJira,
  onLinkJira,
  onNavigate,
  onTriage,
}: TestItemsTableProps) => {
  const [expandedItems, setExpandedItems] = useState(new Set());
  const [tableSearch, setTableSearch] = useState('');
  const colMgmt = useColumnManagement('launchDetail', LAUNCH_COLUMNS);

  const accessors = isGroupMode ? GROUP_ACCESSORS : SINGLE_ACCESSORS;
  const { getSortParams, sorted } = useTableSort(displayItems, accessors, {
    direction: SortByDirection.asc,
    index: 1,
  });

  const searchFiltered = useMemo(() => {
    if (!tableSearch.trim()) {
      return sorted;
    }
    const term = tableSearch.toLowerCase();
    return sorted.filter(
      ({ representative: item }) =>
        item.name.toLowerCase().includes(term) ||
        (item.error_message?.toLowerCase().includes(term) ?? false) ||
        (item.jira_key?.toLowerCase().includes(term) ?? false) ||
        (item.polarion_id?.toLowerCase().includes(term) ?? false),
    );
  }, [sorted, tableSearch]);

  const toggleExpand = (itemId: number) => {
    setExpandedItems(prev => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  };

  return (
    <>
      <TableToolbar
        columns={LAUNCH_COLUMNS}
        resultCount={searchFiltered.length}
        searchPlaceholder="Search test items..."
        searchValue={tableSearch}
        totalCount={displayItems.length}
        visibleIds={colMgmt.visibleIds}
        onResetColumns={colMgmt.resetColumns}
        onSaveColumns={colMgmt.setColumns}
        onSearchChange={setTableSearch}
      />
      <div className="app-table-scroll">
        <Table isStickyHeader aria-label="Test items table" variant="compact">
          <colgroup>
            <col className="app-col-narrow" />
          </colgroup>
          <TestItemsTableHead
            getSortParams={getSortParams}
            isColumnVisible={colMgmt.isColumnVisible}
            isGroupMode={isGroupMode}
          />
          <Tbody>
            {searchFiltered.map(group => (
              <TestItemsRow
                config={config}
                group={group}
                isColumnVisible={colMgmt.isColumnVisible}
                isExpanded={expandedItems.has(group.representative.rp_id)}
                isGroupMode={isGroupMode}
                key={group.representative.unique_id ?? group.representative.rp_id}
                launchCount={launchCount}
                visibleColumnCount={colMgmt.visibleColumns.length}
                onCreateJira={onCreateJira}
                onLinkJira={onLinkJira}
                onNavigate={onNavigate}
                onToggleExpand={toggleExpand}
                onTriage={onTriage}
              />
            ))}
          </Tbody>
        </Table>
      </div>
    </>
  );
};
