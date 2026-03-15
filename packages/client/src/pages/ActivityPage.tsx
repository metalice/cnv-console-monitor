import React, { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  PageSection,
  Content,
  Card,
  CardBody,
  CardTitle,
  Label,
  EmptyState,
  EmptyStateBody,
  Spinner,
  Pagination,
  Grid,
  GridItem,
  Flex,
  FlexItem,
  Tooltip,
  ExpandableSection,
} from '@patternfly/react-core';
import { Table, Thead, Tr, Tbody, Td } from '@patternfly/react-table';
import { CheckCircleIcon, TimesCircleIcon } from '@patternfly/react-icons';
import type { ApproverStat } from '@cnv-monitor/shared';
import { apiFetch } from '../api/client';
import { fetchActivity } from '../api/activity';
import { fetchAckStats } from '../api/acknowledgment';
import { SortByDirection } from '@patternfly/react-table';
import { useTableSort } from '../hooks/useTableSort';
import { usePreferences } from '../context/PreferencesContext';
import { ComponentMultiSelect } from '../components/common/ComponentMultiSelect';
import { ThWithHelp } from '../components/common/ThWithHelp';

const PAGE_SIZE = 25;

const actionLabel = (action: string): React.ReactNode => {
  switch (action) {
    case 'classify_defect': return <Label color="purple" isCompact>Classified</Label>;
    case 'bulk_classify_defect': return <Label color="purple" isCompact>Bulk Classified</Label>;
    case 'add_comment': return <Label color="blue" isCompact>Comment</Label>;
    case 'create_jira': return <Label color="red" isCompact>Jira Created</Label>;
    case 'link_jira': return <Label color="orange" isCompact>Jira Linked</Label>;
    case 'acknowledge': return <Label color="green" isCompact>Acknowledged</Label>;
    default: return <Label isCompact>{action}</Label>;
  }
};

const REVIEWER_ACCESSORS: Record<number, (a: ApproverStat) => string | number | null> = {
  0: (a) => a.reviewer,
  1: (a) => a.totalReviews,
  2: (a) => a.lastReviewDate,
};

export const ActivityPage: React.FC = () => {
  const [page, setPage] = useState(1);
  const { preferences, loaded: prefsLoaded, setPreference } = usePreferences();
  const [selectedComponents, setSelectedComponentsState] = useState<Set<string>>(new Set());
  const [expandedId, setExpandedId] = useState<number | null>(null);

  useEffect(() => { document.title = 'Activity | CNV Console Monitor'; }, []);

  useEffect(() => {
    if (prefsLoaded && preferences.dashboardComponents?.length) {
      setSelectedComponentsState(new Set(preferences.dashboardComponents));
    }
  }, [prefsLoaded, preferences.dashboardComponents]);

  const setSelectedComponents = (val: Set<string>) => { setSelectedComponentsState(val); setPreference('dashboardComponents', [...val]); };
  const comp = selectedComponents.size === 1 ? [...selectedComponents][0] : undefined;

  const { data: availableComponents } = useQuery({
    queryKey: ['availableComponents'],
    queryFn: () => apiFetch<string[]>('/launches/components'),
    staleTime: 5 * 60 * 1000,
  });

  const { data: entries, isLoading } = useQuery({
    queryKey: ['activity', page, comp],
    queryFn: () => fetchActivity(PAGE_SIZE, (page - 1) * PAGE_SIZE, comp),
  });

  const { data: ackStats } = useQuery({
    queryKey: ['ackStats'],
    queryFn: () => fetchAckStats(30),
  });

  const { sorted: sortedApprovers, getSortParams: getApproverSortParams } = useTableSort(
    ackStats?.approvers ?? [],
    REVIEWER_ACCESSORS,
    { index: 1, direction: SortByDirection.desc },
  );

  return (
    <>
      <PageSection>
        <Flex justifyContent={{ default: 'justifyContentSpaceBetween' }} alignItems={{ default: 'alignItemsCenter' }}>
          <FlexItem>
            <Content component="h1">Activity Feed</Content>
            <Content component="small">Recent triage, Jira, and acknowledgment actions</Content>
          </FlexItem>
          <FlexItem>
            {(availableComponents?.length ?? 0) > 0 && (
              <ComponentMultiSelect
                id="activity-component"
                selected={selectedComponents}
                options={availableComponents ?? []}
                onChange={setSelectedComponents}
              />
            )}
          </FlexItem>
        </Flex>
      </PageSection>

      <PageSection>
        <Grid hasGutter>
          {ackStats && (
            <>
              <GridItem span={12} md={6}>
                <Card>
                  <CardTitle>Reviewer Stats (last 30 days)</CardTitle>
                  <CardBody>
                    {sortedApprovers.length === 0 ? (
                      <EmptyState>
                        <EmptyStateBody>No acknowledgments recorded yet.</EmptyStateBody>
                      </EmptyState>
                    ) : (
                      <div className="app-table-scroll">
                      <Table aria-label="Approver stats" variant="compact">
                        <Thead>
                          <Tr>
                            <ThWithHelp label="Reviewer" help="Name of the person who acknowledged daily test results." sort={getApproverSortParams(0)} />
                            <ThWithHelp label="Reviews" help="Total number of daily acknowledgments." sort={getApproverSortParams(1)} />
                            <ThWithHelp label="Last Review" help="Date of the most recent acknowledgment." sort={getApproverSortParams(2)} />
                          </Tr>
                        </Thead>
                        <Tbody>
                          {sortedApprovers.map((a) => (
                            <Tr key={a.reviewer}>
                              <Td dataLabel="Reviewer"><strong>{a.reviewer}</strong></Td>
                              <Td dataLabel="Reviews">{a.totalReviews}</Td>
                              <Td dataLabel="Last Review">{a.lastReviewDate}</Td>
                            </Tr>
                          ))}
                        </Tbody>
                      </Table>
                      </div>
                    )}
                  </CardBody>
                </Card>
              </GridItem>

              <GridItem span={12} md={6}>
                <Card>
                  <CardTitle>Daily Review History (last 30 days)</CardTitle>
                  <CardBody style={{ maxHeight: 300, overflow: 'auto' }}>
                    {ackStats.history.length === 0 ? (
                      <EmptyState>
                        <EmptyStateBody>No history yet.</EmptyStateBody>
                      </EmptyState>
                    ) : (
                      <div>
                        {ackStats.history.map((h) => (
                          <Flex key={h.date} alignItems={{ default: 'alignItemsCenter' }} style={{ padding: '4px 0', borderBottom: '1px solid var(--pf-t--global--border--color--default)' }}>
                            <FlexItem style={{ width: 100 }}>
                              <Content component="small">{h.date}</Content>
                            </FlexItem>
                            <FlexItem>
                              {h.acknowledged ? (
                                <Flex alignItems={{ default: 'alignItemsCenter' }} spaceItems={{ default: 'spaceItemsSm' }}>
                                  <FlexItem><CheckCircleIcon color="var(--pf-t--global--color--status--success--default)" /></FlexItem>
                                  <FlexItem>{h.reviewers.join(', ')}</FlexItem>
                                </Flex>
                              ) : (
                                <Flex alignItems={{ default: 'alignItemsCenter' }} spaceItems={{ default: 'spaceItemsSm' }}>
                                  <FlexItem><TimesCircleIcon color="var(--pf-t--global--color--status--danger--default)" /></FlexItem>
                                  <FlexItem><Content component="small">Not reviewed</Content></FlexItem>
                                </Flex>
                              )}
                            </FlexItem>
                          </Flex>
                        ))}
                      </div>
                    )}
                  </CardBody>
                </Card>
              </GridItem>
            </>
          )}

          <GridItem span={12}>
            <Card>
              <CardTitle>Activity</CardTitle>
              <CardBody>
                {isLoading ? (
                  <Spinner aria-label="Loading activity" />
                ) : !entries?.length ? (
                  <EmptyState>
                    <EmptyStateBody>No activity recorded yet.</EmptyStateBody>
                  </EmptyState>
                ) : (
                  <>
                    <div className="app-table-scroll">
                    <Table aria-label="Activity feed" variant="compact" isStickyHeader>
                      <Thead>
                        <Tr>
                          <ThWithHelp label="Time" help="When the action was performed." />
                          <ThWithHelp label="Action" help="Type of action performed." />
                          <ThWithHelp label="Component" help="Component this action relates to." />
                          <ThWithHelp label="Test / Target" help="Test item or acknowledgment target." />
                          <ThWithHelp label="Details" help="Additional context." />
                          <ThWithHelp label="By" help="The user who performed this action." />
                        </Tr>
                      </Thead>
                      <Tbody>
                        {entries.map((entry) => {
                          const isAck = entry.action === 'acknowledge';
                          const shortName = isAck ? '--' : (entry.test_name?.split('.').pop() || entry.test_name || '--');
                          const hasNotes = isAck && entry.notes;
                          const isExpanded = expandedId === entry.id;

                          return (
                            <React.Fragment key={entry.id}>
                              <Tr
                                isClickable={!!hasNotes}
                                onRowClick={hasNotes ? () => setExpandedId(isExpanded ? null : entry.id) : undefined}
                              >
                                <Td dataLabel="Time">{new Date(entry.performed_at).toLocaleString()}</Td>
                                <Td dataLabel="Action">{actionLabel(entry.action)}</Td>
                                <Td dataLabel="Component">{entry.component ? <Label color="grey" isCompact>{entry.component}</Label> : '--'}</Td>
                                <Td dataLabel="Test / Target">
                                  {isAck ? (
                                    <span>{entry.component || 'Report'} acknowledged</span>
                                  ) : (
                                    <Tooltip content={entry.test_name || shortName}><span>{shortName}</span></Tooltip>
                                  )}
                                </Td>
                                <Td dataLabel="Details">
                                  {isAck ? (
                                    hasNotes ? <Label color="blue" isCompact>View notes</Label> : '--'
                                  ) : (
                                    <Tooltip content={entry.old_value && entry.new_value ? `${entry.old_value} \u2192 ${entry.new_value}` : entry.new_value || '--'}>
                                      <span>
                                        {entry.old_value && entry.new_value
                                          ? `${entry.old_value} \u2192 ${entry.new_value}`
                                          : entry.new_value || '--'}
                                      </span>
                                    </Tooltip>
                                  )}
                                </Td>
                                <Td dataLabel="By">{entry.performed_by || '--'}</Td>
                              </Tr>
                              {isExpanded && hasNotes && (
                                <Tr>
                                  <Td colSpan={6} style={{ background: 'var(--pf-t--global--background--color--secondary--default)', padding: 'var(--pf-t--global--spacer--md)' }}>
                                    <Content component="small" className="app-text-muted app-mb-sm">Acknowledgment notes by {entry.performed_by}:</Content>
                                    <pre style={{ whiteSpace: 'pre-wrap', fontSize: 'var(--pf-t--global--font--size--sm)', fontFamily: 'var(--pf-t--global--font--family--mono)', margin: 0 }}>
                                      {entry.notes}
                                    </pre>
                                  </Td>
                                </Tr>
                              )}
                            </React.Fragment>
                          );
                        })}
                      </Tbody>
                    </Table>
                    </div>
                    <Pagination
                      itemCount={(page - 1) * PAGE_SIZE + (entries?.length ?? 0)}
                      perPage={PAGE_SIZE}
                      page={page}
                      onSetPage={(_e, p) => setPage(p)}
                      isCompact
                      className="app-mt-md"
                    />
                  </>
                )}
              </CardBody>
            </Card>
          </GridItem>
        </Grid>
      </PageSection>
    </>
  );
};
