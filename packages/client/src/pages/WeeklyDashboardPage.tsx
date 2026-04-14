import { useEffect, useMemo } from 'react';

import { type PersonReport, type TaskSummary } from '@cnv-monitor/shared';

import {
  Alert,
  Card,
  CardBody,
  Content,
  EmptyState,
  EmptyStateBody,
  Flex,
  FlexItem,
  Grid,
  GridItem,
  PageSection,
  Spinner,
  Tab,
  Tabs,
  TabTitleText,
} from '@patternfly/react-core';
import { CubesIcon, ExclamationTriangleIcon, ListIcon, UsersIcon } from '@patternfly/react-icons';

import { PersonCard } from '../components/weekly/PersonCard';
import { PollProgress } from '../components/weekly/PollProgress';
import { StatCards } from '../components/weekly/StatCards';
import { TaskSummaryView } from '../components/weekly/TaskSummaryView';
import { useWeeklyPollStatus } from '../hooks/useWeeklyPollStatus';
import { useCurrentWeeklyReport } from '../hooks/useWeeklyReports';

type AggregateStats = {
  commitCount: number;
  contributorCount: number;
  prsMerged: number;
  storyPoints: number;
  ticketsDone: number;
};

const computeAggregateStats = (personReports: PersonReport[]): AggregateStats => {
  const active = personReports.filter(person => !person.excluded);
  return active.reduce(
    (acc, person) => ({
      commitCount: acc.commitCount + person.stats.commitCount,
      contributorCount: acc.contributorCount + 1,
      prsMerged: acc.prsMerged + person.stats.prsMerged,
      storyPoints: acc.storyPoints + (person.stats.storyPointsCompleted ?? 0),
      ticketsDone: acc.ticketsDone + person.stats.ticketsDone,
    }),
    { commitCount: 0, contributorCount: 0, prsMerged: 0, storyPoints: 0, ticketsDone: 0 },
  );
};

const BlockersAlert = ({ blockers }: { blockers: TaskSummary['blockers'] }) => {
  if (blockers.length === 0) return null;

  return (
    <PageSection>
      <Alert
        isInline
        title={`${blockers.length} Blocker${blockers.length > 1 ? 's' : ''}`}
        variant="danger"
      >
        <ul>
          {blockers.map((blocker, idx) => (
            <li key={idx}>{blocker.description}</li>
          ))}
        </ul>
      </Alert>
    </PageSection>
  );
};

const WeeklyDashboardLoading = () => (
  <div className="app-page-spinner">
    <Spinner aria-label="Loading weekly report" />
  </div>
);

const WeeklyDashboardError = ({ message }: { message: string }) => (
  <PageSection>
    <EmptyState
      headingLevel="h2"
      icon={ExclamationTriangleIcon}
      titleText="Error loading weekly report"
    >
      <EmptyStateBody>{message}</EmptyStateBody>
    </EmptyState>
  </PageSection>
);

const WeeklyDashboardEmpty = ({
  pollStatus,
}: {
  pollStatus: ReturnType<typeof useWeeklyPollStatus>;
}) => (
  <PageSection>
    <EmptyState headingLevel="h2" icon={CubesIcon} titleText="No weekly report">
      <EmptyStateBody>
        Generate a report to see your team&apos;s weekly activity across GitHub, GitLab, and Jira.
      </EmptyStateBody>
      <PollProgress
        isStarting={pollStatus.isStarting}
        status={pollStatus.status}
        onTrigger={pollStatus.trigger}
      />
    </EmptyState>
  </PageSection>
);

const ByTaskTab = ({ taskSummary }: { taskSummary: TaskSummary | null | undefined }) => {
  if (!taskSummary) {
    return (
      <EmptyState headingLevel="h3" icon={ListIcon} titleText="Run AI Enhance">
        <EmptyStateBody>
          Use the AI Enhance action on the report editor to generate a task summary.
        </EmptyStateBody>
      </EmptyState>
    );
  }

  return <TaskSummaryView taskSummary={taskSummary} />;
};

const ByPersonTab = ({ personReports }: { personReports: PersonReport[] }) => {
  const visible = personReports.filter(person => !person.excluded);

  if (visible.length === 0) {
    return (
      <EmptyState headingLevel="h3" icon={UsersIcon} titleText="No team members">
        <EmptyStateBody>Add team members on the Team page, then run a weekly poll.</EmptyStateBody>
      </EmptyState>
    );
  }

  return (
    <Grid hasGutter>
      {visible.map(pr => (
        <GridItem key={pr.memberId} span={12}>
          <PersonCard personReport={pr} />
        </GridItem>
      ))}
    </Grid>
  );
};

export const WeeklyDashboardPage = () => {
  useEffect(() => {
    document.title = 'Weekly Report | CNV Console Monitor';
  }, []);

  const { data: report, error, isLoading } = useCurrentWeeklyReport();
  const pollStatus = useWeeklyPollStatus();

  const aggregateStats = useMemo(
    () => (report ? computeAggregateStats(report.personReports) : null),
    [report],
  );

  if (isLoading) return <WeeklyDashboardLoading />;
  if (error) return <WeeklyDashboardError message={error.message} />;
  if (!report) return <WeeklyDashboardEmpty pollStatus={pollStatus} />;

  const blockers = report.taskSummary?.blockers ?? [];

  return (
    <>
      <PageSection>
        <Flex
          alignItems={{ default: 'alignItemsCenter' }}
          justifyContent={{ default: 'justifyContentSpaceBetween' }}
        >
          <FlexItem>
            <Content component="h1">Weekly Report</Content>
            <Content component="small">
              {report.weekStart} &ndash; {report.weekEnd}
            </Content>
          </FlexItem>
        </Flex>
      </PageSection>

      <PageSection>
        <PollProgress
          isStarting={pollStatus.isStarting}
          status={pollStatus.status}
          onTrigger={pollStatus.trigger}
        />
      </PageSection>

      {aggregateStats && (
        <PageSection>
          <StatCards {...aggregateStats} />
        </PageSection>
      )}

      <PageSection>
        <Card>
          <CardBody>
            <Tabs defaultActiveKey={0}>
              <Tab eventKey={0} title={<TabTitleText>By Task</TabTitleText>}>
                <div className="app-weekly-tab-content">
                  <ByTaskTab taskSummary={report.taskSummary} />
                </div>
              </Tab>
              <Tab eventKey={1} title={<TabTitleText>By Person</TabTitleText>}>
                <div className="app-weekly-tab-content">
                  <ByPersonTab personReports={report.personReports} />
                </div>
              </Tab>
            </Tabs>
          </CardBody>
        </Card>
      </PageSection>

      <BlockersAlert blockers={blockers} />
    </>
  );
};
