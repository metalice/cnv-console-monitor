import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  PageSection,
  Content,
  Card,
  CardBody,
  CardTitle,
  Breadcrumb,
  BreadcrumbItem,
  Label,
  Flex,
  FlexItem,
  Grid,
  GridItem,
  Spinner,
  Tooltip,
  DescriptionList,
  DescriptionListGroup,
  DescriptionListTerm,
  DescriptionListDescription,
  EmptyState,
  EmptyStateBody,
  Button,
} from '@patternfly/react-core';
import { Table, Thead, Tr, Th, Tbody, Td } from '@patternfly/react-table';
import { ExternalLinkAltIcon, WrenchIcon, BugIcon, LinkIcon } from '@patternfly/react-icons';
import type { PublicConfig } from '@cnv-monitor/shared';
import { apiFetch } from '../api/client';
import { fetchTestProfile, type TestProfile } from '../api/testProfile';
import { StatusBadge } from '../components/common/StatusBadge';
import { TriageModal } from '../components/modals/TriageModal';
import { JiraCreateModal } from '../components/modals/JiraCreateModal';
import { JiraLinkModal } from '../components/modals/JiraLinkModal';

function streakBar(statuses: string[]): React.ReactNode {
  return (
    <Flex spaceItems={{ default: 'spaceItemsNone' }}>
      {statuses.map((s, i) => (
        <FlexItem key={i}>
          <Tooltip content={s}>
            <div style={{
              width: 18, height: 18, borderRadius: 3, margin: 1,
              background: s === 'FAILED' ? 'var(--pf-t--global--color--status--danger--default)' : 'var(--pf-t--global--color--status--success--default)',
            }} />
          </Tooltip>
        </FlexItem>
      ))}
    </Flex>
  );
}

export const TestProfilePage: React.FC = () => {
  const { uniqueId } = useParams<{ uniqueId: string }>();
  const navigate = useNavigate();
  const [triageItem, setTriageItem] = useState<number[] | null>(null);
  const [jiraCreateName, setJiraCreateName] = useState<{ rpId: number; name: string; polarionId?: string } | null>(null);
  const [jiraLinkItem, setJiraLinkItem] = useState<number | null>(null);

  const { data: config } = useQuery({
    queryKey: ['config'],
    queryFn: () => apiFetch<PublicConfig>('/config'),
    staleTime: Infinity,
  });

  const { data: profile, isLoading } = useQuery<TestProfile>({
    queryKey: ['testProfile', uniqueId],
    queryFn: () => fetchTestProfile(uniqueId!),
    enabled: !!uniqueId,
  });

  useEffect(() => {
    if (profile) document.title = `${profile.identity.name.split('.').pop() || profile.identity.name} | CNV Console Monitor`;
    else document.title = 'Test Profile | CNV Console Monitor';
  }, [profile]);

  const shortName = useMemo(() => {
    if (!profile) return '';
    return profile.identity.name.split('.').pop() || profile.identity.name;
  }, [profile]);

  const latestFailedRpId = useMemo(() => {
    if (!profile?.history.length) return null;
    const failed = profile.history.find(h => h.status === 'FAILED');
    return failed?.rp_id ?? null;
  }, [profile]);

  if (isLoading || !profile) {
    return <PageSection isFilled><Spinner aria-label="Loading test profile" /></PageSection>;
  }

  const { identity, streak, history, affectedLaunches, triageHistory } = profile;

  return (
    <>
      <PageSection>
        <Breadcrumb style={{ marginBottom: 16 }}>
          <BreadcrumbItem onClick={() => navigate('/failures')} style={{ cursor: 'pointer' }}>Failures</BreadcrumbItem>
          <BreadcrumbItem isActive>{shortName}</BreadcrumbItem>
        </Breadcrumb>
        <Content component="h1">{shortName}</Content>
        <Content component="small" className="app-text-muted" style={{ wordBreak: 'break-all' }}>{identity.name}</Content>
      </PageSection>

      <PageSection>
        <Grid hasGutter>
          {/* Identity + Streak card */}
          <GridItem span={12} md={4}>
            <Card>
              <CardTitle>Test Identity</CardTitle>
              <CardBody>
                <DescriptionList isCompact>
                  {identity.polarionId && (
                    <DescriptionListGroup>
                      <DescriptionListTerm>Polarion</DescriptionListTerm>
                      <DescriptionListDescription>
                        <Label color="blue" isCompact>
                          {config?.polarionUrl ? (
                            <a href={`${config.polarionUrl}${identity.polarionId}`} target="_blank" rel="noreferrer">{identity.polarionId}</a>
                          ) : identity.polarionId}
                        </Label>
                      </DescriptionListDescription>
                    </DescriptionListGroup>
                  )}
                  {identity.component && (
                    <DescriptionListGroup>
                      <DescriptionListTerm>Component</DescriptionListTerm>
                      <DescriptionListDescription><Label color="grey" isCompact>{identity.component}</Label></DescriptionListDescription>
                    </DescriptionListGroup>
                  )}
                  {identity.jiraKeys.length > 0 && (
                    <DescriptionListGroup>
                      <DescriptionListTerm>Jira Issues</DescriptionListTerm>
                      <DescriptionListDescription>
                        <Flex spaceItems={{ default: 'spaceItemsXs' }}>
                          {identity.jiraKeys.map(key => (
                            <FlexItem key={key}>
                              <Label color="blue" isCompact>
                                {config?.jiraUrl ? (
                                  <a href={`${config.jiraUrl}/browse/${key}`} target="_blank" rel="noreferrer">{key}</a>
                                ) : key}
                              </Label>
                            </FlexItem>
                          ))}
                        </Flex>
                      </DescriptionListDescription>
                    </DescriptionListGroup>
                  )}
                </DescriptionList>

                <Flex style={{ marginTop: 16 }} spaceItems={{ default: 'spaceItemsXs' }}>
                  {latestFailedRpId && (
                    <>
                      <FlexItem><Button variant="secondary" size="sm" icon={<WrenchIcon />} onClick={() => setTriageItem([latestFailedRpId])}>Classify</Button></FlexItem>
                      <FlexItem><Button variant="secondary" size="sm" icon={<BugIcon />} onClick={() => setJiraCreateName({ rpId: latestFailedRpId, name: identity.name, polarionId: identity.polarionId ?? undefined })}>Bug</Button></FlexItem>
                      <FlexItem><Button variant="secondary" size="sm" icon={<LinkIcon />} onClick={() => setJiraLinkItem(latestFailedRpId)}>Link Jira</Button></FlexItem>
                    </>
                  )}
                </Flex>
              </CardBody>
            </Card>
          </GridItem>

          {/* Streak card */}
          <GridItem span={12} md={8}>
            <Card>
              <CardTitle>Failure Streak</CardTitle>
              <CardBody>
                <Grid hasGutter>
                  <GridItem span={3}>
                    <Content component="h2" style={{ textAlign: 'center', color: streak.consecutiveFailures > 0 ? 'var(--pf-t--global--color--status--danger--default)' : 'var(--pf-t--global--color--status--success--default)' }}>
                      {streak.consecutiveFailures}/{streak.totalRuns}
                    </Content>
                    <Content component="small" style={{ textAlign: 'center', display: 'block' }}>Consecutive Failures</Content>
                  </GridItem>
                  <GridItem span={3}>
                    <Content component="h2" style={{ textAlign: 'center' }}>
                      {streak.lastPassDate ?? 'Never'}
                    </Content>
                    <Content component="small" style={{ textAlign: 'center', display: 'block' }}>Last Passed</Content>
                  </GridItem>
                  <GridItem span={6}>
                    <Content component="small" style={{ marginBottom: 4 }}>Recent Runs (latest first)</Content>
                    {streakBar(streak.recentStatuses)}
                  </GridItem>
                </Grid>
              </CardBody>
            </Card>
          </GridItem>

          {/* Run History */}
          <GridItem span={12}>
            <Card>
              <CardTitle>Run History ({history.length} runs)</CardTitle>
              <CardBody>
                {history.length === 0 ? (
                  <EmptyState><EmptyStateBody>No run history available.</EmptyStateBody></EmptyState>
                ) : (
                  <div className="app-table-scroll">
                  <Table aria-label="Run history" variant="compact">
                    <Thead>
                      <Tr>
                        <Th>Date</Th>
                        <Th>Status</Th>
                        <Th>Defect Type</Th>
                        <Th>Error</Th>
                        <Th>Launch</Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {history.map((item) => (
                        <Tr key={item.rp_id}>
                          <Td className="app-cell-nowrap">{item.start_time ? new Date(item.start_time).toLocaleString() : '--'}</Td>
                          <Td className="app-cell-nowrap"><StatusBadge status={item.status} /></Td>
                          <Td className="app-cell-nowrap">{item.defect_type ? <Label isCompact>{item.defect_type}</Label> : '--'}</Td>
                          <Td className="app-cell-truncate">
                            {item.error_message ? (
                              <Tooltip content={item.error_message}><span>{item.error_message.split('\n')[0]}</span></Tooltip>
                            ) : '--'}
                          </Td>
                          <Td className="app-cell-nowrap">
                            <Button variant="link" isInline size="sm" onClick={() => navigate(`/launch/${item.launch_rp_id}`)}>
                              #{item.launch_rp_id}
                            </Button>
                          </Td>
                        </Tr>
                      ))}
                    </Tbody>
                  </Table>
                  </div>
                )}
              </CardBody>
            </Card>
          </GridItem>

          {/* Affected Launches */}
          <GridItem span={12} md={6}>
            <Card>
              <CardTitle>Affected Launches ({affectedLaunches.length})</CardTitle>
              <CardBody>
                {affectedLaunches.length === 0 ? (
                  <EmptyState><EmptyStateBody>No launches found.</EmptyStateBody></EmptyState>
                ) : (
                  <div className="app-table-scroll">
                  <Table aria-label="Affected launches" variant="compact">
                    <Thead>
                      <Tr>
                        <Th>Version</Th>
                        <Th>Tier</Th>
                        <Th>Cluster</Th>
                        <Th>Date</Th>
                        <Th>Link</Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {affectedLaunches.map((l) => (
                        <Tr key={l.rp_id}>
                          <Td className="app-cell-nowrap">{l.cnv_version ?? '--'}</Td>
                          <Td className="app-cell-nowrap">{l.tier ?? '--'}</Td>
                          <Td className="app-cell-truncate"><Tooltip content={l.cluster_name || '--'}><span>{l.cluster_name ?? '--'}</span></Tooltip></Td>
                          <Td className="app-cell-nowrap">{new Date(l.start_time).toLocaleDateString()}</Td>
                          <Td className="app-cell-nowrap">
                            <Button variant="link" isInline size="sm" onClick={() => navigate(`/launch/${l.rp_id}`)}>View</Button>
                          </Td>
                        </Tr>
                      ))}
                    </Tbody>
                  </Table>
                  </div>
                )}
              </CardBody>
            </Card>
          </GridItem>

          {/* Triage History */}
          <GridItem span={12} md={6}>
            <Card>
              <CardTitle>Triage History ({triageHistory.length})</CardTitle>
              <CardBody>
                {triageHistory.length === 0 ? (
                  <EmptyState><EmptyStateBody>No triage actions recorded.</EmptyStateBody></EmptyState>
                ) : (
                  <div className="app-table-scroll">
                  <Table aria-label="Triage history" variant="compact">
                    <Thead>
                      <Tr>
                        <Th>Date</Th>
                        <Th>Action</Th>
                        <Th>Change</Th>
                        <Th>By</Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {triageHistory.map((t, i) => (
                        <Tr key={i}>
                          <Td className="app-cell-nowrap">{new Date(t.performed_at).toLocaleString()}</Td>
                          <Td className="app-cell-nowrap"><Label isCompact>{t.action}</Label></Td>
                          <Td className="app-cell-truncate">
                            <Tooltip content={t.old_value && t.new_value ? `${t.old_value} → ${t.new_value}` : t.new_value || '--'}>
                              <span>{t.old_value && t.new_value ? `${t.old_value} → ${t.new_value}` : t.new_value || '--'}</span>
                            </Tooltip>
                          </Td>
                          <Td className="app-cell-nowrap">{t.performed_by ?? '--'}</Td>
                        </Tr>
                      ))}
                    </Tbody>
                  </Table>
                  </div>
                )}
              </CardBody>
            </Card>
          </GridItem>
        </Grid>
      </PageSection>

      {triageItem && <TriageModal isOpen onClose={() => setTriageItem(null)} itemIds={triageItem} />}
      {jiraCreateName && (
        <JiraCreateModal isOpen onClose={() => setJiraCreateName(null)} testItemId={jiraCreateName.rpId} testName={jiraCreateName.name} polarionId={jiraCreateName.polarionId} />
      )}
      {jiraLinkItem && <JiraLinkModal isOpen onClose={() => setJiraLinkItem(null)} testItemId={jiraLinkItem} />}
    </>
  );
};
