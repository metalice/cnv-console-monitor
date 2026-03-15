import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  PageSection,
  Content,
  Card,
  CardBody,
  Button,
  Toolbar,
  ToolbarContent,
  ToolbarItem,
  Label,
  Flex,
  FlexItem,
  EmptyState,
  EmptyStateBody,
  Spinner,
  Tooltip,
  Truncate,
} from '@patternfly/react-core';
import { Table, Thead, Tr, Th, Tbody, Td } from '@patternfly/react-table';
import { CheckCircleIcon, WrenchIcon, BugIcon, DownloadIcon } from '@patternfly/react-icons';
import { fetchUntriagedForRange, fetchStreaks } from '../api/testItems';
import { fetchReportForRange } from '../api/launches';
import { apiFetch } from '../api/client';
import { useDate } from '../context/DateContext';
import { usePreferences } from '../context/PreferencesContext';
import { ComponentMultiSelect } from '../components/common/ComponentMultiSelect';
import { SortByDirection } from '@patternfly/react-table';
import { useTableSort } from '../hooks/useTableSort';
import { TableToolbar } from '../components/common/TableToolbar';
import { useColumnManagement, type ColumnDef } from '../hooks/useColumnManagement';
import { StatusBadge } from '../components/common/StatusBadge';
import { ThWithHelp } from '../components/common/ThWithHelp';
import { TriageModal } from '../components/modals/TriageModal';
import { JiraCreateModal } from '../components/modals/JiraCreateModal';
import type { TestItem, PublicConfig } from '@cnv-monitor/shared';

import { aggregateTestItems, type AggregatedItem } from '../utils/aggregation';
import { exportCsv } from '../utils/csvExport';

const FAILURES_COLUMNS: ColumnDef[] = [
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

const SORT_ACCESSORS: Record<number, (a: AggregatedItem) => string | number | null | undefined> = {
  1: (a) => a.representative.name.split('.').pop() || a.representative.name,
  2: (a) => a.occurrences,
  3: (a) => a.representative.status,
  4: (a) => a.representative.error_message,
  5: (a) => a.representative.polarion_id,
  6: (a) => a.representative.ai_prediction,
  7: (a) => a.representative.jira_key,
};

export const FailuresPage: React.FC = () => {
  const navigate = useNavigate();
  const { lookbackMode, since, until, isRangeMode } = useDate();
  const { preferences, loaded: prefsLoaded, setPreference } = usePreferences();
  const [selectedComponents, setSelectedComponentsState] = useState<Set<string>>(new Set());
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [tableSearch, setTableSearch] = useState('');
  const [triageOpen, setTriageOpen] = useState(false);
  const [jiraCreateItem, setJiraCreateItem] = useState<TestItem | null>(null);

  const prefsAppliedRef = useRef(false);
  useEffect(() => {
    if (prefsLoaded && !prefsAppliedRef.current) {
      prefsAppliedRef.current = true;
      if (preferences.dashboardComponents?.length) {
        setSelectedComponentsState(new Set(preferences.dashboardComponents));
      }
    }
  }, [prefsLoaded, preferences.dashboardComponents]);

  const setSelectedComponents = (val: Set<string>) => { setSelectedComponentsState(val); setPreference('dashboardComponents', [...val]); };
  const comp = selectedComponents.size === 1 ? [...selectedComponents][0] : undefined;

  useEffect(() => { document.title = 'Untriaged Failures | CNV Console Monitor'; }, []);

  const { data: config } = useQuery({
    queryKey: ['config'],
    queryFn: () => apiFetch<PublicConfig>('/config'),
    staleTime: Infinity,
  });

  const { data: availableComponents } = useQuery({
    queryKey: ['availableComponents'],
    queryFn: () => apiFetch<string[]>('/launches/components'),
    staleTime: 5 * 60 * 1000,
  });

  const { data: items, isLoading } = useQuery({
    queryKey: ['untriaged', lookbackMode, since, until, comp],
    queryFn: () => fetchUntriagedForRange(since, until, comp),
  });

  const { data: report } = useQuery({
    queryKey: ['report', lookbackMode, since, until],
    queryFn: () => fetchReportForRange(since, until),
  });

  const colMgmt = useColumnManagement('failures', FAILURES_COLUMNS);

  const aggregated = useMemo(() => aggregateTestItems(items ?? []), [items]);

  const uniqueIds = useMemo(
    () => aggregated.map(a => a.representative.unique_id).filter((id): id is string => !!id),
    [aggregated],
  );

  const { data: streaks } = useQuery({
    queryKey: ['streaks', uniqueIds],
    queryFn: () => fetchStreaks(uniqueIds),
    enabled: uniqueIds.length > 0,
    staleTime: 5 * 60 * 1000,
  });

  const { sorted, getSortParams } = useTableSort(aggregated, SORT_ACCESSORS, { index: 2, direction: SortByDirection.desc });

  const searchFiltered = useMemo(() => {
    if (!tableSearch.trim()) return sorted;
    const s = tableSearch.toLowerCase();
    return sorted.filter(({ representative: item }) =>
      item.name.toLowerCase().includes(s)
      || (item.error_message ?? '').toLowerCase().includes(s)
      || (item.polarion_id ?? '').toLowerCase().includes(s)
      || (item.jira_key ?? '').toLowerCase().includes(s)
    );
  }, [sorted, tableSearch]);

  const newFailureIds = useMemo(() => {
    if (!report) return new Set<string>();
    return new Set(report.newFailures.map((f) => f.unique_id).filter(Boolean));
  }, [report]);

  const handleSelectAll = (checked: boolean) => {
    setSelectedIds(checked && items ? new Set(searchFiltered.flatMap((g) => g.allRpIds)) : new Set());
  };

  const handleSelect = (rpIds: number[], checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const id of rpIds) {
        if (checked) next.add(id); else next.delete(id);
      }
      return next;
    });
  };

  const isGroupSelected = (rpIds: number[]) => rpIds.every((id) => selectedIds.has(id));
  const allSelected = searchFiltered.length > 0 && searchFiltered.every((g) => isGroupSelected(g.allRpIds));

  return (
    <>
      <PageSection>
        <Flex justifyContent={{ default: 'justifyContentSpaceBetween' }} alignItems={{ default: 'alignItemsCenter' }}>
          <FlexItem>
            <Content component="h1">Untriaged Failures</Content>
            <Content component="small">Test items that need classification</Content>
          </FlexItem>
          <FlexItem>
            <Flex alignItems={{ default: 'alignItemsCenter' }} spaceItems={{ default: 'spaceItemsSm' }}>
              {(availableComponents?.length ?? 0) > 0 && (
                <FlexItem>
                  <ComponentMultiSelect
                    id="failures-component"
                    selected={selectedComponents}
                    options={availableComponents ?? []}
                    onChange={setSelectedComponents}
                  />
                </FlexItem>
              )}
              <FlexItem>
                <Button variant="secondary" icon={<DownloadIcon />} isDisabled={!searchFiltered.length} onClick={() => {
                  exportCsv('untriaged-failures.csv',
                    ['Test Name', 'Occurrences', 'Status', 'Error', 'Polarion', 'AI Prediction', 'Jira'],
                    searchFiltered.map(({ representative: item, occurrences }) => [
                      item.name, occurrences, item.status,
                      item.error_message?.split('\n')[0] ?? '',
                      item.polarion_id ?? '', item.ai_prediction ?? '', item.jira_key ?? '',
                    ]),
                  );
                }}>Export</Button>
              </FlexItem>
            </Flex>
          </FlexItem>
        </Flex>
      </PageSection>

      <PageSection>
        <Card>
          <CardBody>
            <TableToolbar
              searchValue={tableSearch}
              onSearchChange={setTableSearch}
              searchPlaceholder="Search by name, error, Polarion or Jira..."
              resultCount={searchFiltered.length}
              totalCount={sorted.length}
              columns={FAILURES_COLUMNS}
              visibleIds={colMgmt.visibleIds}
              onSaveColumns={colMgmt.setColumns}
              onResetColumns={colMgmt.resetColumns}
            />
            {selectedIds.size > 0 && (
              <Toolbar>
                <ToolbarContent>
                  <ToolbarItem>
                    <Content>{selectedIds.size} selected</Content>
                  </ToolbarItem>
                  <ToolbarItem>
                    <Button variant="primary" icon={<WrenchIcon />} onClick={() => setTriageOpen(true)}>
                      Classify Selected
                    </Button>
                  </ToolbarItem>
                </ToolbarContent>
              </Toolbar>
            )}

            {isLoading ? (
              <Spinner aria-label="Loading failures" />
            ) : !sorted.length ? (
              <EmptyState icon={CheckCircleIcon} headingLevel="h4" titleText="All caught up!">
                <EmptyStateBody>No untriaged failures.</EmptyStateBody>
              </EmptyState>
            ) : (
              <>
                {!isRangeMode && items && items.length !== sorted.length && (
                  <Content component="small" style={{ marginBottom: 8, color: 'var(--pf-t--global--color--nonstatus--gray--text--on-gray--default)' }}>
                    {items.length} total failures grouped into {sorted.length} unique tests
                  </Content>
                )}
                <div className="app-table-scroll">
                <Table aria-label="Untriaged failures" variant="compact" isStickyHeader>
                  <colgroup>
                    <col style={{ width: '3%' }} />
                  </colgroup>
                  <Thead>
                    <Tr>
                      {colMgmt.isColumnVisible('select') && <Th select={{ isSelected: allSelected, onSelect: (_e, checked) => handleSelectAll(checked) }} />}
                      {colMgmt.isColumnVisible('testName') && <ThWithHelp label="Test Name" help="Short name of the failed test case. Click to expand for full error logs." sort={getSortParams(1)} />}
                      {colMgmt.isColumnVisible('occurrences') && <ThWithHelp label="Occurrences" help="Number of times this test failed across all launches in the selected window. Only shown when > 1." sort={getSortParams(2)} />}
                      {colMgmt.isColumnVisible('status') && <ThWithHelp label="Status" help="Test result: FAILED or SKIPPED (only untriaged items shown here)." sort={getSortParams(3)} />}
                      {colMgmt.isColumnVisible('error') && <ThWithHelp label="Error" help="First line of the error log from the most recent failure. Expand row for full details." />}
                      {colMgmt.isColumnVisible('polarion') && <ThWithHelp label="Polarion" help="Polarion test case ID. Click to open in Polarion." sort={getSortParams(5)} />}
                      {colMgmt.isColumnVisible('aiPrediction') && <ThWithHelp label="AI Prediction" help="ReportPortal AI prediction of defect type (Product Bug, Automation Bug, System Issue) with confidence %." sort={getSortParams(6)} />}
                      {colMgmt.isColumnVisible('jira') && <ThWithHelp label="Jira" help="Linked Jira issue key and status. Click to open in Jira." sort={getSortParams(7)} />}
                      {colMgmt.isColumnVisible('actions') && <ThWithHelp label="Actions" help="Classify: set defect type for all occurrences. Bug: create Jira issue. Use checkboxes for bulk actions." />}
                    </Tr>
                  </Thead>
                  <Tbody>
                    {searchFiltered.map(({ representative: item, allRpIds, occurrences }) => {
                      const shortName = item.name.split('.').pop() || item.name;
                      const isNew = item.unique_id ? newFailureIds.has(item.unique_id) : false;
                      return (
                        <Tr key={item.unique_id ?? item.rp_id}>
                          {colMgmt.isColumnVisible('select') && <Td select={{ isSelected: isGroupSelected(allRpIds), onSelect: (_e, checked) => handleSelect(allRpIds, checked), rowIndex: item.rp_id }} />}
                          {colMgmt.isColumnVisible('testName') && (
                            <Td dataLabel="Test Name" className="app-cell-truncate">
                              <Tooltip content={item.name}>
                                {item.unique_id ? (
                                  <Button variant="link" isInline size="sm" onClick={() => navigate(`/test/${encodeURIComponent(item.unique_id!)}`)}>
                                    {shortName}
                                  </Button>
                                ) : <span>{shortName}</span>}
                              </Tooltip>
                              {isNew && <Label color="teal" isCompact style={{ marginLeft: 4 }}>New</Label>}
                            </Td>
                          )}
                          {colMgmt.isColumnVisible('occurrences') && (
                            <Td dataLabel="Occurrences" className="app-cell-nowrap">
                              {occurrences > 1 ? (
                                <Tooltip content={`Failed in ${occurrences} launches. Classifying will apply to all ${occurrences} occurrences.`}>
                                  <Label color="orange" isCompact>{occurrences}x</Label>
                                </Tooltip>
                              ) : null}
                              {(() => {
                                const streak = item.unique_id ? streaks?.[item.unique_id] : undefined;
                                if (!streak || streak.consecutiveFailures === 0) return null;
                                return (
                                  <>
                                    {' '}
                                    <Tooltip content={`Failed in the last ${streak.consecutiveFailures} of ${streak.totalRuns} runs`}>
                                      <Label color="red" isCompact>{streak.consecutiveFailures}/{streak.totalRuns} failing</Label>
                                    </Tooltip>
                                    {streak.lastPassDate && (
                                      <span className="app-text-xs app-text-muted" style={{ marginLeft: 4 }}>
                                        Last pass: {new Date(streak.lastPassDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                      </span>
                                    )}
                                  </>
                                );
                              })()}
                            </Td>
                          )}
                          {colMgmt.isColumnVisible('status') && <Td dataLabel="Status" className="app-cell-nowrap"><StatusBadge status={item.status} /></Td>}
                          {colMgmt.isColumnVisible('error') && (
                            <Td dataLabel="Error" className="app-cell-truncate">
                              {item.error_message && (
                                <Tooltip content={<div style={{ maxHeight: 200, overflow: 'auto', whiteSpace: 'pre-wrap', fontFamily: 'var(--pf-t--global--font--family--mono)', fontSize: 'var(--pf-t--global--font--size--xs)' }}>{item.error_message}</div>}>
                                  <span className="app-text-xs app-text-muted">
                                    {item.error_message.split('\n')[0]}
                                  </span>
                                </Tooltip>
                              )}
                            </Td>
                          )}
                          {colMgmt.isColumnVisible('polarion') && (
                            <Td dataLabel="Polarion" className="app-cell-nowrap">
                              {item.polarion_id && (
                                <Label color="blue" isCompact>
                                  {config?.polarionUrl ? (
                                    <a href={`${config.polarionUrl}${item.polarion_id}`} target="_blank" rel="noreferrer">
                                      {item.polarion_id}
                                    </a>
                                  ) : item.polarion_id}
                                </Label>
                              )}
                            </Td>
                          )}
                          {colMgmt.isColumnVisible('aiPrediction') && (
                            <Td dataLabel="AI" className="app-cell-nowrap">
                              {item.ai_prediction && (
                                <Label isCompact color={item.ai_prediction.includes('Product') ? 'red' : 'orange'}>
                                  {item.ai_prediction.replace('Predicted ', '')} {item.ai_confidence}%
                                </Label>
                              )}
                            </Td>
                          )}
                          {colMgmt.isColumnVisible('jira') && (
                            <Td dataLabel="Jira" className="app-cell-nowrap">
                              {item.jira_key && (
                                <Label color="blue" isCompact>
                                  {config?.jiraUrl ? (
                                    <a href={`${config.jiraUrl}/browse/${item.jira_key}`} target="_blank" rel="noreferrer">
                                      {item.jira_key}
                                    </a>
                                  ) : item.jira_key}
                                  {' '}({item.jira_status})
                                </Label>
                              )}
                            </Td>
                          )}
                          {colMgmt.isColumnVisible('actions') && (
                            <Td dataLabel="Actions" className="app-cell-nowrap">
                              <Flex flexWrap={{ default: 'nowrap' }}>
                                <FlexItem>
                                  <Button variant="link" isInline icon={<WrenchIcon />} onClick={() => { setSelectedIds(new Set(allRpIds)); setTriageOpen(true); }}>
                                    Classify{occurrences > 1 ? ` (${occurrences})` : ''}
                                  </Button>
                                </FlexItem>
                                <FlexItem>
                                  <Button variant="link" isInline icon={<BugIcon />} onClick={() => setJiraCreateItem(item)}>Bug</Button>
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
            )}
          </CardBody>
        </Card>
      </PageSection>

      <TriageModal isOpen={triageOpen} onClose={() => { setTriageOpen(false); setSelectedIds(new Set()); }} itemIds={[...selectedIds]} />
      {jiraCreateItem && (
        <JiraCreateModal
          isOpen
          onClose={() => setJiraCreateItem(null)}
          testItemId={jiraCreateItem.rp_id}
          testName={jiraCreateItem.name}
          polarionId={jiraCreateItem.polarion_id}
        />
      )}
    </>
  );
};
