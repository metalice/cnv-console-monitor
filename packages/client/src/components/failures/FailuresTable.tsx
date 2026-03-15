import React from 'react';
import {
  Content, Button, Toolbar, ToolbarContent, ToolbarItem,
  Label, Flex, FlexItem, EmptyState, EmptyStateBody, Spinner, Tooltip,
} from '@patternfly/react-core';
import { Table, Thead, Tr, Th, Tbody, Td, SortByDirection } from '@patternfly/react-table';
import { CheckCircleIcon, WrenchIcon, BugIcon } from '@patternfly/react-icons';
import type { TestItem, PublicConfig } from '@cnv-monitor/shared';
import type { StreakInfo } from '../../api/testItems';
import type { AggregatedItem } from '../../utils/aggregation';
import { useTableSort } from '../../hooks/useTableSort';
import { useColumnManagement, type ColumnDef } from '../../hooks/useColumnManagement';
import { StatusBadge } from '../common/StatusBadge';
import { TableToolbar } from '../common/TableToolbar';
import { ThWithHelp } from '../common/ThWithHelp';
import { PolarionCell, AiPredictionCell, JiraCell, ErrorCell } from '../common/TestItemCells';

const COLUMNS: ColumnDef[] = [
  { id: 'select', title: 'Select' }, { id: 'testName', title: 'Test Name' },
  { id: 'occurrences', title: 'Occurrences' }, { id: 'status', title: 'Status' },
  { id: 'error', title: 'Error' }, { id: 'polarion', title: 'Polarion' },
  { id: 'aiPrediction', title: 'AI Prediction' }, { id: 'jira', title: 'Jira' },
  { id: 'actions', title: 'Actions' },
];

const SORT_ACCESSORS: Record<number, (item: AggregatedItem) => string | number | null | undefined> = {
  1: (item) => item.representative.name.split('.').pop() || item.representative.name,
  2: (item) => item.occurrences, 3: (item) => item.representative.status,
  4: (item) => item.representative.error_message, 5: (item) => item.representative.polarion_id,
  6: (item) => item.representative.ai_prediction, 7: (item) => item.representative.jira_key,
};

type FailuresTableProps = {
  aggregated: AggregatedItem[]; rawCount: number; isLoading: boolean; isRangeMode: boolean;
  config: PublicConfig | undefined; newFailureIds: Set<string>;
  streaks: Record<string, StreakInfo> | undefined;
  onNavigate: (path: string) => void; onTriageSelected: (itemIds: number[]) => void;
  onCreateJira: (item: TestItem) => void;
};

export const FailuresTable: React.FC<FailuresTableProps> = ({
  aggregated, rawCount, isLoading, isRangeMode, config,
  newFailureIds, streaks, onNavigate, onTriageSelected, onCreateJira,
}) => {
  const [selectedIds, setSelectedIds] = React.useState<Set<number>>(new Set());
  const [tableSearch, setTableSearch] = React.useState('');
  const colMgmt = useColumnManagement('failures', COLUMNS);
  const { sorted, getSortParams } = useTableSort(aggregated, SORT_ACCESSORS, { index: 2, direction: SortByDirection.desc });

  const searchFiltered = React.useMemo(() => {
    if (!tableSearch.trim()) return sorted;
    const term = tableSearch.toLowerCase();
    return sorted.filter(({ representative: item }) =>
      item.name.toLowerCase().includes(term) || (item.error_message ?? '').toLowerCase().includes(term)
      || (item.polarion_id ?? '').toLowerCase().includes(term) || (item.jira_key ?? '').toLowerCase().includes(term));
  }, [sorted, tableSearch]);

  const handleSelectAll = (checked: boolean) => setSelectedIds(checked ? new Set(searchFiltered.flatMap((group) => group.allRpIds)) : new Set());
  const handleSelect = (rpIds: number[], checked: boolean) => {
    setSelectedIds((prev) => { const next = new Set(prev); for (const rpId of rpIds) { if (checked) next.add(rpId); else next.delete(rpId); } return next; });
  };
  const isGroupSelected = (rpIds: number[]) => rpIds.every((rpId) => selectedIds.has(rpId));
  const allSelected = searchFiltered.length > 0 && searchFiltered.every((group) => isGroupSelected(group.allRpIds));

  if (isLoading) return <Spinner aria-label="Loading failures" />;
  if (!sorted.length) return <EmptyState icon={CheckCircleIcon} headingLevel="h4" titleText="All caught up!"><EmptyStateBody>No untriaged failures.</EmptyStateBody></EmptyState>;

  return (
    <>
      <TableToolbar searchValue={tableSearch} onSearchChange={setTableSearch} searchPlaceholder="Search by name, error, Polarion or Jira..." resultCount={searchFiltered.length} totalCount={sorted.length} columns={COLUMNS} visibleIds={colMgmt.visibleIds} onSaveColumns={colMgmt.setColumns} onResetColumns={colMgmt.resetColumns} />
      {selectedIds.size > 0 && (
        <Toolbar><ToolbarContent>
          <ToolbarItem><Content>{selectedIds.size} selected</Content></ToolbarItem>
          <ToolbarItem><Button variant="primary" icon={<WrenchIcon />} onClick={() => { onTriageSelected([...selectedIds]); setSelectedIds(new Set()); }}>Classify Selected</Button></ToolbarItem>
        </ToolbarContent></Toolbar>
      )}
      {!isRangeMode && rawCount !== sorted.length && <Content component="small" className="app-text-muted app-mb-xs">{rawCount} total failures grouped into {sorted.length} unique tests</Content>}
      <div className="app-table-scroll">
        <Table aria-label="Untriaged failures" variant="compact" isStickyHeader>
          <colgroup><col className="app-col-narrow" /></colgroup>
          <Thead><Tr>
            {colMgmt.isColumnVisible('select') && <Th select={{ isSelected: allSelected, onSelect: (_event, checked) => handleSelectAll(checked) }} />}
            {colMgmt.isColumnVisible('testName') && <ThWithHelp label="Test Name" help="Short name of the failed test case." sort={getSortParams(1)} />}
            {colMgmt.isColumnVisible('occurrences') && <ThWithHelp label="Occurrences" help="Times this test failed across launches in the selected window." sort={getSortParams(2)} />}
            {colMgmt.isColumnVisible('status') && <ThWithHelp label="Status" help="FAILED or SKIPPED (untriaged only)." sort={getSortParams(3)} />}
            {colMgmt.isColumnVisible('error') && <ThWithHelp label="Error" help="First line of the error log." />}
            {colMgmt.isColumnVisible('polarion') && <ThWithHelp label="Polarion" help="Polarion test case ID." sort={getSortParams(5)} />}
            {colMgmt.isColumnVisible('aiPrediction') && <ThWithHelp label="AI Prediction" help="AI defect type prediction with confidence %." sort={getSortParams(6)} />}
            {colMgmt.isColumnVisible('jira') && <ThWithHelp label="Jira" help="Linked Jira issue key and status." sort={getSortParams(7)} />}
            {colMgmt.isColumnVisible('actions') && <ThWithHelp label="Actions" help="Classify or create Jira bugs." />}
          </Tr></Thead>
          <Tbody>
            {searchFiltered.map(({ representative: item, allRpIds, occurrences }) => {
              const shortName = item.name.split('.').pop() || item.name;
              const isNew = item.unique_id ? newFailureIds.has(item.unique_id) : false;
              const streak = item.unique_id ? streaks?.[item.unique_id] : undefined;
              return (
                <Tr key={item.unique_id ?? item.rp_id}>
                  {colMgmt.isColumnVisible('select') && <Td select={{ isSelected: isGroupSelected(allRpIds), onSelect: (_event, checked) => handleSelect(allRpIds, checked), rowIndex: item.rp_id }} />}
                  {colMgmt.isColumnVisible('testName') && (
                    <Td dataLabel="Test Name" className="app-cell-truncate">
                      <Tooltip content={item.name}>{item.unique_id ? <Button variant="link" isInline size="sm" onClick={() => onNavigate(`/test/${encodeURIComponent(item.unique_id!)}`)}>{shortName}</Button> : <span>{shortName}</span>}</Tooltip>
                      {isNew && <Label color="teal" isCompact className="app-ml-xs">New</Label>}
                    </Td>
                  )}
                  {colMgmt.isColumnVisible('occurrences') && (
                    <Td dataLabel="Occurrences" className="app-cell-nowrap">
                      {occurrences > 1 && <Tooltip content={`Failed in ${occurrences} launches.`}><Label color="orange" isCompact>{occurrences}x</Label></Tooltip>}
                      {streak && streak.consecutiveFailures > 0 && <>
                        {' '}<Tooltip content={`Failed in last ${streak.consecutiveFailures} of ${streak.totalRuns} runs`}><Label color="red" isCompact>{streak.consecutiveFailures}/{streak.totalRuns} failing</Label></Tooltip>
                        {streak.lastPassDate && <span className="app-text-xs app-text-muted app-ml-xs">Last pass: {new Date(streak.lastPassDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>}
                      </>}
                    </Td>
                  )}
                  {colMgmt.isColumnVisible('status') && <Td dataLabel="Status" className="app-cell-nowrap"><StatusBadge status={item.status} /></Td>}
                  <ErrorCell visible={colMgmt.isColumnVisible('error')} errorMessage={item.error_message} useRichTooltip />
                  <PolarionCell visible={colMgmt.isColumnVisible('polarion')} polarionId={item.polarion_id} config={config} />
                  <AiPredictionCell visible={colMgmt.isColumnVisible('aiPrediction')} prediction={item.ai_prediction} confidence={item.ai_confidence} />
                  <JiraCell visible={colMgmt.isColumnVisible('jira')} jiraKey={item.jira_key} jiraStatus={item.jira_status} config={config} />
                  {colMgmt.isColumnVisible('actions') && (
                    <Td dataLabel="Actions" className="app-cell-nowrap">
                      <Flex flexWrap={{ default: 'nowrap' }}>
                        <FlexItem><Button variant="link" isInline icon={<WrenchIcon />} onClick={() => onTriageSelected(allRpIds)}>Classify{occurrences > 1 ? ` (${occurrences})` : ''}</Button></FlexItem>
                        <FlexItem><Button variant="link" isInline icon={<BugIcon />} onClick={() => onCreateJira(item)}>Bug</Button></FlexItem>
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
