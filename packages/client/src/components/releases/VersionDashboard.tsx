import { useMemo, useState } from 'react';

import type { ChecklistTask, ReleaseInfo } from '@cnv-monitor/shared';

import {
  Card,
  CardBody,
  CardTitle,
  Flex,
  FlexItem,
  Grid,
  GridItem,
  Tab,
  Tabs,
  TabTitleText,
} from '@patternfly/react-core';
import { useQuery } from '@tanstack/react-query';

import { fetchVersionReadiness } from '../../api/releases';

import { BlockerWall } from './BlockerWall';
import { ChangelogTab } from './ChangelogTab';
import { DashboardHeader, ReadinessDetails } from './DashboardHeader';
import { MilestoneTimeline } from './MilestoneTimeline';
import { PassRateTrend } from './PassRateTrend';
import { ReadinessGauge } from './ReadinessGauge';
import { ReleaseReport } from './ReleaseReport';
import { RiskFlags } from './RiskFlags';
import { RiskTab } from './RiskTab';
import { computeHealth } from './TrafficLight';
import { WorkloadChart } from './WorkloadChart';

const STALE_TIME_MS = 5 * 60 * 1000;
const CHECKLIST_WEIGHT = 0.5;
const TEST_WEIGHT = 0.5;
const FULL_SCORE = 100;

type VersionDashboardProps = {
  release: ReleaseInfo;
  checklist?: ChecklistTask[];
  onClose?: () => void;
};

export const VersionDashboard = ({ checklist, onClose, release }: VersionDashboardProps) => {
  const [activeTab, setActiveTab] = useState(0);
  const version = release.shortname;

  const { data: readiness, isLoading: readinessLoading } = useQuery({
    queryFn: () => fetchVersionReadiness(version),
    queryKey: ['versionReadiness', version],
    staleTime: STALE_TIME_MS,
  });

  const checklistDone = (checklist ?? []).filter(task => task.status === 'Closed').length;
  const checklistTotal = (checklist ?? []).length;

  const health = computeHealth({
    checklistDone,
    checklistTotal,
    daysUntilNext: release.daysUntilNext,
    passRate: readiness?.passRate ?? undefined,
  });

  const readinessScore = useMemo(() => {
    const checklistPct =
      checklistTotal > 0 ? (checklistDone / checklistTotal) * FULL_SCORE : FULL_SCORE;
    const testPct = readiness?.passRate ?? FULL_SCORE;
    return Math.round(checklistPct * CHECKLIST_WEIGHT + testPct * TEST_WEIGHT);
  }, [checklistDone, checklistTotal, readiness]);

  const openTaskCount = (checklist ?? []).filter(task => task.status !== 'Closed').length;

  return (
    <Card>
      <CardTitle>
        <DashboardHeader
          health={health}
          phase={release.phase}
          shortname={release.shortname}
          onClose={onClose}
        />
      </CardTitle>
      <CardBody>
        <Grid hasGutter className="app-mb-md">
          <GridItem md={3} span={12}>
            <div className="app-text-block-center">
              <ReadinessGauge score={readinessScore} />
            </div>
          </GridItem>
          <GridItem md={3} span={12}>
            <ReadinessDetails
              checklistDone={checklistDone}
              checklistTotal={checklistTotal}
              daysUntilNext={release.daysUntilNext}
              readiness={readiness}
              readinessLoading={readinessLoading}
            />
          </GridItem>
          <GridItem md={6} span={12}>
            {readiness && readiness.trend.length > 0 && <PassRateTrend trend={readiness.trend} />}
          </GridItem>
        </Grid>

        <RiskFlags checklist={checklist} readiness={readiness} release={release} />

        <Flex className="app-mb-md" spaceItems={{ default: 'spaceItemsSm' }}>
          <FlexItem>
            <ReleaseReport checklist={checklist} readiness={readiness} release={release} />
          </FlexItem>
        </Flex>

        <Tabs activeKey={activeTab} onSelect={(_e, key) => setActiveTab(key as number)}>
          <Tab eventKey={0} title={<TabTitleText>Milestones</TabTitleText>}>
            <div className="app-mt-md">
              <MilestoneTimeline release={release} />
            </div>
          </Tab>
          <Tab eventKey={1} title={<TabTitleText>Workload ({openTaskCount} open)</TabTitleText>}>
            <div className="app-mt-md">
              <WorkloadChart tasks={checklist ?? []} />
            </div>
          </Tab>
          <Tab eventKey={2} title={<TabTitleText>Blockers</TabTitleText>}>
            <div className="app-mt-md">
              <BlockerWall version={version} />
            </div>
          </Tab>
          <Tab eventKey={3} title={<TabTitleText>AI Changelog</TabTitleText>}>
            <ChangelogTab milestones={release.milestones} version={version} />
          </Tab>
          <Tab eventKey={4} title={<TabTitleText>AI Risk</TabTitleText>}>
            <RiskTab
              checklist={checklist}
              readiness={readiness}
              release={release}
              version={version}
            />
          </Tab>
        </Tabs>
      </CardBody>
    </Card>
  );
};
