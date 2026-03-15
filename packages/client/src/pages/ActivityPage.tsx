import React, { useEffect, useState } from 'react';
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
} from '@patternfly/react-core';
import { Table, Thead, Tr, Tbody, Td } from '@patternfly/react-table';
import { CheckCircleIcon, TimesCircleIcon } from '@patternfly/react-icons';
import type { ApproverStat } from '@cnv-monitor/shared';
import { fetchActivity } from '../api/activity';
import { fetchAckStats } from '../api/acknowledgment';
import { SortByDirection } from '@patternfly/react-table';
import { useTableSort } from '../hooks/useTableSort';
import { ThWithHelp } from '../components/common/ThWithHelp';

const PAGE_SIZE = 25;

const actionLabel = (action: string): React.ReactNode => {
  switch (action) {
    case 'classify_defect': return <Label color="purple" isCompact>Classified</Label>;
    case 'bulk_classify_defect': return <Label color="purple" isCompact>Bulk Classified</Label>;
    case 'add_comment': return <Label color="blue" isCompact>Comment</Label>;
    case 'create_jira': return <Label color="red" isCompact>Jira Created</Label>;
    case 'link_jira': return <Label color="orange" isCompact>Jira Linked</Label>;
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

  useEffect(() => { document.title = 'Activity | CNV Console Monitor'; }, []);

  const { data: entries, isLoading } = useQuery({
    queryKey: ['activity', page],
    queryFn: () => fetchActivity(PAGE_SIZE, (page - 1) * PAGE_SIZE),
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
        <Content component="h1">Activity Feed</Content>
        <Content component="small">Recent triage, Jira, and acknowledgment actions</Content>
      </PageSection>

      <PageSection>
        <Grid hasGutter>
          {ackStats && (
            <>
              <GridItem span={6}>
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
                            <ThWithHelp label="Reviewer" help="Name of the person who acknowledged (signed off) daily test results." sort={getApproverSortParams(0)} />
                            <ThWithHelp label="Reviews" help="Total number of daily acknowledgments submitted by this reviewer." sort={getApproverSortParams(1)} />
                            <ThWithHelp label="Last Review" help="Date of the most recent acknowledgment by this reviewer." sort={getApproverSortParams(2)} />
                          </Tr>
                        </Thead>
                        <Tbody>
                          {sortedApprovers.map((a) => (
                            <Tr key={a.reviewer}>
                              <Td dataLabel="Reviewer" className="app-cell-nowrap"><strong>{a.reviewer}</strong></Td>
                              <Td dataLabel="Reviews">{a.totalReviews}</Td>
                              <Td dataLabel="Last Review" className="app-cell-nowrap">{a.lastReviewDate}</Td>
                            </Tr>
                          ))}
                        </Tbody>
                      </Table>
                      </div>
                    )}
                  </CardBody>
                </Card>
              </GridItem>

              <GridItem span={6}>
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
              <CardTitle>Triage Activity</CardTitle>
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
                          <ThWithHelp label="Time" help="When the action was performed. Shows relative time (e.g. '5 minutes ago')." />
                          <ThWithHelp label="Action" help="Type of action: Classified (defect type set), Jira Created, Jira Linked, Acknowledged." />
                          <ThWithHelp label="Test" help="Short name of the test item this action was performed on." />
                          <ThWithHelp label="Details" help="Additional context: defect type assigned, Jira key created/linked, or acknowledgment note." />
                          <ThWithHelp label="By" help="The user who performed this action." />
                        </Tr>
                      </Thead>
                      <Tbody>
                        {entries.map((entry) => {
                          const shortName = entry.test_name?.split('.').pop() || entry.test_name || '--';
                          return (
                            <Tr key={entry.id}>
                              <Td dataLabel="Time" className="app-cell-nowrap">{new Date(entry.performed_at).toLocaleString()}</Td>
                              <Td dataLabel="Action" className="app-cell-nowrap">{actionLabel(entry.action)}</Td>
                              <Td dataLabel="Test" className="app-cell-truncate">
                                <Tooltip content={entry.test_name || shortName}><span>{shortName}</span></Tooltip>
                              </Td>
                              <Td dataLabel="Details" className="app-cell-truncate">
                                <Tooltip content={entry.old_value && entry.new_value ? `${entry.old_value} \u2192 ${entry.new_value}` : entry.new_value || '--'}>
                                  <span>
                                    {entry.old_value && entry.new_value
                                      ? `${entry.old_value} \u2192 ${entry.new_value}`
                                      : entry.new_value || '--'}
                                  </span>
                                </Tooltip>
                              </Td>
                              <Td dataLabel="By" className="app-cell-nowrap">{entry.performed_by || '--'}</Td>
                            </Tr>
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
                      style={{ marginTop: 16 }}
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
