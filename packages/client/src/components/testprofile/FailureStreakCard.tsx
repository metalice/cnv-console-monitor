import {
  Card,
  CardBody,
  CardTitle,
  Content,
  Flex,
  FlexItem,
  Grid,
  GridItem,
  Tooltip,
} from '@patternfly/react-core';

import { type TestProfile } from '../../api/testProfile';

type FailureStreakCardProps = {
  streak: TestProfile['streak'];
};

const streakBar = (statuses: string[]) => (
  <Flex spaceItems={{ default: 'spaceItemsNone' }}>
    {statuses.map((runStatus, i) => (
      // eslint-disable-next-line react/no-array-index-key
      <FlexItem key={i}>
        <Tooltip content={runStatus}>
          <div
            className="app-streak-cell"
            style={{
              background:
                runStatus === 'FAILED'
                  ? 'var(--pf-t--global--color--status--danger--default)'
                  : 'var(--pf-t--global--color--status--success--default)',
            }}
          />
        </Tooltip>
      </FlexItem>
    ))}
  </Flex>
);

export const FailureStreakCard = ({ streak }: FailureStreakCardProps) => (
  <Card>
    <CardTitle>Failure Streak</CardTitle>
    <CardBody>
      <Grid hasGutter>
        <GridItem span={3}>
          <Content
            className="app-text-center"
            component="h2"
            style={{
              color:
                streak.consecutiveFailures > 0
                  ? 'var(--pf-t--global--color--status--danger--default)'
                  : 'var(--pf-t--global--color--status--success--default)',
            }}
          >
            {streak.consecutiveFailures}/{streak.totalRuns}
          </Content>
          <Content className="app-text-block-center" component="small">
            Consecutive Failures
          </Content>
        </GridItem>
        <GridItem span={3}>
          <Content className="app-text-center" component="h2">
            {streak.lastPassDate ?? 'Never'}
          </Content>
          <Content className="app-text-block-center" component="small">
            Last Passed
          </Content>
        </GridItem>
        <GridItem span={6}>
          <Content className="app-mb-xs" component="small">
            Recent Runs (latest first)
          </Content>
          {streakBar(streak.recentStatuses)}
        </GridItem>
      </Grid>
    </CardBody>
  </Card>
);
