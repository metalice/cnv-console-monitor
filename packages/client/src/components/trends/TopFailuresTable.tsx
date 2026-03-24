import React from 'react';
import { useNavigate } from 'react-router-dom';

import type { TopFailingTest } from '@cnv-monitor/shared';

import { Button, Card, CardBody, Content, Label, Spinner, Tooltip } from '@patternfly/react-core';
import { EqualsIcon, TrendDownIcon, TrendUpIcon } from '@patternfly/react-icons';
import { Table, Tbody, Td, Th, Thead, Tr } from '@patternfly/react-table';

type TopFailuresTableProps = {
  isLoading: boolean;
  topFailures: TopFailingTest[] | undefined;
};

export const TopFailuresTable: React.FC<TopFailuresTableProps> = ({ isLoading, topFailures }) => {
  const navigate = useNavigate();

  return (
    <Card>
      <CardBody>
        <Content className="app-section-heading" component="h3">
          Top Failing Tests (last 30 days)
        </Content>
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
                  const color =
                    test.failure_rate > 70 ? 'red' : test.failure_rate > 30 ? 'orange' : 'grey';
                  return (
                    <Tr key={test.unique_id}>
                      <Td className="app-cell-nowrap" dataLabel="#">
                        {i + 1}
                      </Td>
                      <Td className="app-cell-truncate" dataLabel="Test">
                        <Tooltip content={test.name}>
                          <Button
                            isInline
                            size="sm"
                            variant="link"
                            onClick={() => navigate(`/test/${encodeURIComponent(test.unique_id)}`)}
                          >
                            {shortName}
                          </Button>
                        </Tooltip>
                      </Td>
                      <Td className="app-cell-nowrap" dataLabel="Failures">
                        <strong>{test.fail_count}</strong>
                      </Td>
                      <Td className="app-cell-nowrap" dataLabel="Runs">
                        {test.total_runs}
                      </Td>
                      <Td className="app-cell-nowrap" dataLabel="Failure Rate">
                        <Label isCompact color={color}>
                          {test.failure_rate}%
                        </Label>
                      </Td>
                      <Td className="app-cell-nowrap" dataLabel="Trend">
                        {test.recent_trend === 'worsening' && (
                          <Tooltip content="Failing more in the second half of the period">
                            <Label isCompact color="red" icon={<TrendUpIcon />}>
                              Worse
                            </Label>
                          </Tooltip>
                        )}
                        {test.recent_trend === 'improving' && (
                          <Tooltip content="Failing less in the second half of the period">
                            <Label isCompact color="green" icon={<TrendDownIcon />}>
                              Better
                            </Label>
                          </Tooltip>
                        )}
                        {test.recent_trend === 'stable' && (
                          <Label isCompact color="grey" icon={<EqualsIcon />}>
                            Stable
                          </Label>
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
