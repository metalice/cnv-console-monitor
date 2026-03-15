import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardBody, Content, Spinner, Tooltip, Button, Label } from '@patternfly/react-core';
import { Table, Thead, Tr, Th, Tbody, Td } from '@patternfly/react-table';
import { TrendUpIcon, TrendDownIcon, EqualsIcon } from '@patternfly/react-icons';
import type { TopFailingTest } from '@cnv-monitor/shared';

type TopFailuresTableProps = {
  isLoading: boolean;
  topFailures: TopFailingTest[] | undefined;
};

export const TopFailuresTable: React.FC<TopFailuresTableProps> = ({ isLoading, topFailures }) => {
  const navigate = useNavigate();

  return (
    <Card>
      <CardBody>
        <Content component="h3" className="app-section-heading">Top Failing Tests (last 30 days)</Content>
        {isLoading ? (
          <Spinner size="md" />
        ) : topFailures && topFailures.length > 0 ? (
          <div className="app-table-scroll">
            <Table aria-label="Top failing tests" variant="compact">
              <Thead>
                <Tr>
                  <Th width={10}>#</Th>
                  <Th width={30}>Test</Th>
                  <Th width={10}>Failures</Th>
                  <Th width={10}>Runs</Th>
                  <Th width={20}>Failure Rate</Th>
                  <Th width={20}>Trend</Th>
                </Tr>
              </Thead>
              <Tbody>
                {topFailures.map((test, i) => {
                  const shortName = test.name.split('.').pop() || test.name;
                  const color = test.failure_rate > 70 ? 'red' : test.failure_rate > 30 ? 'orange' : 'grey';
                  return (
                    <Tr key={test.unique_id}>
                      <Td dataLabel="#" className="app-cell-nowrap">{i + 1}</Td>
                      <Td dataLabel="Test" className="app-cell-truncate">
                        <Tooltip content={test.name}>
                          <Button variant="link" isInline size="sm" onClick={() => navigate(`/test/${encodeURIComponent(test.unique_id)}`)}>
                            {shortName}
                          </Button>
                        </Tooltip>
                      </Td>
                      <Td dataLabel="Failures" className="app-cell-nowrap"><strong>{test.fail_count}</strong></Td>
                      <Td dataLabel="Runs" className="app-cell-nowrap">{test.total_runs}</Td>
                      <Td dataLabel="Failure Rate" className="app-cell-nowrap">
                        <Label color={color} isCompact>{test.failure_rate}%</Label>
                      </Td>
                      <Td dataLabel="Trend" className="app-cell-nowrap">
                        {test.recent_trend === 'worsening' && (
                          <Tooltip content="Failing more in the second half of the period">
                            <Label color="red" isCompact icon={<TrendUpIcon />}>Worse</Label>
                          </Tooltip>
                        )}
                        {test.recent_trend === 'improving' && (
                          <Tooltip content="Failing less in the second half of the period">
                            <Label color="green" isCompact icon={<TrendDownIcon />}>Better</Label>
                          </Tooltip>
                        )}
                        {test.recent_trend === 'stable' && (
                          <Label color="grey" isCompact icon={<EqualsIcon />}>Stable</Label>
                        )}
                      </Td>
                    </Tr>
                  );
                })}
              </Tbody>
            </Table>
          </div>
        ) : (
          <Content>No failure data available.</Content>
        )}
      </CardBody>
    </Card>
  );
};
