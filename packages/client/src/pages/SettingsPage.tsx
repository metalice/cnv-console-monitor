import React, { useEffect, useState, useMemo } from 'react';
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
import { CheckCircleIcon, ExclamationCircleIcon, PlusCircleIcon, TrashIcon } from '@patternfly/react-icons';
import { fetchSettings, updateSettings, testEmail, testSlack, fetchLaunchNames, fetchJiraMeta, fetchRpProjects } from '../api/settings';
import type { SettingsResponse } from '@cnv-monitor/shared';

const TIMEZONES = [
  'Asia/Jerusalem', 'UTC', 'America/New_York', 'America/Chicago', 'America/Denver',
  'America/Los_Angeles', 'Europe/London', 'Europe/Berlin', 'Europe/Prague',
  'Asia/Kolkata', 'Asia/Shanghai', 'Asia/Tokyo', 'Australia/Sydney',
];

const REPORT_SCHEDULES = [
  { value: '0 7 * * *', label: 'Daily at 07:00' },
  { value: '0 8 * * *', label: 'Daily at 08:00' },
  { value: '0 9 * * *', label: 'Daily at 09:00' },
  { value: '0 6 * * 1-5', label: 'Weekdays at 06:00' },
  { value: '0 7 * * 1-5', label: 'Weekdays at 07:00' },
  { value: '0 8 * * 1-5', label: 'Weekdays at 08:00' },
  { value: '0 9 * * 1-5', label: 'Weekdays at 09:00' },
  { value: '0 */6 * * *', label: 'Every 6 hours' },
  { value: '0 */12 * * *', label: 'Every 12 hours' },
];

const LOOKBACK_OPTIONS = [
  { value: '7', label: '1 week' },
  { value: '14', label: '2 weeks' },
  { value: '30', label: '1 month' },
  { value: '60', label: '2 months' },
  { value: '90', label: '3 months' },
  { value: '180', label: '6 months' },
  { value: '365', label: '1 year' },
];

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
  const { data: rpProjects } = useQuery({ queryKey: ['rpProjects'], queryFn: fetchRpProjects, staleTime: 5 * 60 * 1000 });

  const [draft, setDraft] = useState<Record<string, string>>({});
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'danger'; text: string } | null>(null);
  const [testMessage, setTestMessage] = useState<{ type: 'success' | 'danger'; text: string } | null>(null);

  const jiraProject = draft['jira.projectKey'] ?? data?.settings['jira.projectKey']?.value ?? '';
  const { data: jiraMeta } = useQuery({
    queryKey: ['jiraMeta', jiraProject],
    queryFn: () => fetchJiraMeta(jiraProject),
    staleTime: 5 * 60 * 1000,
    enabled: !!jiraProject,
  });

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

  const recipients = useMemo(() => val('email.recipients').split(',').filter(Boolean), [draft, data]);
  const [newRecipient, setNewRecipient] = useState('');

  function addRecipient(): void {
    const email = newRecipient.trim();
    if (email && !recipients.includes(email)) {
      set('email.recipients', [...recipients, email].join(','));
      setNewRecipient('');
    }
  }

  function removeRecipient(email: string): void {
    set('email.recipients', recipients.filter(r => r !== email).join(','));
  }

  if (isLoading || !data) return <PageSection isFilled><Spinner aria-label="Loading settings" /></PageSection>;

  const sys = data.system;
  const launchFilterOptions = launchNames?.length ? [...new Set([val('dashboard.launchFilter'), ...launchNames])] : [val('dashboard.launchFilter')];
  const rpProjectOptions = rpProjects?.length ? [...new Set([val('reportportal.project'), ...rpProjects])] : [val('reportportal.project')];
  const jiraProjectOptions = jiraMeta?.projects?.length ? [...new Set([val('jira.projectKey'), ...jiraMeta.projects])] : [val('jira.projectKey')];
  const issueTypeOptions = jiraMeta?.issueTypes?.length ? jiraMeta.issueTypes : ['Bug', 'Task', 'Story'];
  const componentOptions = jiraMeta?.components?.length ? jiraMeta.components : [];
  const cronValue = val('schedule.cron');
  const cronMatch = REPORT_SCHEDULES.find(s => s.value === cronValue);

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
          {/* ReportPortal */}
          <GridItem span={6}>
            <Card>
              <CardTitle>ReportPortal</CardTitle>
              <CardBody>
                <Form>
                  <FormGroup label={<>URL {sourceLabel('reportportal.url')}</>} fieldId="rp-url">
                    <TextInput id="rp-url" value={val('reportportal.url')} onChange={(_e, v) => set('reportportal.url', v)} placeholder="https://reportportal.example.com" />
                  </FormGroup>
                  <FormGroup label={<>Project {sourceLabel('reportportal.project')}</>} fieldId="rp-project">
                    <FormSelect id="rp-project" value={val('reportportal.project')} onChange={(_e, v) => set('reportportal.project', v)}>
                      {rpProjectOptions.map(p => <FormSelectOption key={p} value={p} label={p} />)}
                    </FormSelect>
                  </FormGroup>
                  <FormGroup label={<>Token {sourceLabel('reportportal.token')}</>} fieldId="rp-token">
                    <TextInput id="rp-token" type="password" value={val('reportportal.token')} onChange={(_e, v) => set('reportportal.token', v)} placeholder="Bearer token" />
                  </FormGroup>
                  <FormGroup label={<>Launch Filter {sourceLabel('dashboard.launchFilter')}</>} fieldId="launch-filter">
                    <FormSelect id="launch-filter" value={val('dashboard.launchFilter')} onChange={(_e, v) => set('dashboard.launchFilter', v)}>
                      {launchFilterOptions.map(name => <FormSelectOption key={name} value={name} label={name} />)}
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
                  <FormGroup label={<>URL {sourceLabel('jira.url')}</>} fieldId="jira-url">
                    <TextInput id="jira-url" value={val('jira.url')} onChange={(_e, v) => set('jira.url', v)} placeholder="https://issues.redhat.com" />
                  </FormGroup>
                  <FormGroup label={<>Token {sourceLabel('jira.token')}</>} fieldId="jira-token">
                    <TextInput id="jira-token" type="password" value={val('jira.token')} onChange={(_e, v) => set('jira.token', v)} placeholder="Bearer token" />
                  </FormGroup>
                  <FormGroup label={<>Project {sourceLabel('jira.projectKey')}</>} fieldId="jira-project">
                    <FormSelect id="jira-project" value={val('jira.projectKey')} onChange={(_e, v) => set('jira.projectKey', v)}>
                      {jiraProjectOptions.map(p => <FormSelectOption key={p} value={p} label={p} />)}
                    </FormSelect>
                  </FormGroup>
                  <FormGroup label={<>Issue Type {sourceLabel('jira.issueType')}</>} fieldId="jira-type">
                    <FormSelect id="jira-type" value={val('jira.issueType')} onChange={(_e, v) => set('jira.issueType', v)}>
                      {issueTypeOptions.map(t => <FormSelectOption key={t} value={t} label={t} />)}
                    </FormSelect>
                  </FormGroup>
                  <FormGroup label={<>Component {sourceLabel('jira.component')}</>} fieldId="jira-component">
                    {componentOptions.length > 0 ? (
                      <FormSelect id="jira-component" value={val('jira.component')} onChange={(_e, v) => set('jira.component', v)}>
                        {componentOptions.map(c => <FormSelectOption key={c} value={c} label={c} />)}
                      </FormSelect>
                    ) : (
                      <TextInput id="jira-component" value={val('jira.component')} onChange={(_e, v) => set('jira.component', v)} placeholder="Select a project first" />
                    )}
                  </FormGroup>
                </Form>
              </CardBody>
            </Card>
          </GridItem>

          {/* Slack */}
          <GridItem span={6}>
            <Card>
              <CardTitle>Slack</CardTitle>
              <CardBody>
                <Form>
                  <FormGroup label={<>Webhook URL {sourceLabel('slack.webhookUrl')}</>} fieldId="slack-webhook">
                    <TextInput id="slack-webhook" value={val('slack.webhookUrl')} onChange={(_e, v) => set('slack.webhookUrl', v)} placeholder="https://hooks.slack.com/services/..." />
                  </FormGroup>
                  <FormGroup label={<>Jira Channel Webhook {sourceLabel('slack.jiraWebhookUrl')}</>} fieldId="slack-jira-webhook">
                    <TextInput id="slack-jira-webhook" value={val('slack.jiraWebhookUrl')} onChange={(_e, v) => set('slack.jiraWebhookUrl', v)} placeholder="Webhook for bug notifications" />
                  </FormGroup>
                  <FormGroup label="Test">
                    <Button variant="secondary" size="sm" onClick={() => slackTest.mutate()} isLoading={slackTest.isPending} isDisabled={!sys.slackEnabled}>
                      Send Test Slack
                    </Button>
                  </FormGroup>
                </Form>
              </CardBody>
            </Card>
          </GridItem>

          {/* Email */}
          <GridItem span={6}>
            <Card>
              <CardTitle>Email</CardTitle>
              <CardBody>
                <Form>
                  <FormGroup label={<>SMTP Host {sourceLabel('email.host')}</>} fieldId="email-host">
                    <TextInput id="email-host" value={val('email.host')} onChange={(_e, v) => set('email.host', v)} placeholder="smtp.corp.redhat.com" />
                  </FormGroup>
                  <FormGroup label={<>SMTP User {sourceLabel('email.user')}</>} fieldId="email-user">
                    <TextInput id="email-user" value={val('email.user')} onChange={(_e, v) => set('email.user', v)} placeholder="Optional SMTP username" />
                  </FormGroup>
                  <FormGroup label={<>SMTP Password {sourceLabel('email.pass')}</>} fieldId="email-pass">
                    <TextInput id="email-pass" type="password" value={val('email.pass')} onChange={(_e, v) => set('email.pass', v)} placeholder="Optional SMTP password" />
                  </FormGroup>
                  <FormGroup label={<>From {sourceLabel('email.from')}</>} fieldId="email-from">
                    <TextInput id="email-from" value={val('email.from')} onChange={(_e, v) => set('email.from', v)} />
                  </FormGroup>
                  <FormGroup label={<>Recipients {sourceLabel('email.recipients')}</>} fieldId="email-recipients">
                    <Flex direction={{ default: 'column' }} spaceItems={{ default: 'spaceItemsSm' }}>
                      {recipients.map(email => (
                        <FlexItem key={email}>
                          <Flex alignItems={{ default: 'alignItemsCenter' }} spaceItems={{ default: 'spaceItemsSm' }}>
                            <FlexItem><Label>{email}</Label></FlexItem>
                            <FlexItem>
                              <Button variant="plain" size="sm" aria-label={`Remove ${email}`} onClick={() => removeRecipient(email)} icon={<TrashIcon />} />
                            </FlexItem>
                          </Flex>
                        </FlexItem>
                      ))}
                      <FlexItem>
                        <Flex alignItems={{ default: 'alignItemsCenter' }} spaceItems={{ default: 'spaceItemsSm' }}>
                          <FlexItem style={{ flex: 1 }}>
                            <TextInput
                              value={newRecipient}
                              onChange={(_e, v) => setNewRecipient(v)}
                              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addRecipient(); } }}
                              placeholder="Add email address..."
                              aria-label="New recipient email"
                            />
                          </FlexItem>
                          <FlexItem>
                            <Button variant="plain" size="sm" onClick={addRecipient} isDisabled={!newRecipient.trim()} icon={<PlusCircleIcon />} aria-label="Add recipient" />
                          </FlexItem>
                        </Flex>
                      </FlexItem>
                    </Flex>
                  </FormGroup>
                  <FormGroup label="Test">
                    <Button variant="secondary" size="sm" onClick={() => emailTest.mutate()} isLoading={emailTest.isPending} isDisabled={!sys.emailEnabled}>
                      Send Test Email
                    </Button>
                    {testMessage && <Alert variant={testMessage.type} isInline isPlain title={testMessage.text} style={{ marginTop: 8 }} />}
                  </FormGroup>
                </Form>
              </CardBody>
            </Card>
          </GridItem>

          {/* Schedule */}
          <GridItem span={6}>
            <Card>
              <CardTitle>Schedule</CardTitle>
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
                  <FormGroup label={<>Report Schedule {sourceLabel('schedule.cron')}</>} fieldId="cron">
                    <FormSelect id="cron" value={cronValue} onChange={(_e, v) => set('schedule.cron', v)}>
                      {REPORT_SCHEDULES.map(s => <FormSelectOption key={s.value} value={s.value} label={s.label} />)}
                      {!cronMatch && <FormSelectOption value={cronValue} label={`Custom: ${cronValue}`} />}
                    </FormSelect>
                  </FormGroup>
                  <FormGroup label={<>Ack Reminder Hour {sourceLabel('schedule.ackReminderHour')}</>} fieldId="ack-hour">
                    <FormSelect id="ack-hour" value={val('schedule.ackReminderHour')} onChange={(_e, v) => set('schedule.ackReminderHour', v)}>
                      {Array.from({ length: 24 }, (_, i) => (
                        <FormSelectOption key={i} value={String(i)} label={`${String(i).padStart(2, '0')}:00`} />
                      ))}
                    </FormSelect>
                  </FormGroup>
                  <FormGroup label={<>Timezone {sourceLabel('schedule.timezone')}</>} fieldId="tz">
                    <FormSelect id="tz" value={val('schedule.timezone')} onChange={(_e, v) => set('schedule.timezone', v)}>
                      {TIMEZONES.map(tz => <FormSelectOption key={tz} value={tz} label={tz} />)}
                      {!TIMEZONES.includes(val('schedule.timezone')) && (
                        <FormSelectOption value={val('schedule.timezone')} label={val('schedule.timezone')} />
                      )}
                    </FormSelect>
                  </FormGroup>
                  <FormGroup label={<>Initial History {sourceLabel('schedule.initialLookbackDays')}</>} fieldId="lookback">
                    <FormSelect id="lookback" value={val('schedule.initialLookbackDays')} onChange={(_e, v) => set('schedule.initialLookbackDays', v)}>
                      {LOOKBACK_OPTIONS.map(o => <FormSelectOption key={o.value} value={o.value} label={o.label} />)}
                    </FormSelect>
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
