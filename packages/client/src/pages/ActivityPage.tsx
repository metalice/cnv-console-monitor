import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  PageSection, Content, Card, CardBody, CardTitle,
  EmptyState, EmptyStateBody, Flex, FlexItem, Grid, GridItem,
} from '@patternfly/react-core';
import { Table, Thead, Tr, Tbody, Td, SortByDirection } from '@patternfly/react-table';
import { CheckCircleIcon, TimesCircleIcon } from '@patternfly/react-icons';
import type { ApproverStat } from '@cnv-monitor/shared';
import { fetchActivity } from '../api/activity';
import { fetchAckStats } from '../api/acknowledgment';
import { useTableSort } from '../hooks/useTableSort';
import { useComponentFilter } from '../context/ComponentFilterContext';
import { ThWithHelp } from '../components/common/ThWithHelp';
import { ActivityTable } from '../components/activity/ActivityTable';

const PAGE_SIZE = 25;

const REVIEWER_ACCESSORS: Record<number, (a: ApproverStat) => string | number | null> = {
  0: (a) => a.reviewer,
  1: (a) => a.totalReviews,
  2: (a) => a.lastReviewDate,
};

export const ActivityPage: React.FC = () => {
  const [page, setPage] = useState(1);
  const { selectedComponent } = useComponentFilter();

  useEffect(() => { document.title = 'Activity | CNV Console Monitor'; }, []);

  const { data: entries, isLoading } = useQuery({
    queryKey: ['activity', page, selectedComponent],
    queryFn: () => fetchActivity(PAGE_SIZE, (page - 1) * PAGE_SIZE, selectedComponent),
  });

  const { data: ackStats } = useQuery({
    queryKey: ['ackStats'],
    queryFn: () => fetchAckStats(30),
  });

  const { sorted: sortedApprovers, getSortParams: getApproverSortParams } = useTableSort(
    ackStats?.approvers ?? [], REVIEWER_ACCESSORS, { index: 1, direction: SortByDirection.desc },
  );

  return (
    <>
      <PageSection>
        <Flex justifyContent={{ default: 'justifyContentSpaceBetween' }} alignItems={{ default: 'alignItemsCenter' }}>
          <FlexItem>
            <Content component="h1">Activity Feed</Content>
            <Content component="small">Recent triage, Jira, and acknowledgment actions</Content>
          </FlexItem>
          <FlexItem />
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
                      <EmptyState><EmptyStateBody>No acknowledgments recorded yet.</EmptyStateBody></EmptyState>
                    ) : (
                      <div className="app-table-scroll">
                      <Table aria-label="Approver stats" variant="compact">
                        <Thead><Tr>
                          <ThWithHelp label="Reviewer" help="Name of the person who acknowledged daily test results." sort={getApproverSortParams(0)} />
                          <ThWithHelp label="Reviews" help="Total number of daily acknowledgments." sort={getApproverSortParams(1)} />
                          <ThWithHelp label="Last Review" help="Date of the most recent acknowledgment." sort={getApproverSortParams(2)} />
                        </Tr></Thead>
                        <Tbody>{sortedApprovers.map((approver) => (
                          <Tr key={approver.reviewer}>
                            <Td dataLabel="Reviewer"><strong>{approver.reviewer}</strong></Td>
                            <Td dataLabel="Reviews">{approver.totalReviews}</Td>
                            <Td dataLabel="Last Review">{approver.lastReviewDate}</Td>
                          </Tr>
                        ))}</Tbody>
                      </Table>
                      </div>
                    )}
                  </CardBody>
                </Card>
              </GridItem>

              <GridItem span={12} md={6}>
                <Card>
                  <CardTitle>Daily Review History (last 30 days)</CardTitle>
                  <CardBody className="app-max-h-300">
                    {ackStats.history.length === 0 ? (
                      <EmptyState><EmptyStateBody>No history yet.</EmptyStateBody></EmptyState>
                    ) : (
                      <div>
                        {ackStats.history.map((entry) => (
                          <Flex key={entry.date} alignItems={{ default: 'alignItemsCenter' }} className="app-history-row">
                            <FlexItem className="app-date-col"><Content component="small">{entry.date}</Content></FlexItem>
                            <FlexItem>
                              <Flex alignItems={{ default: 'alignItemsCenter' }} spaceItems={{ default: 'spaceItemsSm' }}>
                                {entry.acknowledged ? (<>
                                  <FlexItem><CheckCircleIcon color="var(--pf-t--global--color--status--success--default)" /></FlexItem>
                                  <FlexItem>{entry.reviewers.join(', ')}</FlexItem>
                                </>) : (<>
                                  <FlexItem><TimesCircleIcon color="var(--pf-t--global--color--status--danger--default)" /></FlexItem>
                                  <FlexItem><Content component="small">Not reviewed</Content></FlexItem>
                                </>)}
                              </Flex>
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
            <ActivityTable entries={entries} isLoading={isLoading} page={page} pageSize={PAGE_SIZE} onPageChange={setPage} />
          </GridItem>
        </Grid>
      </PageSection>
    </>
  );
};
