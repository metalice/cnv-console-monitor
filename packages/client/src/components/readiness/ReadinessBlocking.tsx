import React from 'react';
import { useNavigate } from 'react-router-dom';

import {
  Button,
  Card,
  CardBody,
  Content,
  EmptyState,
  EmptyStateBody,
  Flex,
  FlexItem,
  Label,
  Tooltip,
} from '@patternfly/react-core';
import { CheckCircleIcon, EqualsIcon, TrendDownIcon, TrendUpIcon } from '@patternfly/react-icons';
import { Table, Tbody, Td, Th, Thead, Tr } from '@patternfly/react-table';

import type { BlockingFailure } from '../../api/readiness';

const TREND_ICONS: Record<BlockingFailure['recent_trend'], React.ReactNode> = {
  improving: <TrendDownIcon color="var(--pf-t--global--color--status--success--default)" />,
  stable: <EqualsIcon color="var(--pf-t--global--color--status--info--default)" />,
  worsening: <TrendUpIcon color="var(--pf-t--global--color--status--danger--default)" />,
};

export const ReadinessBlocking: React.FC<{ failures: BlockingFailure[] }> = ({ failures }) => {
  const navigate = useNavigate();

  return (
    <Card>
      <CardBody>
        <Content className="app-section-heading" component="h3">
          Blocking Failures
        </Content>
        {failures.length === 0 ? (
          <EmptyState headingLevel="h4" icon={CheckCircleIcon} titleText="No blocking failures">
            <EmptyStateBody>All tests are passing for this version.</EmptyStateBody>
          </EmptyState>
        ) : (
          <Table isStickyHeader aria-label="Blocking failures" variant="compact">
            <Thead>
              <Tr>
                <Th>Test Name</Th>
                <Th>Fail Count</Th>
                <Th>Total Runs</Th>
                <Th>Failure Rate</Th>
                <Th>Trend</Th>
              </Tr>
            </Thead>
            <Tbody>
              {failures.map(failure => {
                const shortName = failure.name.split('.').pop() || failure.name;
                return (
                  <Tr key={failure.unique_id}>
                    <Td className="app-cell-truncate" dataLabel="Test Name">
                      <Tooltip content={failure.name}>
                        <Button
                          isInline
                          size="sm"
                          variant="link"
                          onClick={() => navigate(`/test/${encodeURIComponent(failure.unique_id)}`)}
                        >
                          {shortName}
                        </Button>
                      </Tooltip>
                    </Td>
                    <Td className="app-cell-nowrap" dataLabel="Fail Count">
                      <strong>{failure.fail_count}</strong>
                    </Td>
                    <Td className="app-cell-nowrap" dataLabel="Total Runs">
                      {failure.total_runs}
                    </Td>
                    <Td className="app-cell-nowrap" dataLabel="Failure Rate">
                      <Label
                        color={
                          failure.failure_rate >= 50
                            ? 'red'
                            : failure.failure_rate >= 20
                              ? 'yellow'
                              : 'blue'
                        }
                      >
                        {failure.failure_rate}%
                      </Label>
                    </Td>
                    <Td className="app-cell-nowrap" dataLabel="Trend">
                      <Flex
                        alignItems={{ default: 'alignItemsCenter' }}
                        spaceItems={{ default: 'spaceItemsXs' }}
                      >
                        <FlexItem>{TREND_ICONS[failure.recent_trend]}</FlexItem>
                        <FlexItem>{failure.recent_trend}</FlexItem>
                      </Flex>
                    </Td>
                  </Tr>
                );
              })}
            </Tbody>
          </Table>
        )}
      </CardBody>
    </Card>
  );
};
