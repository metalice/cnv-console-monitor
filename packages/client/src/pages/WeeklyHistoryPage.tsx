import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import { type ReportState } from '@cnv-monitor/shared';

import {
  Content,
  EmptyState,
  EmptyStateBody,
  Label,
  PageSection,
  Spinner,
} from '@patternfly/react-core';
import { CubesIcon, ExclamationTriangleIcon } from '@patternfly/react-icons';
import { Table, Tbody, Td, Th, Thead, Tr } from '@patternfly/react-table';

import { useWeeklyReportList } from '../hooks/useWeeklyReports';

const STATE_COLORS: Record<ReportState, 'blue' | 'orange' | 'green' | 'grey'> = {
  DRAFT: 'blue',
  FINALIZED: 'orange',
  REVIEW: 'grey',
  SENT: 'green',
};

const formatDate = (dateStr: string | null | undefined): string => {
  if (!dateStr) return '\u2014';
  return new Date(dateStr).toLocaleDateString();
};

export const WeeklyHistoryPage = () => {
  useEffect(() => {
    document.title = 'Weekly History | CNV Console Monitor';
  }, []);

  const navigate = useNavigate();
  const { data: reports, error, isLoading } = useWeeklyReportList();

  if (isLoading) {
    return (
      <div className="app-page-spinner">
        <Spinner aria-label="Loading weekly reports" />
      </div>
    );
  }

  if (error) {
    return (
      <PageSection>
        <EmptyState
          headingLevel="h2"
          icon={ExclamationTriangleIcon}
          titleText="Error loading reports"
        >
          <EmptyStateBody>{error.message}</EmptyStateBody>
        </EmptyState>
      </PageSection>
    );
  }

  return (
    <>
      <PageSection>
        <Content component="h1">Weekly Report History</Content>
        <Content component="small">
          {reports?.length ?? 0} report{reports?.length !== 1 ? 's' : ''}
        </Content>
      </PageSection>

      <PageSection>
        {!reports?.length ? (
          <EmptyState headingLevel="h2" icon={CubesIcon} titleText="No reports yet">
            <EmptyStateBody>
              Run a weekly poll from the Weekly Dashboard to generate your first report.
            </EmptyStateBody>
          </EmptyState>
        ) : (
          <Table aria-label="Weekly report history" variant="compact">
            <Thead>
              <Tr>
                <Th>Week ID</Th>
                <Th>Date Range</Th>
                <Th>Component</Th>
                <Th>State</Th>
                <Th>Sent</Th>
              </Tr>
            </Thead>
            <Tbody>
              {reports.map(report => (
                <Tr
                  isClickable
                  className="app-weekly-history-row"
                  key={report.weekId}
                  onRowClick={() => navigate(`/weekly/report/${report.weekId}`)}
                >
                  <Td dataLabel="Week ID">{report.weekId}</Td>
                  <Td dataLabel="Date Range">
                    {report.weekStart} &ndash; {report.weekEnd}
                  </Td>
                  <Td dataLabel="Component">{report.component ?? '\u2014'}</Td>
                  <Td dataLabel="State">
                    <Label color={STATE_COLORS[report.state]}>{report.state}</Label>
                  </Td>
                  <Td dataLabel="Sent">{formatDate(report.sentAt)}</Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        )}
      </PageSection>
    </>
  );
};
