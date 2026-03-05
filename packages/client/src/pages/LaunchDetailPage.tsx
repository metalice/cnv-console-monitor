import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  PageSection,
  Content,
  Card,
  CardBody,
  Button,
  Breadcrumb,
  BreadcrumbItem,
  ExpandableSection,
  Flex,
  FlexItem,
  Label,
  Spinner,
  Toolbar,
  ToolbarContent,
  ToolbarItem,
  Tooltip,
} from '@patternfly/react-core';
import { Table, Thead, Tr, Th, Tbody, Td } from '@patternfly/react-table';
import { SearchIcon, WrenchIcon, BugIcon, LinkIcon, ExternalLinkAltIcon } from '@patternfly/react-icons';
import type { TestItem, PublicConfig } from '@cnv-monitor/shared';
import { apiFetch } from '../api/client';
import { fetchTestItems, fetchTestItemsForLaunches } from '../api/testItems';
import { triggerAutoAnalysis, triggerPatternAnalysis, triggerUniqueErrorAnalysis } from '../api/analysis';
import { useTableSort } from '../hooks/useTableSort';
import { StatusBadge } from '../components/common/StatusBadge';
import { ThWithHelp } from '../components/common/ThWithHelp';
import { LogViewer } from '../components/detail/LogViewer';
import { SimilarFailuresPanel } from '../components/detail/SimilarFailuresPanel';
import { TriageModal } from '../components/modals/TriageModal';
import { JiraCreateModal } from '../components/modals/JiraCreateModal';
import { JiraLinkModal } from '../components/modals/JiraLinkModal';

type AggregatedItem = {
  representative: TestItem;
  allRpIds: number[];
  occurrences: number;
};

function aggregateItems(items: TestItem[]): AggregatedItem[] {
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

  const result: AggregatedItem[] = [];

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

const SINGLE_ACCESSORS: Record<number, (a: AggregatedItem) => string | number | null | undefined> = {
  1: (a) => a.representative.name.split('.').pop() || a.representative.name,
  2: (a) => a.representative.status,
  3: (a) => a.representative.error_message,
  4: (a) => a.representative.polarion_id,
  5: (a) => a.representative.ai_prediction,
  6: (a) => a.representative.jira_key,
};

const GROUP_ACCESSORS: Record<number, (a: AggregatedItem) => string | number | null | undefined> = {
  1: (a) => a.representative.name.split('.').pop() || a.representative.name,
  2: (a) => a.occurrences,
  3: (a) => a.representative.status,
  4: (a) => a.representative.error_message,
  5: (a) => a.representative.polarion_id,
  6: (a) => a.representative.ai_prediction,
  7: (a) => a.representative.jira_key,
};

export const LaunchDetailPage: React.FC = () => {
  const { launchId } = useParams<{ launchId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const id = parseInt(launchId || '0');
  const launchIdsParam = searchParams.get('launches');
  const groupVersion = searchParams.get('version');
  const groupTier = searchParams.get('tier');

  const launchIds = useMemo(() => {
    if (!launchIdsParam) return [id];
    return launchIdsParam.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n));
  }, [launchIdsParam, id]);

  const isGroupMode = launchIds.length > 1;

  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());
  const [triageItem, setTriageItem] = useState<number[] | null>(null);
  const [jiraCreateItem, setJiraCreateItem] = useState<TestItem | null>(null);
  const [jiraLinkItem, setJiraLinkItem] = useState<number | null>(null);

  const title = isGroupMode
    ? `${groupVersion ?? 'Unknown'} ${groupTier ?? ''} — ${launchIds.length} launches`
    : `Launch #${id}`;

  useEffect(() => { document.title = `${title} | CNV Console Monitor`; }, [title]);

  const { data: config } = useQuery({
    queryKey: ['config'],
    queryFn: () => apiFetch<PublicConfig>('/config'),
    staleTime: Infinity,
  });

  const { data: items, isLoading } = useQuery({
    queryKey: isGroupMode ? ['testItems', 'group', ...launchIds] : ['testItems', id],
    queryFn: () => isGroupMode ? fetchTestItemsForLaunches(launchIds) : fetchTestItems(id),
    enabled: launchIds.length > 0,
  });

  const autoAnalysis = useMutation({ mutationFn: () => triggerAutoAnalysis(id) });
  const patternAnalysis = useMutation({ mutationFn: () => triggerPatternAnalysis(id) });
  const uniqueAnalysis = useMutation({ mutationFn: () => triggerUniqueErrorAnalysis(id) });

  const toggleExpand = (itemId: number) => {
    setExpandedItems((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  };

  const failedItems = useMemo(() => items?.filter((i) => i.status === 'FAILED') ?? [], [items]);
  const passedItems = useMemo(() => items?.filter((i) => i.status === 'PASSED') ?? [], [items]);
  const skippedItems = useMemo(() => items?.filter((i) => i.status === 'SKIPPED') ?? [], [items]);

  const displayItems = useMemo(() => {
    if (isGroupMode) return aggregateItems(failedItems);
    return failedItems.map(item => ({ representative: item, allRpIds: [item.rp_id], occurrences: 1 }));
  }, [isGroupMode, failedItems]);

  const accessors = isGroupMode ? GROUP_ACCESSORS : SINGLE_ACCESSORS;
  const { sorted, getSortParams } = useTableSort(displayItems, accessors, { index: 1, direction: 'asc' });

  return (
    <>
      <PageSection>
        <Breadcrumb style={{ marginBottom: 16 }}>
          <BreadcrumbItem onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>Dashboard</BreadcrumbItem>
          <BreadcrumbItem isActive>{title}</BreadcrumbItem>
        </Breadcrumb>
        <Flex justifyContent={{ default: 'justifyContentSpaceBetween' }} alignItems={{ default: 'alignItemsCenter' }}>
          <FlexItem>
            <Content component="h1">
              {title}
              {!isGroupMode && config && (
                <a href={`${config.rpLaunchBaseUrl}/${id}`} target="_blank" rel="noreferrer" style={{ marginLeft: 12, fontSize: 14 }}>
                  <ExternalLinkAltIcon /> ReportPortal
                </a>
              )}
            </Content>
            <Content component="small">
              {items
                ? isGroupMode
                  ? `${failedItems.length} total failures across ${launchIds.length} launches (${displayItems.length} unique tests)`
                  : `${passedItems.length} passed / ${failedItems.length} failed / ${skippedItems.length} skipped`
                : 'Loading...'}
            </Content>
          </FlexItem>
          {!isGroupMode && (
            <FlexItem>
              <Toolbar>
                <ToolbarContent>
                  <ToolbarItem>
                    <Button variant="secondary" icon={<SearchIcon />} onClick={() => autoAnalysis.mutate()} isLoading={autoAnalysis.isPending}>Auto-Analysis</Button>
                  </ToolbarItem>
                  <ToolbarItem>
                    <Button variant="secondary" icon={<WrenchIcon />} onClick={() => patternAnalysis.mutate()} isLoading={patternAnalysis.isPending}>Pattern Analysis</Button>
                  </ToolbarItem>
                  <ToolbarItem>
                    <Button variant="secondary" onClick={() => uniqueAnalysis.mutate()} isLoading={uniqueAnalysis.isPending}>Unique Error</Button>
                  </ToolbarItem>
                </ToolbarContent>
              </Toolbar>
            </FlexItem>
          )}
        </Flex>
      </PageSection>

      <PageSection>
        {isLoading ? (
          <Spinner aria-label="Loading test items" />
        ) : (
          <Card>
            <CardBody>
              <Table aria-label="Test items table">
                <Thead>
                  <Tr>
                    <Th />
                    <ThWithHelp label="Test Name" help="Short name of the test case (last segment of the full qualified name)." sort={getSortParams(1)} />
                    {isGroupMode && (
                      <ThWithHelp label="Occurrences" help="Number of times this test failed across the launches in this group." sort={getSortParams(2)} />
                    )}
                    <ThWithHelp label="Status" help="Test result: FAILED, PASSED, or SKIPPED." sort={getSortParams(isGroupMode ? 3 : 2)} />
                    <ThWithHelp label="Error" help="First line of the error log from ReportPortal (truncated). Expand row for full logs." />
                    <ThWithHelp label="Polarion" help="Polarion test case ID linking this test to the test management system." sort={getSortParams(isGroupMode ? 5 : 4)} />
                    <ThWithHelp label="AI Prediction" help="ReportPortal AI prediction of defect type (Product Bug, Automation Bug, System Issue) with confidence %." sort={getSortParams(isGroupMode ? 6 : 5)} />
                    <ThWithHelp label="Jira" help="Linked Jira issue key and its current status. Click 'Bug' to create or 'Link' to associate." sort={getSortParams(isGroupMode ? 7 : 6)} />
                    <ThWithHelp label="Actions" help="Classify: set defect type. Bug: create Jira issue. Link: associate existing Jira." />
                  </Tr>
                </Thead>
                <Tbody>
                  {sorted.map(({ representative: item, allRpIds, occurrences }) => {
                    const isExpanded = expandedItems.has(item.rp_id);
                    const shortName = item.name.split('.').pop() || item.name;
                    const shortError = item.error_message
                      ? item.error_message.substring(0, 80) + (item.error_message.length > 80 ? '...' : '')
                      : null;
                    return (
                      <React.Fragment key={item.unique_id ?? item.rp_id}>
                        <Tr>
                          <Td
                            expand={{ isExpanded, onToggle: () => toggleExpand(item.rp_id), rowIndex: item.rp_id }}
                          />
                          <Td dataLabel="Test Name">{shortName}</Td>
                          {isGroupMode && (
                            <Td dataLabel="Occurrences">
                              {occurrences > 1 ? (
                                <Tooltip content={`Failed in ${occurrences} of ${launchIds.length} launches`}>
                                  <Label color="orange" isCompact>{occurrences}x</Label>
                                </Tooltip>
                              ) : null}
                            </Td>
                          )}
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
                              <Label
                                isCompact
                                color={item.ai_prediction.includes('Product') ? 'red' : item.ai_prediction.includes('System') ? 'orange' : 'grey'}
                              >
                                {item.ai_prediction.replace('Predicted ', '')} {item.ai_confidence}%
                              </Label>
                            )}
                          </Td>
                          <Td dataLabel="Jira">
                            {item.jira_key && <Label color="blue" isCompact>{item.jira_key} ({item.jira_status})</Label>}
                          </Td>
                          <Td dataLabel="Actions">
                            <Flex>
                              <FlexItem>
                                <Button variant="link" isInline icon={<WrenchIcon />} onClick={() => setTriageItem(allRpIds)}>
                                  Classify{occurrences > 1 ? ` (${occurrences})` : ''}
                                </Button>
                              </FlexItem>
                              <FlexItem>
                                <Button variant="link" isInline icon={<BugIcon />} onClick={() => setJiraCreateItem(item)}>Bug</Button>
                              </FlexItem>
                              <FlexItem>
                                <Button variant="link" isInline icon={<LinkIcon />} onClick={() => setJiraLinkItem(item.rp_id)}>Link</Button>
                              </FlexItem>
                            </Flex>
                          </Td>
                        </Tr>
                        {isExpanded && (
                          <Tr isExpanded>
                            <Td colSpan={isGroupMode ? 10 : 9} noPadding={false}>
                              <ExpandableSection toggleText="Error Logs" isIndented>
                                <LogViewer itemId={item.rp_id} />
                              </ExpandableSection>
                              {item.unique_id && (
                                <ExpandableSection toggleText="Similar Failures History" isIndented>
                                  <SimilarFailuresPanel uniqueId={item.unique_id} />
                                </ExpandableSection>
                              )}
                            </Td>
                          </Tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </Tbody>
              </Table>
            </CardBody>
          </Card>
        )}
      </PageSection>

      {triageItem && (
        <TriageModal isOpen onClose={() => setTriageItem(null)} itemIds={triageItem} />
      )}
      {jiraCreateItem && (
        <JiraCreateModal
          isOpen
          onClose={() => setJiraCreateItem(null)}
          testItemId={jiraCreateItem.rp_id}
          testName={jiraCreateItem.name}
          polarionId={jiraCreateItem.polarion_id}
        />
      )}
      {jiraLinkItem && (
        <JiraLinkModal isOpen onClose={() => setJiraLinkItem(null)} testItemId={jiraLinkItem} />
      )}
    </>
  );
};
