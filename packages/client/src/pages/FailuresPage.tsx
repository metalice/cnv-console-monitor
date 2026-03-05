import React, { useEffect, useMemo, useState } from 'react';
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
} from '@patternfly/react-core';
import { Table, Thead, Tr, Th, Tbody, Td } from '@patternfly/react-table';
import { CheckCircleIcon, WrenchIcon, BugIcon } from '@patternfly/react-icons';
import { fetchUntriagedForRange } from '../api/testItems';
import { fetchReportForRange } from '../api/launches';
import { useDate } from '../context/DateContext';
import { useTableSort } from '../hooks/useTableSort';
import { StatusBadge } from '../components/common/StatusBadge';
import { ThWithHelp } from '../components/common/ThWithHelp';
import { TriageModal } from '../components/modals/TriageModal';
import { JiraCreateModal } from '../components/modals/JiraCreateModal';
import type { TestItem } from '@cnv-monitor/shared';

type AggregatedFailure = {
  representative: TestItem;
  allRpIds: number[];
  occurrences: number;
};

function aggregateFailures(items: TestItem[]): AggregatedFailure[] {
  const groups = new Map<string, TestItem[]>();
  const noUniqueId: TestItem[] = [];

  for (const item of items) {
    if (item.unique_id) {
      const existing = groups.get(item.unique_id);
      if (existing) existing.push(item);
      else groups.set(item.unique_id, [item]);
    } else {
      noUniqueId.push(item);
    }
  }

  const result: AggregatedFailure[] = [];

  for (const groupItems of groups.values()) {
    const sorted = [...groupItems].sort((a, b) => (b.start_time ?? 0) - (a.start_time ?? 0));
    result.push({
      representative: sorted[0],
      allRpIds: sorted.map((i) => i.rp_id),
      occurrences: sorted.length,
    });
  }

  for (const item of noUniqueId) {
    result.push({ representative: item, allRpIds: [item.rp_id], occurrences: 1 });
  }

  return result;
}

const SORT_ACCESSORS: Record<number, (a: AggregatedFailure) => string | number | null | undefined> = {
  1: (a) => a.representative.name.split('.').pop() || a.representative.name,
  2: (a) => a.occurrences,
  3: (a) => a.representative.status,
  4: (a) => a.representative.error_message,
  5: (a) => a.representative.polarion_id,
  6: (a) => a.representative.ai_prediction,
};

export const FailuresPage: React.FC = () => {
  const { lookbackMode, since, until, isRangeMode } = useDate();
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [triageOpen, setTriageOpen] = useState(false);
  const [jiraCreateItem, setJiraCreateItem] = useState<TestItem | null>(null);

  useEffect(() => { document.title = 'Untriaged Failures | CNV Console Monitor'; }, []);

  const { data: items, isLoading } = useQuery({
    queryKey: ['untriaged', lookbackMode, since, until],
    queryFn: () => fetchUntriagedForRange(since, until),
  });

  const { data: report } = useQuery({
    queryKey: ['report', lookbackMode, since, until],
    queryFn: () => fetchReportForRange(since, until),
  });

  const aggregated = useMemo(() => aggregateFailures(items ?? []), [items]);

  const { sorted, getSortParams } = useTableSort(aggregated, SORT_ACCESSORS, { index: 2, direction: 'desc' });

  const newFailureIds = useMemo(() => {
    if (!report) return new Set<string>();
    return new Set(report.newFailures.map((f) => f.unique_id).filter(Boolean));
  }, [report]);

  const handleSelectAll = (checked: boolean) => {
    setSelectedIds(checked && items ? sorted.flatMap((g) => g.allRpIds) : []);
  };

  const handleSelect = (rpIds: number[], checked: boolean) => {
    setSelectedIds((prev) => {
      const idSet = new Set(prev);
      for (const id of rpIds) {
        if (checked) idSet.add(id);
        else idSet.delete(id);
      }
      return [...idSet];
    });
  };

  const isGroupSelected = (rpIds: number[]) => rpIds.every((id) => selectedIds.includes(id));
  const allSelected = sorted.length > 0 && sorted.every((g) => isGroupSelected(g.allRpIds));

  return (
    <>
      <PageSection>
        <Content component="h1">Untriaged Failures</Content>
        <Content component="small">Test items that need classification</Content>
      </PageSection>

      <PageSection>
        <Card>
          <CardBody>
            {selectedIds.length > 0 && (
              <Toolbar>
                <ToolbarContent>
                  <ToolbarItem>
                    <Content>{selectedIds.length} selected</Content>
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
                <Table aria-label="Untriaged failures">
                  <Thead>
                    <Tr>
                      <Th select={{ isSelected: allSelected, onSelect: (_e, checked) => handleSelectAll(checked) }} />
                      <ThWithHelp label="Test Name" help="Short name of the failed test case. Click to expand for full error logs." sort={getSortParams(1)} />
                      <ThWithHelp label="Occurrences" help="Number of times this test failed across all launches in the selected window. Only shown when > 1." sort={getSortParams(2)} />
                      <ThWithHelp label="Status" help="Test result: FAILED or SKIPPED (only untriaged items shown here)." sort={getSortParams(3)} />
                      <ThWithHelp label="Error" help="First line of the error log from the most recent failure. Expand row for full details." />
                      <ThWithHelp label="Polarion" help="Polarion test case ID linking this test to the test management system." sort={getSortParams(5)} />
                      <ThWithHelp label="AI Prediction" help="ReportPortal AI prediction of defect type (Product Bug, Automation Bug, System Issue) with confidence %." sort={getSortParams(6)} />
                      <ThWithHelp label="Actions" help="Classify: set defect type for all occurrences. Bug: create Jira issue. Use checkboxes for bulk actions." />
                    </Tr>
                  </Thead>
                  <Tbody>
                    {sorted.map(({ representative: item, allRpIds, occurrences }) => {
                      const shortName = item.name.split('.').pop() || item.name;
                      const isNew = item.unique_id ? newFailureIds.has(item.unique_id) : false;
                      const shortError = item.error_message
                        ? item.error_message.substring(0, 60) + (item.error_message.length > 60 ? '...' : '')
                        : null;
                      return (
                        <Tr key={item.unique_id ?? item.rp_id}>
                          <Td select={{ isSelected: isGroupSelected(allRpIds), onSelect: (_e, checked) => handleSelect(allRpIds, checked), rowIndex: item.rp_id }} />
                          <Td dataLabel="Test Name">
                            {shortName}
                            {isNew && <Label color="teal" isCompact style={{ marginLeft: 8 }}>New</Label>}
                          </Td>
                          <Td dataLabel="Occurrences">
                            {occurrences > 1 ? (
                              <Tooltip content={`Failed in ${occurrences} launches. Classifying will apply to all ${occurrences} occurrences.`}>
                                <Label color="orange" isCompact>{occurrences}x</Label>
                              </Tooltip>
                            ) : null}
                          </Td>
                          <Td dataLabel="Status"><StatusBadge status={item.status} /></Td>
                          <Td dataLabel="Error">
                            {shortError && (
                              <span style={{ fontSize: 12, color: 'var(--pf-t--global--color--nonstatus--gray--text--on-gray--default)' }}>
                                {shortError}
                              </span>
                            )}
                          </Td>
                          <Td dataLabel="Polarion">
                            {item.polarion_id && <Label color="blue" isCompact>{item.polarion_id}</Label>}
                          </Td>
                          <Td dataLabel="AI">
                            {item.ai_prediction && (
                              <Label isCompact color={item.ai_prediction.includes('Product') ? 'red' : 'orange'}>
                                {item.ai_prediction.replace('Predicted ', '')} {item.ai_confidence}%
                              </Label>
                            )}
                          </Td>
                          <Td dataLabel="Actions">
                            <Flex>
                              <FlexItem>
                                <Button variant="link" isInline icon={<WrenchIcon />} onClick={() => { setSelectedIds(allRpIds); setTriageOpen(true); }}>
                                  Classify{occurrences > 1 ? ` (${occurrences})` : ''}
                                </Button>
                              </FlexItem>
                              <FlexItem>
                                <Button variant="link" isInline icon={<BugIcon />} onClick={() => setJiraCreateItem(item)}>Bug</Button>
                              </FlexItem>
                            </Flex>
                          </Td>
                        </Tr>
                      );
                    })}
                  </Tbody>
                </Table>
              </>
            )}
          </CardBody>
        </Card>
      </PageSection>

      <TriageModal isOpen={triageOpen} onClose={() => { setTriageOpen(false); setSelectedIds([]); }} itemIds={selectedIds} />
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
