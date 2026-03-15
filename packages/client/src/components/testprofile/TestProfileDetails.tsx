import React from 'react';
import {
  Card, CardBody, CardTitle, Label, Flex, FlexItem,
  Grid, GridItem, Tooltip, Content,
  DescriptionList, DescriptionListGroup, DescriptionListTerm, DescriptionListDescription,
  Button,
} from '@patternfly/react-core';
import { WrenchIcon, BugIcon, LinkIcon } from '@patternfly/react-icons';
import type { PublicConfig } from '@cnv-monitor/shared';
import type { TestProfile } from '../../api/testProfile';
import { TestProfileTables } from './TestProfileTables';

const streakBar = (statuses: string[]): React.ReactNode => (
  <Flex spaceItems={{ default: 'spaceItemsNone' }}>
    {statuses.map((s, i) => (
      <FlexItem key={i}>
        <Tooltip content={s}>
          <div className="app-streak-cell" style={{
            background: s === 'FAILED' ? 'var(--pf-t--global--color--status--danger--default)' : 'var(--pf-t--global--color--status--success--default)',
          }} />
        </Tooltip>
      </FlexItem>
    ))}
  </Flex>
);

export interface TestProfileDetailsProps {
  profile: TestProfile;
  config?: PublicConfig;
  latestFailedRpId: number | null;
  onClassify: (ids: number[]) => void;
  onCreateBug: (info: { rpId: number; name: string; polarionId?: string }) => void;
  onLinkJira: (rpId: number) => void;
}

export const TestProfileDetails: React.FC<TestProfileDetailsProps> = ({
  profile, config, latestFailedRpId, onClassify, onCreateBug, onLinkJira,
}) => {
  const { identity, streak, history, affectedLaunches, triageHistory } = profile;

  return (
    <Grid hasGutter>
      <GridItem span={12} md={4}>
        <Card>
          <CardTitle>Test Identity</CardTitle>
          <CardBody>
            <DescriptionList isCompact>
              {identity.polarionId && (
                <DescriptionListGroup>
                  <DescriptionListTerm>Polarion</DescriptionListTerm>
                  <DescriptionListDescription>
                    <Label color="blue" isCompact>
                      {config?.polarionUrl ? (
                        <a href={`${config.polarionUrl}${identity.polarionId}`} target="_blank" rel="noreferrer">{identity.polarionId}</a>
                      ) : identity.polarionId}
                    </Label>
                  </DescriptionListDescription>
                </DescriptionListGroup>
              )}
              {identity.component && (
                <DescriptionListGroup>
                  <DescriptionListTerm>Component</DescriptionListTerm>
                  <DescriptionListDescription><Label color="grey" isCompact>{identity.component}</Label></DescriptionListDescription>
                </DescriptionListGroup>
              )}
              {identity.jiraKeys.length > 0 && (
                <DescriptionListGroup>
                  <DescriptionListTerm>Jira Issues</DescriptionListTerm>
                  <DescriptionListDescription>
                    <Flex spaceItems={{ default: 'spaceItemsXs' }}>
                      {identity.jiraKeys.map(key => (
                        <FlexItem key={key}>
                          <Label color="blue" isCompact>
                            {config?.jiraUrl ? <a href={`${config.jiraUrl}/browse/${key}`} target="_blank" rel="noreferrer">{key}</a> : key}
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
                  <FlexItem><Button variant="secondary" size="sm" icon={<WrenchIcon />} onClick={() => onClassify([latestFailedRpId])}>Classify</Button></FlexItem>
                  <FlexItem><Button variant="secondary" size="sm" icon={<BugIcon />} onClick={() => onCreateBug({ rpId: latestFailedRpId, name: identity.name, polarionId: identity.polarionId ?? undefined })}>Bug</Button></FlexItem>
                  <FlexItem><Button variant="secondary" size="sm" icon={<LinkIcon />} onClick={() => onLinkJira(latestFailedRpId)}>Link Jira</Button></FlexItem>
                </>
              )}
            </Flex>
          </CardBody>
        </Card>
      </GridItem>

      <GridItem span={12} md={8}>
        <Card>
          <CardTitle>Failure Streak</CardTitle>
          <CardBody>
            <Grid hasGutter>
              <GridItem span={3}>
                <Content component="h2" className="app-text-center" style={{ color: streak.consecutiveFailures > 0 ? 'var(--pf-t--global--color--status--danger--default)' : 'var(--pf-t--global--color--status--success--default)' }}>
                  {streak.consecutiveFailures}/{streak.totalRuns}
                </Content>
                <Content component="small" className="app-text-block-center">Consecutive Failures</Content>
              </GridItem>
              <GridItem span={3}>
                <Content component="h2" className="app-text-center">{streak.lastPassDate ?? 'Never'}</Content>
                <Content component="small" className="app-text-block-center">Last Passed</Content>
              </GridItem>
              <GridItem span={6}>
                <Content component="small" className="app-mb-xs">Recent Runs (latest first)</Content>
                {streakBar(streak.recentStatuses)}
              </GridItem>
            </Grid>
          </CardBody>
        </Card>
      </GridItem>

      <TestProfileTables history={history} affectedLaunches={affectedLaunches} triageHistory={triageHistory} />
    </Grid>
  );
};
