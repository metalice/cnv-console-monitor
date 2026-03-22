import React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Card,
  CardBody,
  CardTitle,
  Flex,
  FlexItem,
  Label,
  Spinner,
  Tabs,
  Tab,
  TabTitleText,
} from '@patternfly/react-core';
import { Table, Thead, Tr, Th, Tbody, Td } from '@patternfly/react-table';
import type { QuarantineRecord } from '@cnv-monitor/shared';
import { fetchQuarantines, fetchQuarantineStats } from '../../api/quarantine';
import { TimeAgo } from '../common/TimeAgo';

interface QuarantineDashboardProps {
  onSelect?: (quarantine: QuarantineRecord) => void;
}

const statusColor = (status: string): 'red' | 'orange' | 'blue' | 'green' | 'grey' => {
  switch (status) {
    case 'active': return 'blue';
    case 'overdue': return 'red';
    case 'proposed': return 'orange';
    case 'resolved': return 'green';
    case 'expired': return 'grey';
    default: return 'grey';
  }
};

export const QuarantineDashboard: React.FC<QuarantineDashboardProps> = ({ onSelect }) => {
  const [activeTab, setActiveTab] = React.useState('active');

  const { data: stats } = useQuery({
    queryKey: ['quarantineStats'],
    queryFn: fetchQuarantineStats,
    staleTime: 30_000,
  });

  const { data, isLoading } = useQuery({
    queryKey: ['quarantines', activeTab],
    queryFn: () => fetchQuarantines({ status: activeTab === 'all' ? undefined : activeTab, limit: 50 }),
    staleTime: 30_000,
  });

  return (
    <Card>
      <CardTitle>
        <Flex>
          <FlexItem>Quarantine Dashboard</FlexItem>
          {stats && (
            <FlexItem>
              <Flex spaceItems={{ default: 'spaceItemsSm' }}>
                <Label color="blue">Active: {stats.active}</Label>
                <Label color="red">Overdue: {stats.overdue}</Label>
                <Label color="orange">Proposed: {stats.proposed}</Label>
                <Label color="green">Resolved (30d): {stats.resolvedLast30d}</Label>
              </Flex>
            </FlexItem>
          )}
        </Flex>
      </CardTitle>
      <CardBody>
        <Tabs activeKey={activeTab} onSelect={(_e, key) => setActiveTab(key as string)} isBox>
          <Tab eventKey="active" title={<TabTitleText>Active</TabTitleText>} />
          <Tab eventKey="overdue" title={<TabTitleText>Overdue</TabTitleText>} />
          <Tab eventKey="proposed" title={<TabTitleText>Proposed</TabTitleText>} />
          <Tab eventKey="resolved" title={<TabTitleText>Resolved</TabTitleText>} />
          <Tab eventKey="all" title={<TabTitleText>All</TabTitleText>} />
        </Tabs>

        {isLoading ? (
          <div className="app-page-spinner"><Spinner /></div>
        ) : (
          <Table variant="compact" className="app-mt-md">
            <Thead>
              <Tr>
                <Th>Test Name</Th>
                <Th>Component</Th>
                <Th>Status</Th>
                <Th>Since</Th>
                <Th>SLA</Th>
                <Th>Jira</Th>
                <Th>PR</Th>
              </Tr>
            </Thead>
            <Tbody>
              {data?.items.map((q: QuarantineRecord) => {
                const slaDaysLeft = q.slaDeadline ? Math.ceil((new Date(q.slaDeadline).getTime() - Date.now()) / 86400000) : null;
                return (
                  <Tr key={q.id} isClickable onRowClick={() => onSelect?.(q)} isSelectable>
                    <Td dataLabel="Test Name" className="app-text-mono">{q.testName.split('.').pop()}</Td>
                    <Td dataLabel="Component">{q.component || '-'}</Td>
                    <Td dataLabel="Status"><Label color={statusColor(q.status)}>{q.status}</Label></Td>
                    <Td dataLabel="Since"><TimeAgo timestamp={new Date(q.quarantinedAt).getTime()} /></Td>
                    <Td dataLabel="SLA">
                      {slaDaysLeft !== null && (
                        <Label color={slaDaysLeft < 0 ? 'red' : slaDaysLeft < 3 ? 'orange' : 'grey'}>
                          {slaDaysLeft < 0 ? `${Math.abs(slaDaysLeft)}d overdue` : `${slaDaysLeft}d left`}
                        </Label>
                      )}
                    </Td>
                    <Td dataLabel="Jira">{q.jiraKey || '-'}</Td>
                    <Td dataLabel="PR">{q.skipPrUrl ? <Label color="green">Created</Label> : '-'}</Td>
                  </Tr>
                );
              })}
              {(!data?.items || data.items.length === 0) && (
                <Tr><Td colSpan={7}><em>No quarantines found</em></Td></Tr>
              )}
            </Tbody>
          </Table>
        )}
      </CardBody>
    </Card>
  );
};
