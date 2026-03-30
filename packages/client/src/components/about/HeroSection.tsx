import {
  Content,
  Flex,
  FlexItem,
  Grid,
  GridItem,
  Label,
  PageSection,
} from '@patternfly/react-core';
import { OutlinedClockIcon } from '@patternfly/react-icons';

import { type PollStatusResponse } from '../../api/poll';

type AboutStats = {
  launches: number;
  testItems: number;
  days: number;
};

type HeroSectionProps = {
  stats: AboutStats | undefined;
  pollStatus: PollStatusResponse | undefined;
};

export const HeroSection = ({ pollStatus, stats }: HeroSectionProps) => (
  <PageSection className="app-about-hero">
    <Grid hasGutter>
      <GridItem md={8} span={12}>
        <Content component="h1">CNV Console Monitor</Content>
        <Content className="app-about-subtitle" component="p">
          Daily monitoring dashboard for CNV (Container-Native Virtualization) Console test runs
          from ReportPortal. Track test health, triage failures, manage releases, and get AI-powered
          insights — all in one place.
        </Content>
      </GridItem>
      <GridItem md={4} span={12}>
        <Flex
          flexWrap={{ default: 'wrap' }}
          justifyContent={{ default: 'justifyContentFlexEnd' }}
          spaceItems={{ default: 'spaceItemsMd' }}
        >
          {stats && (
            <>
              <FlexItem>
                <div className="app-about-stat">
                  <span className="app-about-stat-value">{stats.launches.toLocaleString()}</span>
                  <span className="app-about-stat-label">Launches</span>
                </div>
              </FlexItem>
              <FlexItem>
                <div className="app-about-stat">
                  <span className="app-about-stat-value">{stats.testItems.toLocaleString()}</span>
                  <span className="app-about-stat-label">Test Items</span>
                </div>
              </FlexItem>
              <FlexItem>
                <div className="app-about-stat">
                  <span className="app-about-stat-value">{stats.days}</span>
                  <span className="app-about-stat-label">Days of Data</span>
                </div>
              </FlexItem>
            </>
          )}
          {pollStatus?.lastPollAt && (
            <FlexItem>
              <Label isCompact color="blue" icon={<OutlinedClockIcon />}>
                Last sync: {new Date(pollStatus.lastPollAt).toLocaleString()}
              </Label>
            </FlexItem>
          )}
        </Flex>
      </GridItem>
    </Grid>
  </PageSection>
);
