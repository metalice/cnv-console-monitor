import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card, CardBody, Content, EmptyState, EmptyStateBody,
  Label, Flex, FlexItem, Tooltip, Button,
} from '@patternfly/react-core';
import { Table, Thead, Tr, Th, Tbody, Td } from '@patternfly/react-table';
import { CheckCircleIcon, TrendUpIcon, TrendDownIcon, EqualsIcon } from '@patternfly/react-icons';
import type { BlockingFailure } from '../../api/readiness';

const TREND_ICONS: Record<BlockingFailure['recent_trend'], React.ReactNode> = {
  worsening: <TrendUpIcon color="var(--pf-t--global--color--status--danger--default)" />,
  improving: <TrendDownIcon color="var(--pf-t--global--color--status--success--default)" />,
  stable: <EqualsIcon color="var(--pf-t--global--color--status--info--default)" />,
};

export const ReadinessBlocking: React.FC<{ failures: BlockingFailure[] }> = ({ failures }) => {
  const navigate = useNavigate();

  return (
    <Card>
      <CardBody>
        <Content component="h3" className="app-section-heading">Blocking Failures</Content>
        {failures.length === 0 ? (
          <EmptyState icon={CheckCircleIcon} headingLevel="h4" titleText="No blocking failures">
            <EmptyStateBody>All tests are passing for this version.</EmptyStateBody>
          </EmptyState>
        ) : (
          <Table aria-label="Blocking failures" variant="compact" isStickyHeader>
            <Thead><Tr><Th>Test Name</Th><Th>Fail Count</Th><Th>Total Runs</Th><Th>Failure Rate</Th><Th>Trend</Th></Tr></Thead>
            <Tbody>
              {failures.map((failure) => {
                const shortName = failure.name.split('.').pop() || failure.name;
                return (
                    <Tr key={failure.unique_id}>
                    <Td dataLabel="Test Name" className="app-cell-truncate">
                      <Tooltip content={failure.name}>
                        <Button variant="link" isInline size="sm" onClick={() => navigate(`/test/${encodeURIComponent(failure.unique_id)}`)}>{shortName}</Button>
                      </Tooltip>
                    </Td>
                    <Td dataLabel="Fail Count" className="app-cell-nowrap"><strong>{failure.fail_count}</strong></Td>
                    <Td dataLabel="Total Runs" className="app-cell-nowrap">{failure.total_runs}</Td>
                    <Td dataLabel="Failure Rate" className="app-cell-nowrap">
                      <Label color={failure.failure_rate >= 50 ? 'red' : failure.failure_rate >= 20 ? 'yellow' : 'blue'}>{failure.failure_rate}%</Label>
                    </Td>
                    <Td dataLabel="Trend" className="app-cell-nowrap">
                      <Flex spaceItems={{ default: 'spaceItemsXs' }} alignItems={{ default: 'alignItemsCenter' }}>
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
