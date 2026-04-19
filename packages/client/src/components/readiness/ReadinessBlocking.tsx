import { useNavigate } from 'react-router-dom';

import {
  Badge,
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

const FAILURE_RATE_HIGH = 50;
const FAILURE_RATE_MED = 20;

const TREND_CONFIG = {
  improving: {
    color: 'var(--pf-t--global--color--status--success--default)' as const,
    icon: TrendDownIcon,
    label: 'Improving',
  },
  stable: {
    color: 'var(--pf-t--global--color--status--info--default)' as const,
    icon: EqualsIcon,
    label: 'Stable',
  },
  worsening: {
    color: 'var(--pf-t--global--color--status--danger--default)' as const,
    icon: TrendUpIcon,
    label: 'Getting worse',
  },
};

const getFailureRateColor = (rate: number): 'red' | 'orange' | 'blue' => {
  if (rate >= FAILURE_RATE_HIGH) return 'red';
  if (rate >= FAILURE_RATE_MED) return 'orange';
  return 'blue';
};

export const ReadinessBlocking = ({ failures }: { failures: BlockingFailure[] }) => {
  const navigate = useNavigate();

  return (
    <Card>
      <CardBody>
        <Flex
          alignItems={{ default: 'alignItemsCenter' }}
          justifyContent={{ default: 'justifyContentSpaceBetween' }}
        >
          <FlexItem>
            <Flex
              alignItems={{ default: 'alignItemsCenter' }}
              spaceItems={{ default: 'spaceItemsSm' }}
            >
              <FlexItem>
                <Content className="app-section-heading" component="h3">
                  Blocking Failures
                </Content>
              </FlexItem>
              <FlexItem>
                <Badge isRead={failures.length === 0}>{failures.length}</Badge>
              </FlexItem>
            </Flex>
          </FlexItem>
        </Flex>

        {failures.length === 0 ? (
          <EmptyState headingLevel="h4" icon={CheckCircleIcon} titleText="No blocking failures">
            <EmptyStateBody>All tests are passing for this version.</EmptyStateBody>
          </EmptyState>
        ) : (
          <Table isStickyHeader aria-label="Blocking failures" variant="compact">
            <Thead>
              <Tr>
                <Th width={40}>Test Name</Th>
                <Th width={10}>Fails</Th>
                <Th width={10}>Runs</Th>
                <Th width={15}>Failure Rate</Th>
                <Th width={15}>Trend</Th>
              </Tr>
            </Thead>
            <Tbody>
              {failures.map(failure => {
                const shortName = failure.name.split('.').pop() ?? failure.name;
                const trendCfg = TREND_CONFIG[failure.recent_trend];
                const TrendIcon = trendCfg.icon;

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
                    <Td className="app-cell-nowrap" dataLabel="Fails">
                      <strong>{failure.fail_count}</strong>
                    </Td>
                    <Td className="app-cell-nowrap" dataLabel="Runs">
                      {failure.total_runs}
                    </Td>
                    <Td className="app-cell-nowrap" dataLabel="Failure Rate">
                      <Label isCompact color={getFailureRateColor(failure.failure_rate)}>
                        {failure.failure_rate}%
                      </Label>
                    </Td>
                    <Td className="app-cell-nowrap" dataLabel="Trend">
                      <Tooltip content={trendCfg.label}>
                        <Flex
                          alignItems={{ default: 'alignItemsCenter' }}
                          spaceItems={{ default: 'spaceItemsXs' }}
                        >
                          <FlexItem>
                            <TrendIcon color={trendCfg.color} />
                          </FlexItem>
                          <FlexItem>
                            <Content component="small">{trendCfg.label}</Content>
                          </FlexItem>
                        </Flex>
                      </Tooltip>
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
