import React, { useMemo, useState } from 'react';

import type { PublicConfig, TestItem } from '@cnv-monitor/shared';

import { SortByDirection, Table, Tbody, Th, Thead, Tr } from '@patternfly/react-table';

import { type ColumnDef, useColumnManagement } from '../../hooks/useColumnManagement';
import { useTableSort } from '../../hooks/useTableSort';
import type { AggregatedItem } from '../../utils/aggregation';
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

const SINGLE_ACCESSORS: Record<
  number,
  (item: AggregatedItem) => string | number | null | undefined
> = {
  1: item => item.representative.name.split('.').pop() || item.representative.name,
  2: item => item.representative.status,
  3: item => item.representative.error_message,
  4: item => item.representative.polarion_id,
  5: item => item.representative.ai_prediction,
  6: item => item.representative.jira_key,
};

const GROUP_ACCESSORS: Record<
  number,
  (item: AggregatedItem) => string | number | null | undefined
> = {
  1: item => item.representative.name.split('.').pop() || item.representative.name,
  2: item => item.occurrences,
  3: item => item.representative.status,
  4: item => item.representative.error_message,
  5: item => item.representative.polarion_id,
  6: item => item.representative.ai_prediction,
  7: item => item.representative.jira_key,
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
  config,
  displayItems,
  isGroupMode,
  launchCount,
  onCreateJira,
  onLinkJira,
  onNavigate,
  onTriage,
}) => {
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
          <Thead>
            <Tr>
              <Th />
              {colMgmt.isColumnVisible('testName') && (
                <ThWithHelp
                  help="Short name of the test case."
                  label="Test Name"
                  sort={getSortParams(1)}
                />
              )}
              {isGroupMode && (
                <ThWithHelp
                  help="Number of times this test failed across the launches in this group."
                  label="Occurrences"
                  sort={getSortParams(2)}
                />
              )}
              {colMgmt.isColumnVisible('status') && (
                <ThWithHelp
                  help="Test result: FAILED, PASSED, or SKIPPED."
                  label="Status"
                  sort={getSortParams(isGroupMode ? 3 : 2)}
                />
              )}
              {colMgmt.isColumnVisible('error') && (
                <ThWithHelp
                  help="First line of the error log. Expand row for full logs."
                  label="Error"
                />
              )}
              {colMgmt.isColumnVisible('polarion') && (
                <ThWithHelp
                  help="Polarion test case ID."
                  label="Polarion"
                  sort={getSortParams(isGroupMode ? 5 : 4)}
                />
              )}
              {colMgmt.isColumnVisible('defect') && (
                <ThWithHelp
                  help="AI prediction of defect type with confidence %."
                  label="AI Prediction"
                  sort={getSortParams(isGroupMode ? 6 : 5)}
                />
              )}
              {colMgmt.isColumnVisible('jira') && (
                <ThWithHelp
                  help="Linked Jira issue key and status."
                  label="Jira"
                  sort={getSortParams(isGroupMode ? 7 : 6)}
                />
              )}
              {colMgmt.isColumnVisible('actions') && (
                <ThWithHelp
                  help="Classify: set defect type. Bug: create Jira. Link: associate existing Jira."
                  label="Actions"
                />
              )}
            </Tr>
          </Thead>
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
