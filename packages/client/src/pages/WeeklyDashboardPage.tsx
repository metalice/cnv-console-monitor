import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { type ReportState } from '@cnv-monitor/shared';

import {
  Content,
  EmptyState,
  EmptyStateActions,
  EmptyStateBody,
  EmptyStateFooter,
  Flex,
  FlexItem,
  Label,
  PageSection,
  Spinner,
  Tab,
  Tabs,
  TabTitleText,
} from '@patternfly/react-core';
import { CubesIcon, ExclamationTriangleIcon } from '@patternfly/react-icons';
import { Table, Tbody, Td, Th, Thead, Tr } from '@patternfly/react-table';

import { GenerateReportButton } from '../components/report/GenerateReportButton';
import { PollProgress } from '../components/weekly/PollProgress';
import { useWeeklyPollStatus } from '../hooks/useWeeklyPollStatus';
import { useWeeklyReportList } from '../hooks/useWeeklyReports';

const LazyTeamTab = React.lazy(() =>
  import('./WeeklyTeamPage').then(mod => ({ default: mod.WeeklyTeamPage })),
);

const STATE_COLORS: Record<ReportState, 'blue' | 'green' | 'grey' | 'orange'> = {
  DRAFT: 'blue',
  FINALIZED: 'orange',
  REVIEW: 'grey',
  SENT: 'green',
};

const formatDate = (dateStr: string | null | undefined): string => {
  if (!dateStr) return '\u2014';
  return new Date(dateStr).toLocaleDateString();
};

type ReportsTabProps = {
  pollStatus: ReturnType<typeof useWeeklyPollStatus>;
};

const ReportsTab = ({ pollStatus }: ReportsTabProps) => {
  const navigate = useNavigate();
  const { data: reports, error, isLoading } = useWeeklyReportList();

  if (isLoading) {
    return (
      <div className="app-page-spinner">
        <Spinner aria-label="Loading reports" />
      </div>
    );
  }

  if (error) {
    return (
      <EmptyState
        headingLevel="h3"
        icon={ExclamationTriangleIcon}
        titleText="Error loading reports"
      >
        <EmptyStateBody>{error.message}</EmptyStateBody>
      </EmptyState>
    );
  }

  const isRunning = pollStatus.status.status === 'running' || pollStatus.isStarting;

  return (
    <>
      <PollProgress status={pollStatus.status} />

      {!reports?.length && !isRunning ? (
        <EmptyState headingLevel="h3" icon={CubesIcon} titleText="No team reports">
          <EmptyStateBody>
            Generate a report to see your team&apos;s activity across GitHub, GitLab, and Jira.
          </EmptyStateBody>
          <EmptyStateFooter>
            <EmptyStateActions>
              <GenerateReportButton />
            </EmptyStateActions>
          </EmptyStateFooter>
        </EmptyState>
      ) : (
        <Table aria-label="Team reports" variant="compact">
          <Thead>
            <Tr>
              <Th>Component</Th>
              <Th>Date Range</Th>
              <Th>Week ID</Th>
              <Th>State</Th>
              <Th>Sent</Th>
            </Tr>
          </Thead>
          <Tbody>
            {(reports ?? []).map(report => (
              <Tr
                isClickable
                key={`${report.weekId}-${report.component ?? ''}`}
                onRowClick={() =>
                  navigate(`/report/${encodeURIComponent(report.component ?? '')}/${report.weekId}`)
                }
              >
                <Td dataLabel="Component">{report.component || 'All'}</Td>
                <Td dataLabel="Date Range">
                  {report.weekStart} &ndash; {report.weekEnd}
                </Td>
                <Td dataLabel="Week ID">{report.weekId}</Td>
                <Td dataLabel="State">
                  <Label color={STATE_COLORS[report.state]}>{report.state}</Label>
                </Td>
                <Td dataLabel="Sent">{formatDate(report.sentAt)}</Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      )}
    </>
  );
};

export const WeeklyDashboardPage = () => {
  const [activeTab, setActiveTab] = useState(0);
  const pollStatus = useWeeklyPollStatus();

  useEffect(() => {
    document.title = 'Team Report | CNV Console Monitor';
  }, []);

  return (
    <>
      <PageSection>
        <Flex
          alignItems={{ default: 'alignItemsCenter' }}
          justifyContent={{ default: 'justifyContentSpaceBetween' }}
        >
          <FlexItem>
            <Content component="h1">Team Report</Content>
          </FlexItem>
          <FlexItem>
            <GenerateReportButton pollStatusOverride={pollStatus} />
          </FlexItem>
        </Flex>
      </PageSection>

      <PageSection isFilled>
        <Tabs
          activeKey={activeTab}
          className="app-w-full"
          onSelect={(_e, key) => setActiveTab(Number(key))}
        >
          <Tab eventKey={0} title={<TabTitleText>Reports</TabTitleText>}>
            <div className="app-mt-md">
              <ReportsTab pollStatus={pollStatus} />
            </div>
          </Tab>
          <Tab eventKey={1} title={<TabTitleText>Team</TabTitleText>}>
            <div className="app-mt-md">
              <React.Suspense fallback={<Spinner aria-label="Loading team" />}>
                <LazyTeamTab />
              </React.Suspense>
            </div>
          </Tab>
        </Tabs>
      </PageSection>
    </>
  );
};
