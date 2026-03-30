import { timeAgo } from '@cnv-monitor/shared';

import { Card, CardBody, CardTitle, GridItem, Tooltip } from '@patternfly/react-core';
import { Table, Tbody, Td, Thead, type ThProps, Tr } from '@patternfly/react-table';

import { ThWithHelp } from '../common/ThWithHelp';

import { type EnrichedApprover } from './reviewerUtils';
import { TrendSparkline } from './TrendSparkline';

type ReviewerStatsSectionProps = {
  getApproverSortParams: (columnIndex: number) => ThProps['sort'];
  sortedApprovers: EnrichedApprover[];
};

export const ReviewerStatsSection = ({
  getApproverSortParams,
  sortedApprovers,
}: ReviewerStatsSectionProps) => (
  <GridItem md={6} span={12}>
    <Card>
      <CardTitle>Reviewer Stats</CardTitle>
      <CardBody>
        <div className="app-table-scroll">
          <Table aria-label="Approver stats" variant="compact">
            <Thead>
              <Tr>
                <ThWithHelp
                  help="Person who acknowledged daily test results."
                  label="Reviewer"
                  sort={getApproverSortParams(0)}
                />
                <ThWithHelp
                  help="Total acknowledgments."
                  label="Reviews"
                  sort={getApproverSortParams(1)}
                />
                <ThWithHelp
                  help="Percentage of weekdays covered."
                  label="Coverage"
                  sort={getApproverSortParams(2)}
                />
                <ThWithHelp
                  help="Current consecutive days reviewing."
                  label="Streak"
                  sort={getApproverSortParams(3)}
                />
                <ThWithHelp help="Last 30 days. Filled = reviewed." label="Trend" />
                <ThWithHelp
                  help="Most recent acknowledgment."
                  label="Last"
                  sort={getApproverSortParams(4)}
                />
              </Tr>
            </Thead>
            <Tbody>
              {sortedApprovers.map(approver => (
                <Tr key={approver.reviewer}>
                  <Td dataLabel="Reviewer">
                    <strong>{approver.reviewer.split('@')[0]}</strong>
                  </Td>
                  <Td dataLabel="Reviews">{approver.totalReviews}</Td>
                  <Td dataLabel="Coverage">{approver.coverage}%</Td>
                  <Td dataLabel="Streak">
                    <Tooltip content={`Current: ${approver.current}d, Best: ${approver.longest}d`}>
                      <span>
                        {approver.current}d
                        {approver.longest > approver.current ? ` / ${approver.longest}d` : ''}
                      </span>
                    </Tooltip>
                  </Td>
                  <Td dataLabel="Trend">
                    <TrendSparkline dates={approver.reviewedDates} />
                  </Td>
                  <Td dataLabel="Last">
                    <Tooltip content={approver.lastReviewDate}>
                      <span>{timeAgo(new Date(approver.lastReviewDate).getTime())}</span>
                    </Tooltip>
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </div>
      </CardBody>
    </Card>
  </GridItem>
);
