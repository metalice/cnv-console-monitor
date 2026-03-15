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
  Button,
  Flex,
  FlexItem,
  Tooltip,
} from '@patternfly/react-core';
import { Table, Thead, Tr, Th, Tbody, Td } from '@patternfly/react-table';
import { ExternalLinkAltIcon, CheckCircleIcon } from '@patternfly/react-icons';
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
    action.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

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
          <GridItem span={4}>
            <Card isFullHeight>
              <CardTitle>
                <Flex justifyContent={{ default: 'justifyContentSpaceBetween' }} alignItems={{ default: 'alignItemsCenter' }}>
                  <FlexItem>My Components</FlexItem>
                  {data.untriagedInMyComponents > 0 && (
                    <FlexItem>
                      <Label color="red" isCompact>{data.untriagedInMyComponents} untriaged</Label>
                    </FlexItem>
                  )}
                </Flex>
              </CardTitle>
              <CardBody>
                {data.myComponents.length === 0 ? (
                  <EmptyState headingLevel="h4" titleText="No components">
                    <EmptyStateBody>
                      Subscribe to components in <Button variant="link" isInline onClick={() => navigate('/settings')}>Settings</Button> to see them here.
                    </EmptyStateBody>
                  </EmptyState>
                ) : (
                  <Flex spaceItems={{ default: 'spaceItemsSm' }} flexWrap={{ default: 'wrap' }}>
                    {data.myComponents.map(c => (
                      <FlexItem key={c}>
                        <Label isCompact>{c}</Label>
                      </FlexItem>
                    ))}
                  </Flex>
                )}
              </CardBody>
            </Card>
          </GridItem>

          <GridItem span={8}>
            <Card isFullHeight>
              <CardTitle>Suggested Work</CardTitle>
              <CardBody>
                {data.suggestedWork.length === 0 ? (
                  <EmptyState icon={CheckCircleIcon} headingLevel="h4" titleText="All clear!">
                    <EmptyStateBody>No untriaged items in your components.</EmptyStateBody>
                  </EmptyState>
                ) : (
                  <Table aria-label="Suggested work" variant="compact">
                    <Thead>
                      <Tr>
                        <Th>Test Name</Th>
                        <Th width={15}>Occurrences</Th>
                        <Th width={20}>Consecutive Failures</Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {data.suggestedWork.map(item => (
                        <Tr key={item.unique_id}>
                          <Td dataLabel="Test Name" className="app-cell-truncate">
                            <Tooltip content={item.name}>
                              <Button variant="link" isInline size="sm" onClick={() => navigate(`/test/${encodeURIComponent(item.unique_id)}`)}>
                                {shortTestName(item.name)}
                              </Button>
                            </Tooltip>
                          </Td>
                          <Td dataLabel="Occurrences" className="app-cell-nowrap">
                            <strong>{item.occurrences}</strong>
                          </Td>
                          <Td dataLabel="Consecutive Failures" className="app-cell-nowrap">
                            {item.consecutiveFailures || '—'}
                          </Td>
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

      <PageSection>
        <Grid hasGutter>
          <GridItem span={6}>
            <Card isFullHeight>
              <CardTitle>My Recent Activity</CardTitle>
              <CardBody>
                {data.myRecentActivity.length === 0 ? (
                  <EmptyState headingLevel="h4" titleText="No activity yet">
                    <EmptyStateBody>Your triage actions will appear here.</EmptyStateBody>
                  </EmptyState>
                ) : (
                  <Table aria-label="My recent activity" variant="compact">
                    <Thead>
                      <Tr>
                        <Th>Action</Th>
                        <Th>Test</Th>
                        <Th>Value</Th>
                        <Th width={20}>When</Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {data.myRecentActivity.map((a, i) => (
                        <Tr key={i}>
                          <Td dataLabel="Action" className="app-cell-nowrap">
                            <Label isCompact>{formatAction(a.action)}</Label>
                          </Td>
                          <Td dataLabel="Test" className="app-cell-truncate">
                            <Tooltip content={a.test_name || '—'}>
                              <span>{shortTestName(a.test_name)}</span>
                            </Tooltip>
                          </Td>
                          <Td dataLabel="Value" className="app-cell-nowrap">{a.new_value || '—'}</Td>
                          <Td dataLabel="When" className="app-cell-nowrap">{new Date(a.performed_at).toLocaleDateString()}</Td>
                        </Tr>
                      ))}
                    </Tbody>
                  </Table>
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
