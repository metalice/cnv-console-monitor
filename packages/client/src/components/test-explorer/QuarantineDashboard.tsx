import React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Card,
  CardBody,
  CardTitle,
  CardHeader,
  Flex,
  FlexItem,
  Label,
  Spinner,
  Tabs,
  Tab,
  TabTitleText,
  EmptyState,
  EmptyStateBody,
  Content,
  ExpandableSection,
  Gallery,
  GalleryItem,
} from '@patternfly/react-core';
import { BanIcon, CheckCircleIcon, ClockIcon, LightbulbIcon } from '@patternfly/react-icons';
import { Table, Thead, Tr, Th, Tbody, Td } from '@patternfly/react-table';
type QuarantineRow = {
  id: string;
  test_name?: string;
  testName?: string;
  component?: string | null;
  status: string;
  quarantined_at?: string;
  quarantinedAt?: string;
  sla_deadline?: string;
  slaDeadline?: string;
  jira_key?: string | null;
  jiraKey?: string | null;
  skip_pr_url?: string | null;
  skipPrUrl?: string | null;
};
import { fetchQuarantines, fetchQuarantineStats } from '../../api/quarantine';
import { TimeAgo } from '../common/TimeAgo';

interface QuarantineDashboardProps {
  onSelect?: (quarantine: QuarantineRow) => void;
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

const statusIcon = (status: string) => {
  switch (status) {
    case 'active': return <BanIcon />;
    case 'overdue': return <ClockIcon />;
    case 'proposed': return <LightbulbIcon />;
    case 'resolved': return <CheckCircleIcon />;
    default: return undefined;
  }
};

export const QuarantineDashboard: React.FC<QuarantineDashboardProps> = ({ onSelect }) => {
  const [activeTab, setActiveTab] = React.useState('active');
  const [expanded, setExpanded] = React.useState(true);

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

  const totalActive = (stats?.active ?? 0) + (stats?.overdue ?? 0);

  return (
    <ExpandableSection
      toggleContent={
        <Flex spaceItems={{ default: 'spaceItemsSm' }} alignItems={{ default: 'alignItemsCenter' }}>
          <FlexItem><strong>Quarantine Dashboard</strong></FlexItem>
          {totalActive > 0 && <FlexItem><Label color="orange" isCompact>{totalActive} active</Label></FlexItem>}
        </Flex>
      }
      isExpanded={expanded}
      onToggle={(_e, val) => setExpanded(val)}
    >
      <Card>
        <CardBody>
          {stats && (
            <Flex spaceItems={{ default: 'spaceItemsMd' }} className="app-mb-md">
              <FlexItem><Label color="blue" icon={<BanIcon />}>Active: {stats.active}</Label></FlexItem>
              <FlexItem><Label color="red" icon={<ClockIcon />}>Overdue: {stats.overdue}</Label></FlexItem>
              <FlexItem><Label color="orange" icon={<LightbulbIcon />}>Proposed: {stats.proposed}</Label></FlexItem>
              <FlexItem><Label color="green" icon={<CheckCircleIcon />}>Resolved (30d): {stats.resolvedLast30d}</Label></FlexItem>
              {stats.avgDurationDays > 0 && <FlexItem><Label isCompact>Avg duration: {Math.round(stats.avgDurationDays)}d</Label></FlexItem>}
            </Flex>
          )}

          <Tabs activeKey={activeTab} onSelect={(_e, key) => setActiveTab(key as string)} isBox>
            <Tab eventKey="active" title={<TabTitleText>Active{stats?.active ? ` (${stats.active})` : ''}</TabTitleText>} />
            <Tab eventKey="overdue" title={<TabTitleText>Overdue{stats?.overdue ? ` (${stats.overdue})` : ''}</TabTitleText>} />
            <Tab eventKey="proposed" title={<TabTitleText>Proposed{stats?.proposed ? ` (${stats.proposed})` : ''}</TabTitleText>} />
            <Tab eventKey="resolved" title={<TabTitleText>Resolved</TabTitleText>} />
            <Tab eventKey="all" title={<TabTitleText>All</TabTitleText>} />
          </Tabs>

          {isLoading ? (
            <div className="app-page-spinner"><Spinner /></div>
          ) : data?.items && data.items.length > 0 ? (
            <Table variant="compact" className="app-mt-md">
              <Thead>
                <Tr>
                  <Th width={30}>Test Name</Th>
                  <Th width={15}>Component</Th>
                  <Th width={10}>Status</Th>
                  <Th width={10}>Since</Th>
                  <Th width={10}>SLA</Th>
                  <Th width={10}>Jira</Th>
                  <Th width={10}>PR</Th>
                </Tr>
              </Thead>
              <Tbody>
              {data.items.map((q: QuarantineRow) => {
                const name = q.test_name || q.testName || '';
                const since = q.quarantined_at || q.quarantinedAt || '';
                const deadline = q.sla_deadline || q.slaDeadline || '';
                const jira = q.jira_key || q.jiraKey || null;
                const prUrl = q.skip_pr_url || q.skipPrUrl || null;
                const slaDaysLeft = deadline ? Math.ceil((new Date(deadline).getTime() - Date.now()) / 86400000) : null;
                return (
                  <Tr key={q.id} isClickable onRowClick={() => onSelect?.(q)} isSelectable>
                    <Td dataLabel="Test Name" className="app-text-mono app-text-sm">{name.split('/').pop() || name.split('.').pop() || name}</Td>
                    <Td dataLabel="Component">{q.component || '-'}</Td>
                    <Td dataLabel="Status"><Label color={statusColor(q.status)} icon={statusIcon(q.status)} isCompact>{q.status}</Label></Td>
                    <Td dataLabel="Since">{since ? <TimeAgo timestamp={new Date(since).getTime()} /> : '-'}</Td>
                    <Td dataLabel="SLA">
                      {slaDaysLeft !== null && (
                        <Label color={slaDaysLeft < 0 ? 'red' : slaDaysLeft < 3 ? 'orange' : 'grey'} isCompact>
                          {slaDaysLeft < 0 ? `${Math.abs(slaDaysLeft)}d overdue` : `${slaDaysLeft}d left`}
                        </Label>
                      )}
                    </Td>
                    <Td dataLabel="Jira">
                      {jira ? (
                        <Label color="blue" isCompact render={({ className, content }) => (
                          <a href={`https://issues.redhat.com/browse/${jira}`} target="_blank" rel="noreferrer" className={className}>{content}</a>
                        )}>{jira}</Label>
                      ) : '-'}
                    </Td>
                    <Td dataLabel="PR">
                      {prUrl ? (
                        <Label color="green" isCompact render={({ className, content }) => (
                          <a href={prUrl} target="_blank" rel="noreferrer" className={className}>{content}</a>
                        )}>PR</Label>
                      ) : '-'}
                    </Td>
                  </Tr>
                  );
                })}
              </Tbody>
            </Table>
          ) : (
            <EmptyState variant="sm" className="app-mt-lg">
              <EmptyStateBody>
                {activeTab === 'active' ? 'No tests are currently quarantined.'
                  : activeTab === 'overdue' ? 'No quarantines have exceeded their SLA.'
                  : activeTab === 'proposed' ? 'No AI-proposed quarantines pending review.'
                  : activeTab === 'resolved' ? 'No quarantines resolved in the last 30 days.'
                  : 'No quarantine records found.'}
              </EmptyStateBody>
            </EmptyState>
          )}
        </CardBody>
      </Card>
    </ExpandableSection>
  );
};
