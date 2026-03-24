import React from 'react';

import type { PublicConfig, TestItem } from '@cnv-monitor/shared';

import {
  Button,
  Content,
  EmptyState,
  EmptyStateBody,
  Flex,
  FlexItem,
  Label,
  Spinner,
  Toolbar,
  ToolbarContent,
  ToolbarItem,
  Tooltip,
} from '@patternfly/react-core';
import { BugIcon, CheckCircleIcon, WrenchIcon } from '@patternfly/react-icons';
import { SortByDirection, Table, Tbody, Td, Th, Thead, Tr } from '@patternfly/react-table';

import type { StreakInfo } from '../../api/testItems';
import { type ColumnDef, useColumnManagement } from '../../hooks/useColumnManagement';
import { useTableSort } from '../../hooks/useTableSort';
import type { AggregatedItem } from '../../utils/aggregation';
import { StatusBadge } from '../common/StatusBadge';
import { TableToolbar } from '../common/TableToolbar';
import { AiPredictionCell, ErrorCell, JiraCell, PolarionCell } from '../common/TestItemCells';
import { ThWithHelp } from '../common/ThWithHelp';

const COLUMNS: ColumnDef[] = [
  { id: 'select', title: 'Select' },
  { id: 'testName', title: 'Test Name' },
  { id: 'occurrences', title: 'Occurrences' },
  { id: 'status', title: 'Status' },
  { id: 'error', title: 'Error' },
  { id: 'polarion', title: 'Polarion' },
  { id: 'aiPrediction', title: 'AI Prediction' },
  { id: 'jira', title: 'Jira' },
  { id: 'actions', title: 'Actions' },
];

const SORT_ACCESSORS: Record<number, (item: AggregatedItem) => string | number | null | undefined> =
  {
    1: item => item.representative.name.split('.').pop() || item.representative.name,
    2: item => item.occurrences,
    3: item => item.representative.status,
    4: item => item.representative.error_message,
    5: item => item.representative.polarion_id,
    6: item => item.representative.ai_prediction,
    7: item => item.representative.jira_key,
  };

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

export const FailuresTable: React.FC<FailuresTableProps> = ({
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
}) => {
  const [selectedIds, setSelectedIds] = React.useState(new Set<number>());
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

  const handleSelectAll = (checked: boolean) =>
    setSelectedIds(checked ? new Set(searchFiltered.flatMap(group => group.allRpIds)) : new Set());
  const handleSelect = (rpIds: number[], checked: boolean) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      for (const rpId of rpIds) {
        if (checked) {
          next.add(rpId);
        } else {
          next.delete(rpId);
        }
      }
      return next;
    });
  };
  const isGroupSelected = (rpIds: number[]) => rpIds.every(rpId => selectedIds.has(rpId));
  const allSelected =
    searchFiltered.length > 0 && searchFiltered.every(group => isGroupSelected(group.allRpIds));

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
      {selectedIds.size > 0 && (
        <Toolbar>
          <ToolbarContent>
            <ToolbarItem>
              <Content>{selectedIds.size} selected</Content>
            </ToolbarItem>
            <ToolbarItem>
              <Button
                icon={<WrenchIcon />}
                variant="primary"
                onClick={() => {
                  onTriageSelected([...selectedIds]);
                  setSelectedIds(new Set());
                }}
              >
                Classify Selected
              </Button>
            </ToolbarItem>
          </ToolbarContent>
        </Toolbar>
      )}
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
          <Thead>
            <Tr>
              {colMgmt.isColumnVisible('select') && (
                <Th
                  select={{
                    isSelected: allSelected,
                    onSelect: (_event, checked) => handleSelectAll(checked),
                  }}
                />
              )}
              {colMgmt.isColumnVisible('testName') && (
                <ThWithHelp
                  help="Short name of the failed test case."
                  label="Test Name"
                  sort={getSortParams(1)}
                />
              )}
              {colMgmt.isColumnVisible('occurrences') && (
                <ThWithHelp
                  help="Times this test failed across launches in the selected window."
                  label="Occurrences"
                  sort={getSortParams(2)}
                />
              )}
              {colMgmt.isColumnVisible('status') && (
                <ThWithHelp
                  help="FAILED or SKIPPED (untriaged only)."
                  label="Status"
                  sort={getSortParams(3)}
                />
              )}
              {colMgmt.isColumnVisible('error') && (
                <ThWithHelp help="First line of the error log." label="Error" />
              )}
              {colMgmt.isColumnVisible('polarion') && (
                <ThWithHelp
                  help="Polarion test case ID."
                  label="Polarion"
                  sort={getSortParams(5)}
                />
              )}
              {colMgmt.isColumnVisible('aiPrediction') && (
                <ThWithHelp
                  help="AI defect type prediction with confidence %."
                  label="AI Prediction"
                  sort={getSortParams(6)}
                />
              )}
              {colMgmt.isColumnVisible('jira') && (
                <ThWithHelp
                  help="Linked Jira issue key and status."
                  label="Jira"
                  sort={getSortParams(7)}
                />
              )}
              {colMgmt.isColumnVisible('actions') && (
                <ThWithHelp help="Classify or create Jira bugs." label="Actions" />
              )}
            </Tr>
          </Thead>
          <Tbody>
            {searchFiltered.map(({ allRpIds, occurrences, representative: item }) => {
              const shortName = item.name.split('.').pop() || item.name;
              const isNew = item.unique_id ? newFailureIds.has(item.unique_id) : false;
              const streak = item.unique_id ? streaks?.[item.unique_id] : undefined;
              return (
                <Tr key={item.unique_id ?? item.rp_id}>
                  {colMgmt.isColumnVisible('select') && (
                    <Td
                      select={{
                        isSelected: isGroupSelected(allRpIds),
                        onSelect: (_event, checked) => handleSelect(allRpIds, checked),
                        rowIndex: item.rp_id,
                      }}
                    />
                  )}
                  {colMgmt.isColumnVisible('testName') && (
                    <Td className="app-cell-truncate" dataLabel="Test Name">
                      <Tooltip content={item.name}>
                        {item.unique_id ? (
                          <Button
                            isInline
                            size="sm"
                            variant="link"
                            onClick={() =>
                              // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                              onNavigate(`/test/${encodeURIComponent(item.unique_id!)}`)
                            }
                          >
                            {shortName}
                          </Button>
                        ) : (
                          <span>{shortName}</span>
                        )}
                      </Tooltip>
                      {isNew && (
                        <Label isCompact className="app-ml-xs" color="teal">
                          New
                        </Label>
                      )}
                    </Td>
                  )}
                  {colMgmt.isColumnVisible('occurrences') && (
                    <Td className="app-cell-nowrap" dataLabel="Occurrences">
                      {occurrences > 1 && (
                        <Tooltip content={`Failed in ${occurrences} launches.`}>
                          <Label isCompact color="orange">
                            {occurrences}x
                          </Label>
                        </Tooltip>
                      )}
                      {streak && streak.consecutiveFailures > 0 && (
                        <>
                          {' '}
                          <Tooltip
                            content={`Failed in last ${streak.consecutiveFailures} of ${streak.totalRuns} runs`}
                          >
                            <Label isCompact color="red">
                              {streak.consecutiveFailures}/{streak.totalRuns} failing
                            </Label>
                          </Tooltip>
                          {streak.lastPassDate && (
                            <span className="app-text-xs app-text-muted app-ml-xs">
                              Last pass:{' '}
                              {new Date(streak.lastPassDate).toLocaleDateString('en-US', {
                                day: 'numeric',
                                month: 'short',
                              })}
                            </span>
                          )}
                        </>
                      )}
                    </Td>
                  )}
                  {colMgmt.isColumnVisible('status') && (
                    <Td className="app-cell-nowrap" dataLabel="Status">
                      <StatusBadge status={item.status} />
                    </Td>
                  )}
                  <ErrorCell
                    useRichTooltip
                    errorMessage={item.error_message}
                    visible={colMgmt.isColumnVisible('error')}
                  />
                  <PolarionCell
                    config={config}
                    polarionId={item.polarion_id}
                    visible={colMgmt.isColumnVisible('polarion')}
                  />
                  <AiPredictionCell
                    confidence={item.ai_confidence}
                    prediction={item.ai_prediction}
                    visible={colMgmt.isColumnVisible('aiPrediction')}
                  />
                  <JiraCell
                    config={config}
                    jiraKey={item.jira_key}
                    jiraStatus={item.jira_status}
                    visible={colMgmt.isColumnVisible('jira')}
                  />
                  {colMgmt.isColumnVisible('actions') && (
                    <Td className="app-cell-nowrap" dataLabel="Actions">
                      <Flex flexWrap={{ default: 'nowrap' }}>
                        <FlexItem>
                          <Button
                            isInline
                            icon={<WrenchIcon />}
                            variant="link"
                            onClick={() => onTriageSelected(allRpIds)}
                          >
                            Classify{occurrences > 1 ? ` (${occurrences})` : ''}
                          </Button>
                        </FlexItem>
                        <FlexItem>
                          <Button
                            isInline
                            icon={<BugIcon />}
                            variant="link"
                            onClick={() => onCreateJira(item)}
                          >
                            Bug
                          </Button>
                        </FlexItem>
                      </Flex>
                    </Td>
                  )}
                </Tr>
              );
            })}
          </Tbody>
        </Table>
      </div>
    </>
  );
};
