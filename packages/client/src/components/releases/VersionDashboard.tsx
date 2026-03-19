import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Card, CardBody, CardTitle,
  Tabs, Tab, TabTitleText,
  Flex, FlexItem, Grid, GridItem,
  Label, Tooltip, Content, Spinner, Bullseye,
  DescriptionList, DescriptionListGroup, DescriptionListTerm, DescriptionListDescription,
} from '@patternfly/react-core';
import { OutlinedQuestionCircleIcon } from '@patternfly/react-icons';
import type { ReleaseInfo, ChecklistTask } from '@cnv-monitor/shared';
import { fetchVersionReadiness } from '../../api/releases';
import { TrafficLight, computeHealth } from './TrafficLight';
import { HelpLabel } from '../common/HelpLabel';
import { RiskFlags } from './RiskFlags';
import { ReleaseReport } from './ReleaseReport';
import { BlockerWall } from './BlockerWall';

const ReadinessGauge: React.FC<{ score: number }> = ({ score }) => {
  const color = score >= 80 ? 'var(--pf-t--global--color--status--success--default)'
    : score >= 50 ? 'var(--pf-t--global--color--status--warning--default)'
    : 'var(--pf-t--global--color--status--danger--default)';
  return (
    <Tooltip content={`Readiness score: ${score}%`}>
      <div className="app-readiness-gauge">
        <svg viewBox="0 0 36 36" width="64" height="64">
          <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            fill="none" stroke="var(--pf-t--global--border--color--default)" strokeWidth="3" />
          <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            fill="none" stroke={color} strokeWidth="3"
            strokeDasharray={`${score}, 100`} strokeLinecap="round" />
          <text x="18" y="21" textAnchor="middle" fontSize="9" fontWeight="700" fill={color}>{score}%</text>
        </svg>
      </div>
    </Tooltip>
  );
};

const MILESTONE_TYPE_COLORS: Record<string, string> = {
  ga: 'var(--pf-t--global--color--status--danger--default)',
  batch: 'var(--pf-t--global--color--brand--default)',
  feature_freeze: 'var(--pf-t--global--color--status--warning--default)',
  code_freeze: 'var(--pf-t--global--color--status--warning--default)',
  blockers_only: 'var(--pf-t--global--color--status--danger--default)',
  custom: 'var(--pf-t--global--color--status--purple--default, #6753ac)',
};

const extractShortName = (name: string): string => {
  const ver = name.match(/(\d+\.\d+\.?\d*)/);
  if (ver) return ver[1];
  if (name.toLowerCase().includes('feature freeze')) return 'FF';
  if (name.toLowerCase().includes('code freeze')) return 'CF';
  if (name.toLowerCase().includes('blocker')) return 'BO';
  return name.substring(0, 10);
};

const MilestoneTimeline: React.FC<{ release: ReleaseInfo }> = ({ release }) => {
  return (
    <div className="app-ms-strip-scroll">
      <div className="app-ms-strip">
        <div className="app-ms-line" />
        {release.milestones.map((m, i) => {
          const color = MILESTONE_TYPE_COLORS[m.type] ?? 'var(--pf-t--global--border--color--default)';
          return (
            <Tooltip key={i} content={`${m.name} — ${new Date(m.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`}>
              <div className={`app-ms-point ${m.isPast ? 'app-ms-past' : ''}`}>
                <div className="app-ms-dot" style={{ background: color }} />
                <span className="app-ms-label-top">{extractShortName(m.name)}</span>
                <span className="app-ms-label-bot">
                  {new Date(m.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </span>
              </div>
            </Tooltip>
          );
        })}
      </div>
    </div>
  );
};

const WorkloadChart: React.FC<{ tasks: ChecklistTask[] }> = ({ tasks }) => {
  const data = useMemo(() => {
    const counts = new Map<string, number>();
    for (const t of tasks) {
      if (t.status === 'Closed') continue;
      const assignee = t.assignee || 'Unassigned';
      counts.set(assignee, (counts.get(assignee) ?? 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
  }, [tasks]);

  if (data.length === 0) return <Content component="p" className="app-text-muted">No open items</Content>;
  const max = data[0][1];

  return (
    <div className="app-comp-chart">
      {data.map(([name, count]) => (
        <div key={name} className="app-comp-row">
          <span className="app-comp-label app-text-xs">{name.split('@')[0]}</span>
          <div className="app-comp-bar-track">
            <div className="app-comp-bar" style={{ width: `${Math.max(2, (count / max) * 100)}%` }} />
          </div>
          <span className="app-comp-count app-text-xs app-text-muted">{count}</span>
        </div>
      ))}
    </div>
  );
};

type VersionDashboardProps = {
  release: ReleaseInfo;
  checklist?: ChecklistTask[];
};

export const VersionDashboard: React.FC<VersionDashboardProps> = ({ release, checklist }) => {
  const [activeTab, setActiveTab] = React.useState(0);
  const version = release.shortname;

  const { data: readiness, isLoading: readinessLoading } = useQuery({
    queryKey: ['versionReadiness', version],
    queryFn: () => fetchVersionReadiness(version),
    staleTime: 5 * 60 * 1000,
  });

  const checklistDone = (checklist ?? []).filter(t => t.status === 'Closed').length;
  const checklistTotal = (checklist ?? []).length;

  const health = computeHealth({
    checklistDone,
    checklistTotal,
    passRate: readiness?.passRate ?? undefined,
    daysUntilNext: release.daysUntilNext,
  });

  const readinessScore = useMemo(() => {
    const checklistPct = checklistTotal > 0 ? (checklistDone / checklistTotal) * 100 : 100;
    const testPct = readiness?.passRate ?? 100;
    return Math.round(checklistPct * 0.5 + testPct * 0.5);
  }, [checklistDone, checklistTotal, readiness]);

  return (
    <Card>
      <CardTitle>
        <Flex alignItems={{ default: 'alignItemsCenter' }} spaceItems={{ default: 'spaceItemsMd' }}>
          <FlexItem><TrafficLight status={health.status} reason={health.reason} size={16} /></FlexItem>
          <FlexItem>{release.shortname.replace('cnv-', 'CNV ')} Dashboard</FlexItem>
          <FlexItem><Label color={release.phase.includes('Maintenance') ? 'green' : release.phase.includes('Development') ? 'blue' : 'purple'} isCompact>{release.phase}</Label></FlexItem>
        </Flex>
      </CardTitle>
      <CardBody>
        <Grid hasGutter className="app-mb-md">
          <GridItem span={12} md={3}>
            <div className="app-text-block-center">
              <ReadinessGauge score={readinessScore} />
              <HelpLabel label="Readiness" help="Composite score combining checklist completion (50%) and test pass rate (50%). Higher is better." />
            </div>
          </GridItem>
          <GridItem span={12} md={3}>
            <DescriptionList isCompact isHorizontal>
              <DescriptionListGroup>
                <DescriptionListTerm><HelpLabel label="Checklist" help="Jira release checklist tasks. Shows completed vs total." /></DescriptionListTerm>
                <DescriptionListDescription>{checklistDone}/{checklistTotal} done</DescriptionListDescription>
              </DescriptionListGroup>
              <DescriptionListGroup>
                <DescriptionListTerm><HelpLabel label="Pass Rate" help="Test pass rate from ReportPortal launches matching this CNV version in the last 14 days." /></DescriptionListTerm>
                <DescriptionListDescription>
                  {readinessLoading ? <Spinner size="sm" /> : readiness?.passRate !== null ? `${readiness?.passRate}%` : '--'}
                </DescriptionListDescription>
              </DescriptionListGroup>
              <DescriptionListGroup>
                <DescriptionListTerm><HelpLabel label="Next Release" help="Days until the next scheduled batch or GA release for this version." /></DescriptionListTerm>
                <DescriptionListDescription>
                  {release.daysUntilNext !== null ? (
                    <Label color={release.daysUntilNext <= 3 ? 'red' : release.daysUntilNext <= 7 ? 'orange' : 'green'} isCompact>
                      {release.daysUntilNext}d
                    </Label>
                  ) : '--'}
                </DescriptionListDescription>
              </DescriptionListGroup>
              <DescriptionListGroup>
                <DescriptionListTerm><HelpLabel label="Launches" help="Number of test launches from ReportPortal for this version in the last 14 days." /></DescriptionListTerm>
                <DescriptionListDescription>{readiness?.totalLaunches ?? '--'}</DescriptionListDescription>
              </DescriptionListGroup>
            </DescriptionList>
          </GridItem>
          <GridItem span={12} md={6}>
            {readiness && readiness.trend.length > 0 && (
              <div>
                <HelpLabel label="Pass rate trend (14 days)" help="Daily test pass rate for this version. Green dots are ≥85%, yellow dots are below." />
                <svg viewBox="0 0 200 40" className="app-trend-chart">
                  {readiness.trend.map((d, i) => {
                    const x = (i / Math.max(readiness.trend.length - 1, 1)) * 196 + 2;
                    const y = d.passRate !== null ? 38 - (d.passRate / 100) * 36 : 38;
                    const color = d.passRate !== null && d.passRate >= 85 ? 'var(--pf-t--global--color--status--success--default)' : 'var(--pf-t--global--color--status--warning--default)';
                    return <circle key={i} cx={x} cy={y} r={2.5} fill={color} />;
                  })}
                  <polyline
                    points={readiness.trend.map((d, i) => {
                      const x = (i / Math.max(readiness.trend.length - 1, 1)) * 196 + 2;
                      const y = d.passRate !== null ? 38 - (d.passRate / 100) * 36 : 38;
                      return `${x},${y}`;
                    }).join(' ')}
                    fill="none" stroke="var(--pf-t--global--color--brand--default)" strokeWidth="1.5" opacity="0.5"
                  />
                </svg>
              </div>
            )}
          </GridItem>
        </Grid>

        <RiskFlags release={release} checklist={checklist} readiness={readiness} />

        <Flex className="app-mb-md" spaceItems={{ default: 'spaceItemsSm' }}>
          <FlexItem><ReleaseReport release={release} checklist={checklist} readiness={readiness} /></FlexItem>
        </Flex>

        <Tabs activeKey={activeTab} onSelect={(_e, key) => setActiveTab(key as number)}>
          <Tab eventKey={0} title={<TabTitleText>Milestones</TabTitleText>}>
            <div className="app-mt-md">
              <MilestoneTimeline release={release} />
            </div>
          </Tab>
          <Tab eventKey={1} title={<TabTitleText>Workload ({(checklist ?? []).filter(t => t.status !== 'Closed').length} open)</TabTitleText>}>
            <div className="app-mt-md">
              <WorkloadChart tasks={checklist ?? []} />
            </div>
          </Tab>
          <Tab eventKey={2} title={<TabTitleText>Blockers</TabTitleText>}>
            <div className="app-mt-md">
              <BlockerWall version={version} />
            </div>
          </Tab>
        </Tabs>
      </CardBody>
    </Card>
  );
};
