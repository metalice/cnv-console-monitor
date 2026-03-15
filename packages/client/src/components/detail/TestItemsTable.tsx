import React, { useMemo, useState } from 'react';
import { Table, Thead, Tr, Th, Tbody, SortByDirection } from '@patternfly/react-table';
import type { TestItem, PublicConfig } from '@cnv-monitor/shared';
import type { AggregatedItem } from '../../utils/aggregation';
import { useTableSort } from '../../hooks/useTableSort';
import { useColumnManagement, type ColumnDef } from '../../hooks/useColumnManagement';
import { TableToolbar } from '../common/TableToolbar';
import { ThWithHelp } from '../common/ThWithHelp';
import { TestItemsRow } from './TestItemsRow';

const LAUNCH_COLUMNS: ColumnDef[] = [
  { id: 'testName', title: 'Test Name' },
  { id: 'status', title: 'Status' },
  { id: 'error', title: 'Error' },
  { id: 'polarion', title: 'Polarion' },
  { id: 'defect', title: 'AI Prediction' },
  { id: 'jira', title: 'Jira' },
  { id: 'actions', title: 'Actions' },
];

const SINGLE_ACCESSORS: Record<number, (item: AggregatedItem) => string | number | null | undefined> = {
  1: (item) => item.representative.name.split('.').pop() || item.representative.name,
  2: (item) => item.representative.status,
  3: (item) => item.representative.error_message,
  4: (item) => item.representative.polarion_id,
  5: (item) => item.representative.ai_prediction,
  6: (item) => item.representative.jira_key,
};

const GROUP_ACCESSORS: Record<number, (item: AggregatedItem) => string | number | null | undefined> = {
  1: (item) => item.representative.name.split('.').pop() || item.representative.name,
  2: (item) => item.occurrences,
  3: (item) => item.representative.status,
  4: (item) => item.representative.error_message,
  5: (item) => item.representative.polarion_id,
  6: (item) => item.representative.ai_prediction,
  7: (item) => item.representative.jira_key,
};

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

export const TestItemsTable: React.FC<TestItemsTableProps> = ({
  displayItems, isGroupMode, launchCount, config,
  onNavigate, onTriage, onCreateJira, onLinkJira,
}) => {
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());
  const [tableSearch, setTableSearch] = useState('');
  const colMgmt = useColumnManagement('launchDetail', LAUNCH_COLUMNS);

  const accessors = isGroupMode ? GROUP_ACCESSORS : SINGLE_ACCESSORS;
  const { sorted, getSortParams } = useTableSort(displayItems, accessors, { index: 1, direction: SortByDirection.asc });

  const searchFiltered = useMemo(() => {
    if (!tableSearch.trim()) return sorted;
    const term = tableSearch.toLowerCase();
    return sorted.filter(({ representative: item }) =>
      item.name.toLowerCase().includes(term)
      || (item.error_message?.toLowerCase().includes(term) ?? false)
      || (item.jira_key?.toLowerCase().includes(term) ?? false)
      || (item.polarion_id?.toLowerCase().includes(term) ?? false),
    );
  }, [sorted, tableSearch]);

  const toggleExpand = (itemId: number) => {
    setExpandedItems((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId); else next.add(itemId);
      return next;
    });
  };

  return (
    <>
      <TableToolbar searchValue={tableSearch} onSearchChange={setTableSearch} searchPlaceholder="Search test items..." resultCount={searchFiltered.length} totalCount={displayItems.length} columns={LAUNCH_COLUMNS} visibleIds={colMgmt.visibleIds} onSaveColumns={colMgmt.setColumns} onResetColumns={colMgmt.resetColumns} />
      <div className="app-table-scroll">
        <Table aria-label="Test items table" variant="compact" isStickyHeader>
          <colgroup><col className="app-col-narrow" /></colgroup>
          <Thead>
            <Tr>
              <Th />
              {colMgmt.isColumnVisible('testName') && <ThWithHelp label="Test Name" help="Short name of the test case." sort={getSortParams(1)} />}
              {isGroupMode && <ThWithHelp label="Occurrences" help="Number of times this test failed across the launches in this group." sort={getSortParams(2)} />}
              {colMgmt.isColumnVisible('status') && <ThWithHelp label="Status" help="Test result: FAILED, PASSED, or SKIPPED." sort={getSortParams(isGroupMode ? 3 : 2)} />}
              {colMgmt.isColumnVisible('error') && <ThWithHelp label="Error" help="First line of the error log. Expand row for full logs." />}
              {colMgmt.isColumnVisible('polarion') && <ThWithHelp label="Polarion" help="Polarion test case ID." sort={getSortParams(isGroupMode ? 5 : 4)} />}
              {colMgmt.isColumnVisible('defect') && <ThWithHelp label="AI Prediction" help="AI prediction of defect type with confidence %." sort={getSortParams(isGroupMode ? 6 : 5)} />}
              {colMgmt.isColumnVisible('jira') && <ThWithHelp label="Jira" help="Linked Jira issue key and status." sort={getSortParams(isGroupMode ? 7 : 6)} />}
              {colMgmt.isColumnVisible('actions') && <ThWithHelp label="Actions" help="Classify: set defect type. Bug: create Jira. Link: associate existing Jira." />}
            </Tr>
          </Thead>
          <Tbody>
            {searchFiltered.map((group) => (
              <TestItemsRow
                key={group.representative.unique_id ?? group.representative.rp_id}
                group={group}
                isGroupMode={isGroupMode}
                launchCount={launchCount}
                config={config}
                isExpanded={expandedItems.has(group.representative.rp_id)}
                visibleColumnCount={colMgmt.visibleColumns.length}
                isColumnVisible={colMgmt.isColumnVisible}
                onToggleExpand={toggleExpand}
                onNavigate={onNavigate}
                onTriage={onTriage}
                onCreateJira={onCreateJira}
                onLinkJira={onLinkJira}
              />
            ))}
          </Tbody>
        </Table>
      </div>
    </>
  );
};
