import React, { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  PageSection,
  Content,
  Card,
  CardBody,
  CardTitle,
  Form,
  FormGroup,
  TextInput,
  FormSelect,
  FormSelectOption,
  Button,
  Alert,
  Grid,
  GridItem,
  DescriptionList,
  DescriptionListGroup,
  DescriptionListTerm,
  DescriptionListDescription,
  Label,
  Spinner,
  Flex,
  FlexItem,
} from '@patternfly/react-core';
import { CheckCircleIcon, ExclamationCircleIcon } from '@patternfly/react-icons';
import { fetchSettings, updateSettings, testEmail, testSlack, fetchLaunchNames, fetchJiraMeta } from '../api/settings';
import type { SettingsResponse } from '@cnv-monitor/shared';

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export const SettingsPage: React.FC = () => {
  useEffect(() => { document.title = 'Settings | CNV Console Monitor'; }, []);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({ queryKey: ['settings'], queryFn: fetchSettings });
  const { data: launchNames } = useQuery({ queryKey: ['launchNames'], queryFn: fetchLaunchNames, staleTime: 5 * 60 * 1000 });
  const { data: jiraMeta } = useQuery({ queryKey: ['jiraMeta'], queryFn: fetchJiraMeta, staleTime: 5 * 60 * 1000 });

  const [draft, setDraft] = useState<Record<string, string>>({});
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'danger'; text: string } | null>(null);
  const [testMessage, setTestMessage] = useState<{ type: 'success' | 'danger'; text: string } | null>(null);

  useEffect(() => {
    if (data?.settings) {
      const initial: Record<string, string> = {};
      for (const [key, v] of Object.entries(data.settings)) initial[key] = v.value;
      setDraft(initial);
    }
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: (patch: Record<string, string>) => updateSettings(patch),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      queryClient.invalidateQueries({ queryKey: ['config'] });
      setSaveMessage({ type: 'success', text: `Saved: ${result.updated.join(', ')}` });
      setTimeout(() => setSaveMessage(null), 4000);
    },
    onError: (err) => setSaveMessage({ type: 'danger', text: (err as Error).message }),
  });

  const emailTest = useMutation({
    mutationFn: testEmail,
    onSuccess: (r) => setTestMessage({ type: 'success', text: r.message }),
    onError: (e) => setTestMessage({ type: 'danger', text: (e as Error).message }),
  });

  const slackTest = useMutation({
    mutationFn: testSlack,
    onSuccess: (r) => setTestMessage({ type: 'success', text: r.message }),
    onError: (e) => setTestMessage({ type: 'danger', text: (e as Error).message }),
  });

  function val(key: string): string { return draft[key] ?? data?.settings[key]?.value ?? ''; }
  function set(key: string, value: string): void { setDraft(prev => ({ ...prev, [key]: value })); }
  function isDirty(key: string): boolean { return data?.settings[key] !== undefined && draft[key] !== data.settings[key].value; }
  function hasChanges(): boolean { return data ? Object.keys(draft).some(k => isDirty(k)) : false; }

  function saveAll(): void {
    if (!data) return;
    const changed: Record<string, string> = {};
    for (const key of Object.keys(draft)) { if (isDirty(key)) changed[key] = draft[key]; }
    if (Object.keys(changed).length > 0) saveMutation.mutate(changed);
  }

  function sourceLabel(key: string): React.ReactNode {
    const source = data?.settings[key]?.source;
    if (!source) return null;
    return <Label color={source === 'db' ? 'blue' : 'grey'} isCompact style={{ marginLeft: 8 }}>{source === 'db' ? 'Custom' : 'Default'}</Label>;
  }

  if (isLoading || !data) return <PageSection isFilled><Spinner aria-label="Loading settings" /></PageSection>;

  const sys = data.system;
  const launchFilterOptions = launchNames?.length ? [...new Set([val('dashboard.launchFilter'), ...launchNames])] : [val('dashboard.launchFilter')];
  const issueTypeOptions = jiraMeta?.issueTypes?.length ? jiraMeta.issueTypes : ['Bug', 'Task', 'Story'];
  const componentOptions = jiraMeta?.components?.length ? jiraMeta.components : [];

  return (
    <>
      <PageSection>
        <Flex justifyContent={{ default: 'justifyContentSpaceBetween' }} alignItems={{ default: 'alignItemsCenter' }}>
          <FlexItem>
            <Content component="h1">Settings</Content>
            <Content component="small">Runtime-configurable settings. Changes apply immediately and persist across restarts.</Content>
          </FlexItem>
          <FlexItem>
            <Button variant="primary" onClick={saveAll} isDisabled={!hasChanges()} isLoading={saveMutation.isPending}>
              Save Changes
            </Button>
          </FlexItem>
        </Flex>
      </PageSection>

      {saveMessage && (
        <PageSection><Alert variant={saveMessage.type} isInline title={saveMessage.text} /></PageSection>
      )}

      <PageSection>
        <Grid hasGutter>
          {/* Tokens */}
          <GridItem span={12}>
            <Card>
              <CardTitle>API Tokens</CardTitle>
              <CardBody>
                <Form>
                  <Grid hasGutter>
                    <GridItem span={6}>
                      <FormGroup label={<>ReportPortal Token {sourceLabel('reportportal.token')}</>} fieldId="rp-token">
                        <TextInput
                          id="rp-token"
                          type="password"
                          value={val('reportportal.token')}
                          onChange={(_e, v) => set('reportportal.token', v)}
                          placeholder="Bearer token for ReportPortal API"
                        />
                      </FormGroup>
                    </GridItem>
                    <GridItem span={6}>
                      <FormGroup label={<>Jira Token {sourceLabel('jira.token')}</>} fieldId="jira-token">
                        <TextInput
                          id="jira-token"
                          type="password"
                          value={val('jira.token')}
                          onChange={(_e, v) => set('jira.token', v)}
                          placeholder="Bearer token for Jira API"
                        />
                      </FormGroup>
                    </GridItem>
                  </Grid>
                </Form>
              </CardBody>
            </Card>
          </GridItem>

          {/* Notifications */}
          <GridItem span={6}>
            <Card>
              <CardTitle>Notifications</CardTitle>
              <CardBody>
                <Form>
                  <FormGroup label={<>Email Recipients {sourceLabel('email.recipients')}</>} fieldId="email-recipients">
                    <TextInput id="email-recipients" value={val('email.recipients')} onChange={(_e, v) => set('email.recipients', v)} placeholder="user1@redhat.com,user2@redhat.com" />
                  </FormGroup>
                  <FormGroup label={<>Email From {sourceLabel('email.from')}</>} fieldId="email-from">
                    <TextInput id="email-from" value={val('email.from')} onChange={(_e, v) => set('email.from', v)} />
                  </FormGroup>
                  <FormGroup label={<>Ack Reminder Hour {sourceLabel('schedule.ackReminderHour')}</>} fieldId="ack-hour">
                    <FormSelect id="ack-hour" value={val('schedule.ackReminderHour')} onChange={(_e, v) => set('schedule.ackReminderHour', v)}>
                      {Array.from({ length: 24 }, (_, i) => (
                        <FormSelectOption key={i} value={String(i)} label={`${String(i).padStart(2, '0')}:00`} />
                      ))}
                    </FormSelect>
                  </FormGroup>
                  <FormGroup label="Test Notifications">
                    <Flex spaceItems={{ default: 'spaceItemsSm' }}>
                      <FlexItem>
                        <Button variant="secondary" size="sm" onClick={() => emailTest.mutate()} isLoading={emailTest.isPending} isDisabled={!sys.emailEnabled}>
                          Send Test Email
                        </Button>
                      </FlexItem>
                      <FlexItem>
                        <Button variant="secondary" size="sm" onClick={() => slackTest.mutate()} isLoading={slackTest.isPending} isDisabled={!sys.slackEnabled}>
                          Send Test Slack
                        </Button>
                      </FlexItem>
                    </Flex>
                    {testMessage && <Alert variant={testMessage.type} isInline isPlain title={testMessage.text} style={{ marginTop: 8 }} />}
                  </FormGroup>
                </Form>
              </CardBody>
            </Card>
          </GridItem>

          {/* Polling */}
          <GridItem span={6}>
            <Card>
              <CardTitle>Polling & Schedule</CardTitle>
              <CardBody>
                <Form>
                  <FormGroup label={<>Poll Interval {sourceLabel('schedule.pollIntervalMinutes')}</>} fieldId="poll-interval">
                    <FormSelect id="poll-interval" value={val('schedule.pollIntervalMinutes')} onChange={(_e, v) => set('schedule.pollIntervalMinutes', v)}>
                      <FormSelectOption value="5" label="Every 5 minutes" />
                      <FormSelectOption value="10" label="Every 10 minutes" />
                      <FormSelectOption value="15" label="Every 15 minutes" />
                      <FormSelectOption value="30" label="Every 30 minutes" />
                      <FormSelectOption value="60" label="Every hour" />
                    </FormSelect>
                  </FormGroup>
                  <FormGroup label={<>Launch Filter {sourceLabel('dashboard.launchFilter')}</>} fieldId="launch-filter">
                    <FormSelect id="launch-filter" value={val('dashboard.launchFilter')} onChange={(_e, v) => set('dashboard.launchFilter', v)}>
                      {launchFilterOptions.map(name => (
                        <FormSelectOption key={name} value={name} label={name} />
                      ))}
                    </FormSelect>
                  </FormGroup>
                </Form>
              </CardBody>
            </Card>
          </GridItem>

          {/* Jira */}
          <GridItem span={6}>
            <Card>
              <CardTitle>Jira</CardTitle>
              <CardBody>
                <Form>
                  <FormGroup label={<>Project Key {sourceLabel('jira.projectKey')}</>} fieldId="jira-project">
                    <TextInput id="jira-project" value={val('jira.projectKey')} onChange={(_e, v) => set('jira.projectKey', v)} />
                  </FormGroup>
                  <FormGroup label={<>Issue Type {sourceLabel('jira.issueType')}</>} fieldId="jira-type">
                    <FormSelect id="jira-type" value={val('jira.issueType')} onChange={(_e, v) => set('jira.issueType', v)}>
                      {issueTypeOptions.map(t => (
                        <FormSelectOption key={t} value={t} label={t} />
                      ))}
                    </FormSelect>
                  </FormGroup>
                  <FormGroup label={<>Component {sourceLabel('jira.component')}</>} fieldId="jira-component">
                    {componentOptions.length > 0 ? (
                      <FormSelect id="jira-component" value={val('jira.component')} onChange={(_e, v) => set('jira.component', v)}>
                        {componentOptions.map(c => (
                          <FormSelectOption key={c} value={c} label={c} />
                        ))}
                      </FormSelect>
                    ) : (
                      <TextInput id="jira-component" value={val('jira.component')} onChange={(_e, v) => set('jira.component', v)} placeholder="CNV User Interface" />
                    )}
                  </FormGroup>
                </Form>
              </CardBody>
            </Card>
          </GridItem>

          {/* Links */}
          <GridItem span={6}>
            <Card>
              <CardTitle>Links</CardTitle>
              <CardBody>
                <Form>
                  <FormGroup label={<>Dashboard URL {sourceLabel('dashboard.url')}</>} fieldId="dashboard-url">
                    <TextInput id="dashboard-url" value={val('dashboard.url')} onChange={(_e, v) => set('dashboard.url', v)} placeholder="https://your-dashboard.example.com" />
                  </FormGroup>
                  <FormGroup label={<>Polarion URL {sourceLabel('polarion.url')}</>} fieldId="polarion-url">
                    <TextInput id="polarion-url" value={val('polarion.url')} onChange={(_e, v) => set('polarion.url', v)} placeholder="https://polarion.example.com/..." />
                  </FormGroup>
                </Form>
              </CardBody>
            </Card>
          </GridItem>

          {/* System Info */}
          <GridItem span={12}>
            <Card>
              <CardTitle>System Information</CardTitle>
              <CardBody>
                <DescriptionList isHorizontal columnModifier={{ default: '3Col' }}>
                  <DescriptionListGroup>
                    <DescriptionListTerm>ReportPortal</DescriptionListTerm>
                    <DescriptionListDescription>
                      <a href={sys.reportportalUrl} target="_blank" rel="noreferrer">{sys.reportportalUrl}</a>
                      <div style={{ fontSize: 12, color: '#888' }}>Project: {sys.reportportalProject}</div>
                    </DescriptionListDescription>
                  </DescriptionListGroup>
                  <DescriptionListGroup>
                    <DescriptionListTerm>Integrations</DescriptionListTerm>
                    <DescriptionListDescription>
                      <Flex spaceItems={{ default: 'spaceItemsSm' }}>
                        {(['Email', 'Slack', 'Jira', 'Auth'] as const).map(name => {
                          const enabled = sys[`${name.toLowerCase()}Enabled` as keyof typeof sys] as boolean;
                          return (
                            <FlexItem key={name}>
                              <Label color={enabled ? 'green' : 'grey'} isCompact icon={enabled ? <CheckCircleIcon /> : <ExclamationCircleIcon />}>
                                {name}
                              </Label>
                            </FlexItem>
                          );
                        })}
                      </Flex>
                    </DescriptionListDescription>
                  </DescriptionListGroup>
                  <DescriptionListGroup>
                    <DescriptionListTerm>Server</DescriptionListTerm>
                    <DescriptionListDescription>
                      <div>Uptime: {formatUptime(sys.uptime)}</div>
                      <div>Last poll: {sys.lastPollAt ? new Date(sys.lastPollAt).toLocaleString() : 'Not yet'}</div>
                    </DescriptionListDescription>
                  </DescriptionListGroup>
                </DescriptionList>
              </CardBody>
            </Card>
          </GridItem>
        </Grid>
      </PageSection>
    </>
  );
};
