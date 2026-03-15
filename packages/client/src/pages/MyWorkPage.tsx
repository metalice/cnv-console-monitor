import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  PageSection,
  Content,
  Card,
  CardTitle,
  CardBody,
  Grid,
  GridItem,
  Label,
  Spinner,
  EmptyState,
  EmptyStateBody,
  Tooltip,
  Flex,
  FlexItem,
} from '@patternfly/react-core';
import { Table, Thead, Tr, Th, Tbody, Td } from '@patternfly/react-table';
import { ExternalLinkAltIcon } from '@patternfly/react-icons';
import type { PublicConfig } from '@cnv-monitor/shared';
import { apiFetch } from '../api/client';
import { fetchMyWork } from '../api/myWork';
import { useAuth } from '../context/AuthContext';

export const MyWorkPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => { document.title = 'My Work | CNV Console Monitor'; }, []);

  const { data, isLoading } = useQuery({
    queryKey: ['myWork'],
    queryFn: fetchMyWork,
  });

  const { data: config } = useQuery({
    queryKey: ['config'],
    queryFn: () => apiFetch<PublicConfig>('/config'),
    staleTime: Infinity,
  });

  if (isLoading) {
    return (
      <PageSection>
        <Spinner aria-label="Loading my work" />
      </PageSection>
    );
  }

  if (!data) {
    return (
      <PageSection>
        <EmptyState headingLevel="h4" titleText="Unable to load data">
          <EmptyStateBody>Could not fetch your personalized work data.</EmptyStateBody>
        </EmptyState>
      </PageSection>
    );
  }

  const formatAction = (action: string): string =>
    action.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());

  const actionColor = (action: string): 'purple' | 'blue' | 'red' | 'orange' | 'green' | 'grey' => {
    switch (action) {
      case 'classify_defect':
      case 'bulk_classify_defect': return 'purple';
      case 'add_comment': return 'blue';
      case 'create_jira': return 'red';
      case 'link_jira': return 'orange';
      case 'acknowledge': return 'green';
      default: return 'grey';
    }
  };

  const shortTestName = (name: string | null): string => {
    if (!name) return '—';
    return name.split('.').pop() || name;
  };

  return (
    <>
      <PageSection>
        <Content component="h1">My Work</Content>
        <Content component="small">Personalized view for {user.name}</Content>
      </PageSection>

      <PageSection>
        <Grid hasGutter>
          <GridItem span={6}>
            <Card isFullHeight>
              <CardTitle>My Recent Activity</CardTitle>
              <CardBody>
                {data.myRecentActivity.length === 0 ? (
                  <EmptyState headingLevel="h4" titleText="No activity yet">
                    <EmptyStateBody>Your triage and acknowledgment actions will appear here.</EmptyStateBody>
                  </EmptyState>
                ) : (
                  <div style={{ maxHeight: 420, overflow: 'auto' }}>
                    {data.myRecentActivity.map((entry, index) => {
                      const isAck = entry.action === 'acknowledge';
                      const timeAgo = new Date(entry.performed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
                      const noteLines = entry.new_value ? entry.new_value.split('\n').filter((line: string) => line.trim()) : [];

                      return (
                        <div key={index} className="app-activity-item">
                          <Flex alignItems={{ default: 'alignItemsCenter' }} gap={{ default: 'gapSm' }}>
                            <FlexItem>
                              <Label isCompact color={actionColor(entry.action)}>{formatAction(entry.action)}</Label>
                            </FlexItem>
                            <FlexItem flex={{ default: 'flex_1' }}>
                              <Content component="small">
                                {isAck ? (
                                  'Acknowledged daily report'
                                ) : (
                                  <>
                                    <Tooltip content={entry.test_name || '—'}>
                                      <strong>{shortTestName(entry.test_name)}</strong>
                                    </Tooltip>
                                    {entry.new_value && (
                                      <span className="app-text-muted"> → {entry.new_value}</span>
                                    )}
                                  </>
                                )}
                              </Content>
                            </FlexItem>
                            <FlexItem>
                              <Content component="small" className="app-text-muted">{timeAgo}</Content>
                            </FlexItem>
                          </Flex>
                          {isAck && noteLines.length > 0 && (
                            <div className="app-activity-notes">
                              {noteLines.map((line: string, lineIdx: number) => (
                                <div key={lineIdx} className="app-activity-note-line">
                                  {line}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardBody>
            </Card>
          </GridItem>

          <GridItem span={6}>
            <Card isFullHeight>
              <CardTitle>My Jira Bugs</CardTitle>
              <CardBody>
                {data.myJiraBugs.length === 0 ? (
                  <EmptyState headingLevel="h4" titleText="No Jira bugs">
                    <EmptyStateBody>Jira issues you create will appear here.</EmptyStateBody>
                  </EmptyState>
                ) : (
                  <Table aria-label="My Jira bugs" variant="compact">
                    <Thead>
                      <Tr>
                        <Th>Jira Key</Th>
                        <Th>Test</Th>
                        <Th width={20}>Created</Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {data.myJiraBugs.map((bug, i) => (
                        <Tr key={i}>
                          <Td dataLabel="Jira Key" className="app-cell-nowrap">
                            {config?.jiraUrl ? (
                              <a href={`${config.jiraUrl}/browse/${bug.jira_key}`} target="_blank" rel="noreferrer">
                                {bug.jira_key} <ExternalLinkAltIcon className="app-text-xs" />
                              </a>
                            ) : (
                              bug.jira_key
                            )}
                          </Td>
                          <Td dataLabel="Test" className="app-cell-truncate">
                            <Tooltip content={bug.test_name || '—'}>
                              <span>{shortTestName(bug.test_name)}</span>
                            </Tooltip>
                          </Td>
                          <Td dataLabel="Created" className="app-cell-nowrap">{new Date(bug.created_at).toLocaleDateString()}</Td>
                        </Tr>
                      ))}
                    </Tbody>
                  </Table>
                )}
              </CardBody>
            </Card>
          </GridItem>
        </Grid>
      </PageSection>
    </>
  );
};
