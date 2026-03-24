import React from 'react';

import type { PublicConfig } from '@cnv-monitor/shared';

import {
  Button,
  Card,
  CardBody,
  CardTitle,
  Content,
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  Flex,
  FlexItem,
  Grid,
  GridItem,
  Label,
  Tooltip,
} from '@patternfly/react-core';
import { BugIcon, LinkIcon, WrenchIcon } from '@patternfly/react-icons';

import type { TestProfile } from '../../api/testProfile';

import { TestProfileTables } from './TestProfileTables';

const streakBar = (statuses: string[]): React.ReactNode => (
  <Flex spaceItems={{ default: 'spaceItemsNone' }}>
    {statuses.map((s, i) => (
      // eslint-disable-next-line react/no-array-index-key
      <FlexItem key={i}>
        <Tooltip content={s}>
          <div
            className="app-streak-cell"
            style={{
              background:
                s === 'FAILED'
                  ? 'var(--pf-t--global--color--status--danger--default)'
                  : 'var(--pf-t--global--color--status--success--default)',
            }}
          />
        </Tooltip>
      </FlexItem>
    ))}
  </Flex>
);

export type TestProfileDetailsProps = {
  profile: TestProfile;
  config?: PublicConfig;
  latestFailedRpId: number | null;
  onClassify: (ids: number[]) => void;
  onCreateBug: (info: { rpId: number; name: string; polarionId?: string }) => void;
  onLinkJira: (rpId: number) => void;
};

export const TestProfileDetails: React.FC<TestProfileDetailsProps> = ({
  config,
  latestFailedRpId,
  onClassify,
  onCreateBug,
  onLinkJira,
  profile,
}) => {
  const { affectedLaunches, history, identity, streak, triageHistory } = profile;

  return (
    <Grid hasGutter>
      <GridItem md={4} span={12}>
        <Card>
          <CardTitle>Test Identity</CardTitle>
          <CardBody>
            <DescriptionList isCompact>
              {identity.polarionId && (
                <DescriptionListGroup>
                  <DescriptionListTerm>Polarion</DescriptionListTerm>
                  <DescriptionListDescription>
                    <Label isCompact color="blue">
                      {config?.polarionUrl ? (
                        <a
                          href={`${config.polarionUrl}${identity.polarionId}`}
                          rel="noreferrer"
                          target="_blank"
                        >
                          {identity.polarionId}
                        </a>
                      ) : (
                        identity.polarionId
                      )}
                    </Label>
                  </DescriptionListDescription>
                </DescriptionListGroup>
              )}
              {identity.component && (
                <DescriptionListGroup>
                  <DescriptionListTerm>Component</DescriptionListTerm>
                  <DescriptionListDescription>
                    <Label isCompact color="grey">
                      {identity.component}
                    </Label>
                  </DescriptionListDescription>
                </DescriptionListGroup>
              )}
              {identity.jiraKeys.length > 0 && (
                <DescriptionListGroup>
                  <DescriptionListTerm>Jira Issues</DescriptionListTerm>
                  <DescriptionListDescription>
                    <Flex spaceItems={{ default: 'spaceItemsXs' }}>
                      {identity.jiraKeys.map(key => (
                        <FlexItem key={key}>
                          <Label isCompact color="blue">
                            {config?.jiraUrl ? (
                              <a
                                href={`${config.jiraUrl}/browse/${key}`}
                                rel="noreferrer"
                                target="_blank"
                              >
                                {key}
                              </a>
                            ) : (
                              key
                            )}
                          </Label>
                        </FlexItem>
                      ))}
                    </Flex>
                  </DescriptionListDescription>
                </DescriptionListGroup>
              )}
            </DescriptionList>
            <Flex className="app-section-heading" spaceItems={{ default: 'spaceItemsXs' }}>
              {latestFailedRpId && (
                <>
                  <FlexItem>
                    <Button
                      icon={<WrenchIcon />}
                      size="sm"
                      variant="secondary"
                      onClick={() => onClassify([latestFailedRpId])}
                    >
                      Classify
                    </Button>
                  </FlexItem>
                  <FlexItem>
                    <Button
                      icon={<BugIcon />}
                      size="sm"
                      variant="secondary"
                      onClick={() =>
                        onCreateBug({
                          name: identity.name,
                          polarionId: identity.polarionId ?? undefined,
                          rpId: latestFailedRpId,
                        })
                      }
                    >
                      Bug
                    </Button>
                  </FlexItem>
                  <FlexItem>
                    <Button
                      icon={<LinkIcon />}
                      size="sm"
                      variant="secondary"
                      onClick={() => onLinkJira(latestFailedRpId)}
                    >
                      Link Jira
                    </Button>
                  </FlexItem>
                </>
              )}
            </Flex>
          </CardBody>
        </Card>
      </GridItem>

      <GridItem md={8} span={12}>
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
      </GridItem>

      <TestProfileTables
        affectedLaunches={affectedLaunches}
        history={history}
        triageHistory={triageHistory}
      />
    </Grid>
  );
};
