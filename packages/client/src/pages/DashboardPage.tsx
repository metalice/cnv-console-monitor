import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  PageSection,
  Content,
  Card,
  CardBody,
  Gallery,
  GalleryItem,
  Flex,
  FlexItem,
  Button,
  Toolbar,
  ToolbarContent,
  ToolbarItem,
} from '@patternfly/react-core';
import { Table, Thead, Tr, Th, Tbody, Td } from '@patternfly/react-table';
import { SyncAltIcon } from '@patternfly/react-icons';
import { fetchReport } from '../api/launches';
import { StatusBadge } from '../components/common/StatusBadge';
import { PassRateBar } from '../components/common/PassRateBar';
import { TimeAgo } from '../components/common/TimeAgo';
import { HealthBanner } from '../components/common/HealthBanner';
import { AckBanner } from '../components/common/AckBanner';
import { ExportButton } from '../components/common/ExportButton';
import { AcknowledgeModal } from '../components/modals/AcknowledgeModal';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [ackModalOpen, setAckModalOpen] = useState(false);

  const { data: report, isLoading, refetch } = useQuery({
    queryKey: ['report'],
    queryFn: () => fetchReport(24),
  });

  if (isLoading || !report) {
    return (
      <PageSection>
        <Content component="h1">Loading...</Content>
      </PageSection>
    );
  }

  return (
    <>
      <PageSection variant="light">
        <Flex justifyContent={{ default: 'justifyContentSpaceBetween' }} alignItems={{ default: 'alignItemsCenter' }}>
          <FlexItem>
            <Content component="h1">Dashboard</Content>
            <Content component="small">{report.date}</Content>
          </FlexItem>
          <FlexItem>
            <Flex>
              <FlexItem>
                <ExportButton groups={report.groups} date={report.date} />
              </FlexItem>
              <FlexItem>
                <Button variant="secondary" icon={<SyncAltIcon />} onClick={() => refetch()}>
                  Refresh
                </Button>
              </FlexItem>
            </Flex>
          </FlexItem>
        </Flex>
      </PageSection>

      <PageSection>
        <AckBanner onAcknowledge={() => setAckModalOpen(true)} />
        <HealthBanner
          health={report.overallHealth}
          passed={report.passedLaunches}
          failed={report.failedLaunches}
          inProgress={report.inProgressLaunches}
        />

        <Gallery hasGutter minWidths={{ default: '150px' }} style={{ marginBottom: 24 }}>
          <GalleryItem>
            <Card isCompact>
              <CardBody>
                <Content component="h2" style={{ textAlign: 'center' }}>{report.totalLaunches}</Content>
                <Content component="small" style={{ textAlign: 'center', display: 'block' }}>Total</Content>
              </CardBody>
            </Card>
          </GalleryItem>
          <GalleryItem>
            <Card isCompact>
              <CardBody>
                <Content component="h2" style={{ textAlign: 'center', color: 'var(--pf-t--global--color--status--success--default)' }}>{report.passedLaunches}</Content>
                <Content component="small" style={{ textAlign: 'center', display: 'block' }}>Passed</Content>
              </CardBody>
            </Card>
          </GalleryItem>
          <GalleryItem>
            <Card isCompact>
              <CardBody>
                <Content component="h2" style={{ textAlign: 'center', color: 'var(--pf-t--global--color--status--danger--default)' }}>{report.failedLaunches}</Content>
                <Content component="small" style={{ textAlign: 'center', display: 'block' }}>Failed</Content>
              </CardBody>
            </Card>
          </GalleryItem>
          <GalleryItem>
            <Card isCompact>
              <CardBody>
                <Content component="h2" style={{ textAlign: 'center', color: 'var(--pf-t--global--color--status--warning--default)' }}>{report.inProgressLaunches}</Content>
                <Content component="small" style={{ textAlign: 'center', display: 'block' }}>In Progress</Content>
              </CardBody>
            </Card>
          </GalleryItem>
          <GalleryItem>
            <Card isCompact>
              <CardBody>
                <Content component="h2" style={{ textAlign: 'center', color: 'var(--pf-t--global--color--status--danger--default)' }}>{report.newFailures.length}</Content>
                <Content component="small" style={{ textAlign: 'center', display: 'block' }}>New Failures</Content>
              </CardBody>
            </Card>
          </GalleryItem>
        </Gallery>

        <Card>
          <CardBody>
            <Table aria-label="Launch status table">
              <Thead>
                <Tr>
                  <Th>Version</Th>
                  <Th>Tier</Th>
                  <Th>Status</Th>
                  <Th>Pass Rate</Th>
                  <Th>Tests</Th>
                  <Th>Failed</Th>
                  <Th>Last Run</Th>
                </Tr>
              </Thead>
              <Tbody>
                {report.groups.map((g) => (
                  <Tr
                    key={`${g.cnvVersion}-${g.tier}`}
                    isClickable
                    onRowClick={() => navigate(`/launch/${g.latestLaunch.rp_id}`)}
                    style={{ cursor: 'pointer' }}
                  >
                    <Td dataLabel="Version"><strong>{g.cnvVersion}</strong></Td>
                    <Td dataLabel="Tier">{g.tier}</Td>
                    <Td dataLabel="Status"><StatusBadge status={g.latestLaunch.status} /></Td>
                    <Td dataLabel="Pass Rate"><PassRateBar rate={g.passRate} /></Td>
                    <Td dataLabel="Tests">{g.passedTests}/{g.totalTests}</Td>
                    <Td dataLabel="Failed">{g.failedTests}</Td>
                    <Td dataLabel="Last Run"><TimeAgo timestamp={g.latestLaunch.start_time} /></Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </CardBody>
        </Card>
      </PageSection>

      <AcknowledgeModal isOpen={ackModalOpen} onClose={() => setAckModalOpen(false)} />
    </>
  );
};
