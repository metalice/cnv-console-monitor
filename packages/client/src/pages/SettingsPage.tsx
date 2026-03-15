import React, { useEffect, useMemo, useRef, useState } from 'react';
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
  Tooltip,
  Switch,
  Flex,
  FlexItem,
  Dropdown,
  DropdownItem,
  DropdownList,
  MenuToggle,
} from '@patternfly/react-core';
import { CheckCircleIcon, ExclamationCircleIcon, PlusCircleIcon, EllipsisVIcon } from '@patternfly/react-icons';
import { Table, Thead, Tr, Th, Tbody, Td } from '@patternfly/react-table';
import { fetchSettings, updateSettings, fetchJiraMeta, fetchRpProjects, testRpConnection, testJiraConnection, type JiraMeta } from '../api/settings';
import { fetchSubscriptions, createSubscriptionApi, updateSubscriptionApi, deleteSubscriptionApi, testSubscriptionApi } from '../api/subscriptions';
import { apiFetch } from '../api/client';
import { SearchableSelect, type SearchableSelectOption } from '../components/common/SearchableSelect';
import { SubscriptionCard, formatScheduleLabel } from '../components/settings/SubscriptionCard';
import { ComponentMultiSelect } from '../components/common/ComponentMultiSelect';
import { useAuth } from '../context/AuthContext';
import type { Subscription } from '@cnv-monitor/shared';



const SCHEDULE_OPTIONS = [
  { value: '0 7 * * *', label: 'Daily at 07:00' },
  { value: '0 8 * * *', label: 'Daily at 08:00' },
  { value: '0 9 * * *', label: 'Daily at 09:00' },
  { value: '0 6 * * 1-5', label: 'Weekdays at 06:00' },
  { value: '0 7 * * 1-5', label: 'Weekdays at 07:00' },
  { value: '0 8 * * 1-5', label: 'Weekdays at 08:00' },
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

const POLL_INTERVAL_OPTIONS = [
  { value: '5', label: 'Every 5 minutes' },
  { value: '10', label: 'Every 10 minutes' },
  { value: '15', label: 'Every 15 minutes' },
  { value: '30', label: 'Every 30 minutes' },
  { value: '60', label: 'Every hour' },
];

function isMaskedValue(value: string): boolean {
  return value.includes('...') || value.includes('••••');
}

function toOptions(values: string[]): SearchableSelectOption[] {
  return values.map((value) => ({ value, label: value }));
}

function integrationBadge(enabled: boolean, label: string): React.ReactNode {
  return (
    <Label color={enabled ? 'green' : 'grey'} isCompact icon={enabled ? <CheckCircleIcon /> : <ExclamationCircleIcon />}>
      {label}
    </Label>
  );
}

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
  const { user, isAdmin } = useAuth();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({ queryKey: ['settings'], queryFn: fetchSettings });
  const { data: rpProjects } = useQuery({ queryKey: ['rpProjects'], queryFn: fetchRpProjects, staleTime: 5 * 60 * 1000 });

  const [draft, setDraft] = useState<Record<string, string>>({});
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'danger'; text: string } | null>(null);
  const [rpTestMsg, setRpTestMsg] = useState<{ type: 'success' | 'danger'; text: string } | null>(null);
  const [jiraTestMsg, setJiraTestMsg] = useState<{ type: 'success' | 'danger'; text: string } | null>(null);
  const [tokenEditing, setTokenEditing] = useState<Record<string, boolean>>({});
  const [rpProjectsOverride, setRpProjectsOverride] = useState<string[] | null>(null);
  const [jiraMetaOverride, setJiraMetaOverride] = useState<JiraMeta | null>(null);
  const [jiraTestMode, setJiraTestMode] = useState(false);

  const jiraProject = draft['jira.projectKey'] ?? data?.settings['jira.projectKey']?.value ?? '';
  const jiraTokenDirty = isDirty('jira.token') || tokenEditing['jira.token'];
  const prevJiraProjectRef = useRef<string>('');
  const { data: jiraMeta } = useQuery({
    queryKey: ['jiraMeta', jiraProject],
    queryFn: () => fetchJiraMeta(jiraProject),
    staleTime: 5 * 60 * 1000,
    enabled: !!jiraProject && !jiraTokenDirty,
  });
  const { data: jiraMetaDraft } = useQuery({
    queryKey: ['jiraMetaDraft', jiraProject, val('jira.url'), val('jira.token')],
    queryFn: () => testJiraConnection({ url: val('jira.url'), projectKey: jiraProject, token: val('jira.token') }),
    staleTime: 5 * 60 * 1000,
    enabled: jiraTestMode && jiraTokenDirty && !!jiraProject && !!val('jira.token'),
    retry: false,
  });

  useEffect(() => {
    if (data?.settings) {
      const initial: Record<string, string> = {};
      for (const [key, v] of Object.entries(data.settings)) initial[key] = v.value;
      setDraft(initial);
      setTokenEditing({});
      setRpProjectsOverride(null);
      setJiraMetaOverride(null);
      setJiraTestMode(false);
      prevJiraProjectRef.current = initial['jira.projectKey'] ?? '';
    }
  }, [data]);

  useEffect(() => {
    const prevProject = prevJiraProjectRef.current;
    if (jiraProject && prevProject && jiraProject !== prevProject) {
      set('jira.component', '');
    }
    prevJiraProjectRef.current = jiraProject;
  }, [jiraProject]);

  useEffect(() => {
    if (!jiraTestMode) return;
    if (jiraTokenDirty && jiraProject) {
      setJiraMetaOverride(null);
    }
  }, [jiraProject, jiraTestMode, jiraTokenDirty]);

  const saveMutation = useMutation({
    mutationFn: (patch: Record<string, string>) => updateSettings(patch),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      queryClient.invalidateQueries({ queryKey: ['config'] });
      if (result.updated.some((key) => key.startsWith('reportportal.'))) {
        queryClient.invalidateQueries({ queryKey: ['rpProjects'] });

      }
      if (result.updated.some((key) => key.startsWith('jira.'))) {
        queryClient.invalidateQueries({ queryKey: ['jiraMeta'] });
      }
      setSaveMessage({ type: 'success', text: `Saved: ${result.updated.join(', ')}` });
      setTimeout(() => setSaveMessage(null), 4000);
    },
    onError: (err) => setSaveMessage({ type: 'danger', text: (err as Error).message }),
  });

  const { data: subs, refetch: refetchSubs } = useQuery({
    queryKey: ['subscriptions'],
    queryFn: fetchSubscriptions,
  });
  const { data: availableComponents } = useQuery({
    queryKey: ['availableComponents'],
    queryFn: () => import('../api/client').then(m => m.apiFetch<string[]>('/launches/components')),
    staleTime: 5 * 60 * 1000,
  });

  const [subTestMessages, setSubTestMessages] = useState<Record<number | string, { type: 'success' | 'danger'; text: string }>>({});
  const [testingSubId, setTestingSubId] = useState<number | string | null>(null);
  const [editingSubId, setEditingSubId] = useState<number | null>(null);
  const [kebabOpenId, setKebabOpenId] = useState<number | null>(null);
  const [editDraft, setEditDraft] = useState<Partial<Subscription>>({});
  const [newRow, setNewRow] = useState<{ name: string; components: string[]; slackWebhook: string; jiraWebhook: string; emailRecipients: string; schedule: string; enabled: boolean } | null>(null);
  const [newRowTested, setNewRowTested] = useState(false);
  const [subSaveMsg, setSubSaveMsg] = useState<{ type: 'success' | 'danger'; text: string } | null>(null);

  const createSub = useMutation({
    mutationFn: (data: { name: string; components: string[]; slackWebhook: string; jiraWebhook: string; emailRecipients: string[]; schedule: string; enabled: boolean }) =>
      createSubscriptionApi({ ...data, timezone: 'Asia/Jerusalem', slackWebhook: data.slackWebhook || null, jiraWebhook: data.jiraWebhook || null }),
    onSuccess: () => { refetchSubs(); setNewRow(null); setNewRowTested(false); setSubSaveMsg({ type: 'success', text: 'Subscription created successfully.' }); setTimeout(() => setSubSaveMsg(null), 4000); },
    onError: (e) => { setSubSaveMsg({ type: 'danger', text: (e as Error).message }); },
  });

  const updateSub = useMutation({
    mutationFn: ({ id, data: d }: { id: number; data: Partial<Subscription> }) => updateSubscriptionApi(id, d),
    onSuccess: () => { refetchSubs(); setEditingSubId(null); setEditDraft({}); setSubSaveMsg({ type: 'success', text: 'Subscription updated successfully.' }); setTimeout(() => setSubSaveMsg(null), 4000); },
    onError: (e) => { setSubSaveMsg({ type: 'danger', text: (e as Error).message }); },
  });

  const deleteSub = useMutation({
    mutationFn: (id: number) => deleteSubscriptionApi(id),
    onSuccess: () => refetchSubs(),
  });

  const testSub = useMutation({
    mutationFn: (id: number) => { setTestingSubId(id); return testSubscriptionApi(id); },
    onSuccess: (r, id) => { setSubTestMessages(prev => ({ ...prev, [id]: { type: 'success', text: r.message } })); setTestingSubId(null); },
    onError: (e, id) => { setSubTestMessages(prev => ({ ...prev, [id]: { type: 'danger', text: (e as Error).message } })); setTestingSubId(null); },
  });

  const testNewRow = useMutation({
    mutationFn: async () => {
      if (!newRow) throw new Error('No new row');
      setTestingSubId('new');
      const temp = await createSubscriptionApi({
        name: newRow.name || 'Test',
        components: [],
        slackWebhook: newRow.slackWebhook || null,
        emailRecipients: newRow.emailRecipients ? newRow.emailRecipients.split(',').map(e => e.trim()).filter(Boolean) : [],
        schedule: newRow.schedule || '0 7 * * *',
        timezone: 'Asia/Jerusalem',
        enabled: false,
      });
      const result = await testSubscriptionApi(temp.id);
      await deleteSubscriptionApi(temp.id);
      return result;
    },
    onSuccess: (r) => {
      setSubTestMessages(prev => ({ ...prev, new: { type: 'success', text: r.message } }));
      setTestingSubId(null);
      setNewRowTested(true);
    },
    onError: (e) => {
      setSubTestMessages(prev => ({ ...prev, new: { type: 'danger', text: (e as Error).message } }));
      setTestingSubId(null);
      setNewRowTested(false);
    },
  });

  type UserRecord = { email: string; name: string; role: string; lastLogin: string | null; createdAt: string };
  const { data: adminUsers, refetch: refetchUsers } = useQuery({
    queryKey: ['adminUsers'],
    queryFn: () => apiFetch<UserRecord[]>('/admin/users'),
    enabled: isAdmin,
    staleTime: 30 * 1000,
  });
  const { data: adminStatus } = useQuery({
    queryKey: ['adminStatus'],
    queryFn: () => apiFetch<{ hasAdmin: boolean }>('/admin/has-admin'),
    staleTime: 60 * 1000,
  });

  const [bootstrapSecret, setBootstrapSecret] = useState('');
  const [bootstrapMsg, setBootstrapMsg] = useState<{ type: 'success' | 'danger'; text: string } | null>(null);

  const bootstrapAdmin = useMutation({
    mutationFn: () => apiFetch<{ success: boolean }>('/admin/bootstrap', { method: 'POST', body: JSON.stringify({ secret: bootstrapSecret }) }),
    onSuccess: () => { setBootstrapMsg({ type: 'success', text: 'You are now an admin. Reload the page.' }); refetchUsers(); },
    onError: (e) => setBootstrapMsg({ type: 'danger', text: (e as Error).message }),
  });

  const setRole = useMutation({
    mutationFn: ({ email, role }: { email: string; role: string }) => apiFetch(`/admin/users/${encodeURIComponent(email)}/role`, { method: 'PUT', body: JSON.stringify({ role }) }),
    onSuccess: () => refetchUsers(),
  });

  const rpTest = useMutation({
    mutationFn: async () => {
      const rpTokenValue = val('reportportal.token');
      const rpTokenProvided = isDirty('reportportal.token')
        || tokenEditing['reportportal.token']
        || !isMaskedValue(rpTokenValue);
      const payload = {
        url: val('reportportal.url'),
        project: val('reportportal.project'),
        token: rpTokenProvided ? rpTokenValue : undefined,
      };
      return testRpConnection(payload);
    },
    onSuccess: (r) => {
      setRpTestMsg({ type: 'success', text: r.message });
      setRpProjectsOverride(r.projects ?? []);
    },
    onError: (e) => setRpTestMsg({ type: 'danger', text: (e as Error).message }),
  });

  const jiraTest = useMutation({
    mutationFn: async () => {
      const jiraTokenValue = val('jira.token');
      const jiraTokenProvided = isDirty('jira.token')
        || tokenEditing['jira.token']
        || !isMaskedValue(jiraTokenValue);
      const payload = {
        url: val('jira.url'),
        projectKey: val('jira.projectKey'),
        token: jiraTokenProvided ? jiraTokenValue : undefined,
      };
      return testJiraConnection(payload);
    },
    onSuccess: (r) => {
      setJiraTestMsg({ type: 'success', text: r.message });
      setJiraMetaOverride({
        projects: r.projects ?? [],
        issueTypes: r.issueTypes ?? [],
        components: r.components ?? [],
      });
      if (!val('jira.issueType')) {
        const bugType = (r.issueTypes || []).find((t) => t.toLowerCase() === 'bug');
        const fallbackType = bugType || r.issueTypes?.[0];
        if (fallbackType) set('jira.issueType', fallbackType);
      }
    },
    onError: (e) => setJiraTestMsg({ type: 'danger', text: (e as Error).message }),
  });

  function val(key: string): string { return draft[key] ?? data?.settings[key]?.value ?? ''; }
  function set(key: string, value: string): void { if (!isAdmin) return; setDraft(prev => ({ ...prev, [key]: value })); }
  const adminOnly = !isAdmin;
  function isDirty(key: string): boolean { return data?.settings[key] !== undefined && draft[key] !== data.settings[key].value; }
  function hasChanges(): boolean { return data ? Object.keys(draft).some(k => isDirty(k)) : false; }

  function startTokenEdit(key: string): void {
    if (!tokenEditing[key] && isMaskedValue(val(key))) {
      set(key, '');
    }
    setTokenEditing(prev => ({ ...prev, [key]: true }));
  }

  function endTokenEdit(key: string): void {
    if (!tokenEditing[key]) return;
    if (val(key).trim() === '') {
      const original = data?.settings[key]?.value ?? '';
      set(key, original);
      setTokenEditing(prev => ({ ...prev, [key]: false }));
    }
  }

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
  const rpProjectsData = rpProjectsOverride ?? rpProjects ?? [];
  const rpProjectOptions = rpProjectsData.length ? [...new Set([val('reportportal.project'), ...rpProjectsData])] : [val('reportportal.project')];
  const jiraMetaDraftData = jiraMetaDraft
    ? { projects: jiraMetaDraft.projects ?? [], issueTypes: jiraMetaDraft.issueTypes ?? [], components: jiraMetaDraft.components ?? [] }
    : null;
  const jiraMetaData = jiraTokenDirty
    ? (jiraTestMode
        ? {
            projects: jiraMetaOverride?.projects?.length ? jiraMetaOverride.projects : (jiraMetaDraftData?.projects ?? []),
            issueTypes: jiraMetaOverride?.issueTypes?.length ? jiraMetaOverride.issueTypes : (jiraMetaDraftData?.issueTypes ?? []),
            components: jiraMetaDraftData?.components?.length ? jiraMetaDraftData.components : (jiraMetaOverride?.components ?? []),
          }
        : jiraMeta)
    : jiraMeta;
  const jiraProjectOptions = jiraMetaData?.projects?.length ? jiraMetaData.projects : [];
  const jiraProjectSelectOptions = jiraProjectOptions.map((p) => ({ value: p.key, label: `${p.key} - ${p.name}` }));
  const issueTypeOptions = jiraMetaData?.issueTypes?.length ? jiraMetaData.issueTypes : ['Bug', 'Task', 'Story'];
  const issueTypeSelectOptions = toOptions(issueTypeOptions);
  const rpEnabled = Boolean(val('reportportal.url') && val('reportportal.token'));

  return (
    <>
      <PageSection>
        <Flex justifyContent={{ default: 'justifyContentSpaceBetween' }} alignItems={{ default: 'alignItemsCenter' }}>
          <FlexItem>
            <Content component="h1">Settings</Content>
            <Content component="small">Runtime-configurable settings. Changes apply immediately and persist across restarts.</Content>
          </FlexItem>
          {isAdmin && (
            <FlexItem>
              <Button variant="primary" onClick={saveAll} isDisabled={!hasChanges()} isLoading={saveMutation.isPending}>
                Save Changes
              </Button>
            </FlexItem>
          )}
        </Flex>
      </PageSection>

      {saveMessage && (
        <PageSection><Alert variant={saveMessage.type} isInline title={saveMessage.text} /></PageSection>
      )}

      <PageSection>
        <Grid hasGutter>
          {/* ReportPortal */}
          <GridItem span={12} md={6}>
            <Card>
              <CardTitle>
                <Flex alignItems={{ default: 'alignItemsCenter' }} spaceItems={{ default: 'spaceItemsSm' }}>
                  <FlexItem>ReportPortal</FlexItem>
                  <FlexItem>{integrationBadge(rpEnabled, rpEnabled ? 'Configured' : 'Missing')}</FlexItem>
                </Flex>
              </CardTitle>
              <CardBody>
                <Content component="small" className="app-text-muted app-mb-md">
                  Connection to your ReportPortal instance for fetching test launches and results. Get your API token from ReportPortal &gt; User Profile &gt; API Keys.
                </Content>
                <Form>
                  <FormGroup label={<>URL {sourceLabel('reportportal.url')}</>} fieldId="rp-url">
                    <TextInput id="rp-url" value={val('reportportal.url')} onChange={(_e, v) => set('reportportal.url', v)} placeholder="https://reportportal.example.com" isDisabled={adminOnly} />
                  </FormGroup>
                  <FormGroup label={<>Project {sourceLabel('reportportal.project')}</>} fieldId="rp-project">
                    <SearchableSelect
                      id="rp-project"
                      value={val('reportportal.project')}
                      options={toOptions(rpProjectOptions)}
                      onChange={(v) => set('reportportal.project', v)}
                      placeholder="Select project"
                      isDisabled={adminOnly}
                    />
                  </FormGroup>
                  <FormGroup label={<>Token {sourceLabel('reportportal.token')}</>} fieldId="rp-token">
                    <Flex alignItems={{ default: 'alignItemsFlexEnd' }} spaceItems={{ default: 'spaceItemsSm' }}>
                      <FlexItem style={{ flex: 1 }}>
                        <TextInput
                          id="rp-token"
                          type={tokenEditing['reportportal.token'] ? 'text' : 'password'}
                          value={val('reportportal.token')}
                          onFocus={() => startTokenEdit('reportportal.token')}
                          onBlur={() => endTokenEdit('reportportal.token')}
                          onChange={(_e, v) => set('reportportal.token', v)}
                          placeholder="Bearer token"
                          isDisabled={adminOnly}
                        />
                      </FlexItem>
                      <FlexItem>
                        <Button variant="secondary" size="sm" onClick={() => rpTest.mutate()} isLoading={rpTest.isPending} isDisabled={adminOnly}>
                          Test Connection
                        </Button>
                      </FlexItem>
                    </Flex>
                    {rpTestMsg && <Alert variant={rpTestMsg.type} isInline isPlain title={rpTestMsg.text} className="app-mt-sm" />}
                  </FormGroup>
                </Form>
              </CardBody>
            </Card>
          </GridItem>

          {/* Jira */}
          <GridItem span={12} md={6}>
            <Card>
              <CardTitle>
                <Flex alignItems={{ default: 'alignItemsCenter' }} spaceItems={{ default: 'spaceItemsSm' }}>
                  <FlexItem>Jira</FlexItem>
                  <FlexItem>{integrationBadge(sys.jiraEnabled, sys.jiraEnabled ? 'Enabled' : 'Disabled')}</FlexItem>
                </Flex>
              </CardTitle>
              <CardBody>
                <Content component="small" className="app-text-muted app-mb-md">
                  Jira integration for creating bugs and viewing release checklists. To get a Personal Access Token: Jira &gt; Profile &gt; Personal Access Tokens &gt; Create token. Use "Test Connection" to verify and load projects.
                </Content>
                <Form>
                  <FormGroup label={<>URL {sourceLabel('jira.url')}</>} fieldId="jira-url">
                    <TextInput id="jira-url" value={val('jira.url')} onChange={(_e, v) => set('jira.url', v)} placeholder="https://issues.redhat.com" isDisabled={adminOnly} />
                  </FormGroup>
                  <FormGroup label={<>Token {sourceLabel('jira.token')}</>} fieldId="jira-token">
                    <Flex alignItems={{ default: 'alignItemsFlexEnd' }} spaceItems={{ default: 'spaceItemsSm' }}>
                      <FlexItem style={{ flex: 1 }}>
                        <TextInput
                          id="jira-token"
                          type={tokenEditing['jira.token'] ? 'text' : 'password'}
                          value={val('jira.token')}
                          onFocus={() => startTokenEdit('jira.token')}
                          onBlur={() => endTokenEdit('jira.token')}
                          onChange={(_e, v) => {
                            set('jira.token', v);
                            setJiraTestMode(false);
                            setJiraMetaOverride(null);
                            setJiraTestMsg(null);
                          }}
                          placeholder="Bearer token"
                          isDisabled={adminOnly}
                        />
                      </FlexItem>
                      <FlexItem>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => {
                            if (jiraTokenDirty) {
                              set('jira.projectKey', '');
                              set('jira.issueType', '');
                              set('jira.component', '');
                              setJiraMetaOverride({ projects: [], issueTypes: [], components: [] });
                            }
                            setJiraTestMode(true);
                            jiraTest.mutate();
                          }}
                          isLoading={jiraTest.isPending}
                          isDisabled={adminOnly}
                        >
                          Test Connection
                        </Button>
                      </FlexItem>
                    </Flex>
                    {jiraTestMsg && <Alert variant={jiraTestMsg.type} isInline isPlain title={jiraTestMsg.text} className="app-mt-sm" />}
                  </FormGroup>
                  <FormGroup label={<>Project {sourceLabel('jira.projectKey')}</>} fieldId="jira-project">
                    <SearchableSelect
                      id="jira-project"
                      value={val('jira.projectKey')}
                      options={jiraProjectSelectOptions}
                      onChange={(v) => set('jira.projectKey', v)}
                      placeholder="Select project"
                      isDisabled={adminOnly}
                    />
                  </FormGroup>
                  <FormGroup label={<>Issue Type {sourceLabel('jira.issueType')}</>} fieldId="jira-type">
                    <SearchableSelect
                      id="jira-type"
                      value={val('jira.issueType')}
                      options={issueTypeSelectOptions}
                      onChange={(v) => set('jira.issueType', v)}
                      placeholder="Select issue type"
                      isDisabled={adminOnly}
                    />
                  </FormGroup>
                </Form>
              </CardBody>
            </Card>
          </GridItem>

          {/* Email Server (infra) */}
          <GridItem span={12} md={6}>
            <Card>
              <CardTitle>
                <Flex alignItems={{ default: 'alignItemsCenter' }} spaceItems={{ default: 'spaceItemsSm' }}>
                  <FlexItem>Email Server</FlexItem>
                  <FlexItem>{integrationBadge(sys.emailEnabled, sys.emailEnabled ? 'Configured' : 'Not configured')}</FlexItem>
                </Flex>
              </CardTitle>
              <CardBody>
                <Content component="small" className="app-text-muted app-mb-md">
                  SMTP server for sending email notifications. For Red Hat internal, use smtp.corp.redhat.com on port 587. Authentication is optional for internal SMTP relays.
                </Content>
                <Form>
                  <FormGroup label={<>SMTP Host {sourceLabel('email.host')}</>} fieldId="email-host">
                    <TextInput id="email-host" value={val('email.host')} onChange={(_e, v) => set('email.host', v)} placeholder="smtp.corp.redhat.com" isDisabled={adminOnly} />
                  </FormGroup>
                  <FormGroup label={<>SMTP User {sourceLabel('email.user')}</>} fieldId="email-user">
                    <TextInput id="email-user" value={val('email.user')} onChange={(_e, v) => set('email.user', v)} placeholder="Optional SMTP username" isDisabled={adminOnly} />
                  </FormGroup>
                  <FormGroup label={<>SMTP Password {sourceLabel('email.pass')}</>} fieldId="email-pass">
                    <TextInput id="email-pass" type="password" value={val('email.pass')} onChange={(_e, v) => set('email.pass', v)} placeholder="Optional SMTP password" isDisabled={adminOnly} />
                  </FormGroup>
                  <FormGroup label={<>From {sourceLabel('email.from')}</>} fieldId="email-from">
                    <TextInput id="email-from" value={val('email.from')} onChange={(_e, v) => set('email.from', v)} isDisabled={adminOnly} />
                  </FormGroup>
                </Form>
              </CardBody>
            </Card>
          </GridItem>

          {/* Polling */}
          <GridItem span={12} md={6}>
            <Card>
              <CardTitle>Polling</CardTitle>
              <CardBody>
                <Content component="small" className="app-text-muted app-mb-md">
                  How often the server fetches new data from ReportPortal. Initial History controls how far back to look when the database is empty.
                </Content>
                <Form>
                  <FormGroup label={<>Poll Interval {sourceLabel('schedule.pollIntervalMinutes')}</>} fieldId="poll-interval">
                    <SearchableSelect
                      id="poll-interval"
                      value={val('schedule.pollIntervalMinutes')}
                      options={POLL_INTERVAL_OPTIONS}
                      onChange={(v) => set('schedule.pollIntervalMinutes', v)}
                      placeholder="Select interval"
                      isDisabled={adminOnly}
                    />
                  </FormGroup>
                  <FormGroup label={<>Initial History {sourceLabel('schedule.initialLookbackDays')}</>} fieldId="lookback">
                    <SearchableSelect
                      id="lookback"
                      value={val('schedule.initialLookbackDays')}
                      options={LOOKBACK_OPTIONS}
                      onChange={(v) => set('schedule.initialLookbackDays', v)}
                      placeholder="Select range"
                      isDisabled={adminOnly}
                    />
                  </FormGroup>
                </Form>
              </CardBody>
            </Card>
          </GridItem>

          {/* Links */}
          <GridItem span={12} md={6}>
            <Card>
              <CardTitle>Links</CardTitle>
              <CardBody>
                <Content component="small" className="app-text-muted app-mb-md">
                  External URLs used in email/Slack notifications and Polarion test case links.
                </Content>
                <Form>
                  <FormGroup label={<>Dashboard URL {sourceLabel('dashboard.url')}</>} fieldId="dashboard-url">
                    <TextInput id="dashboard-url" value={val('dashboard.url')} onChange={(_e, v) => set('dashboard.url', v)} placeholder="https://your-dashboard.example.com" isDisabled={adminOnly} />
                  </FormGroup>
                  <FormGroup label={<>Polarion URL {sourceLabel('polarion.url')}</>} fieldId="polarion-url">
                    <TextInput id="polarion-url" value={val('polarion.url')} onChange={(_e, v) => set('polarion.url', v)} placeholder="https://polarion.example.com/..." isDisabled={adminOnly} />
                  </FormGroup>
                </Form>
              </CardBody>
            </Card>
          </GridItem>

          {/* System Info */}
          {/* Notification Subscriptions */}
          <GridItem span={12}>
            <Card>
              <CardTitle>
                <Flex justifyContent={{ default: 'justifyContentSpaceBetween' }} alignItems={{ default: 'alignItemsCenter' }}>
                  <FlexItem>Notification Subscriptions</FlexItem>
                  <FlexItem>
                    <Button
                      variant="primary"
                      size="sm"
                      icon={<PlusCircleIcon />}
                      isDisabled={!!newRow}
                      onClick={() => { setNewRow({ name: '', components: [], slackWebhook: '', jiraWebhook: '', emailRecipients: '', schedule: '0 7 * * *', enabled: true }); setNewRowTested(false); setSubTestMessages(prev => { const n = { ...prev }; delete n['new']; return n; }); }}
                    >
                      Add
                    </Button>
                  </FlexItem>
                </Flex>
              </CardTitle>
              <CardBody>
                <Content component="small" className="app-text-muted app-mb-md">
                  Configure where and when to send test reports and Jira bug alerts. Each subscription can target specific components with its own Slack channel, email list, and schedule.
                </Content>
                <Alert variant="info" isInline isPlain className="app-mb-md" title="How to set up webhooks">
                  <Content component="small">
                    <strong>Slack Webhook:</strong> Go to api.slack.com/apps &gt; Create New App &gt; From scratch &gt; Incoming Webhooks &gt; Activate &gt; Add New Webhook to Workspace &gt; Select channel &gt; Copy URL.
                    <br />
                    <strong>Jira Webhook:</strong> Same as Slack — create a separate webhook for the channel where you want Jira bug creation alerts.
                    <br />
                    <strong>Email:</strong> Comma-separated addresses. Uses the SMTP server configured above.
                    <br />
                    <strong>Test:</strong> Click Test on a new row to verify delivery before saving. Save is only enabled after a successful test.
                  </Content>
                </Alert>
                {subSaveMsg && <Alert variant={subSaveMsg.type} isInline title={subSaveMsg.text} className="app-mb-md" />}
                <div className="app-table-scroll app-table-wide">
                <Table aria-label="Notification subscriptions" variant="compact">
                  <Thead>
                    <Tr>
                      <Th>Name</Th>
                      <Th>Components</Th>
                      <Th>Slack Webhook</Th>
                      <Th>Jira Webhook</Th>
                      <Th>Email Recipients</Th>
                      <Th>Schedule</Th>
                      <Th style={{ minWidth: 80 }}>Enabled</Th>
                      <Th style={{ minWidth: 80 }}>Owner</Th>
                      <Th style={{ minWidth: 100 }}>Actions</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {(subs || []).map(sub => {
                      const canEdit = isAdmin || sub.createdBy === user.email;
                      const isEditing = editingSubId === sub.id;
                      return (
                        <Tr key={sub.id}>
                          <Td className="app-cell-nowrap">
                            {isEditing ? (
                              <TextInput value={editDraft.name ?? sub.name} onChange={(_e, v) => setEditDraft(d => ({ ...d, name: v }))} aria-label="Name" />
                            ) : (
                              <Tooltip content={sub.name}><span className="app-cell-truncate">{sub.name}</span></Tooltip>
                            )}
                          </Td>
                          <Td className="app-cell-nowrap">
                            {isEditing ? (
                              <ComponentMultiSelect
                                id={`sub-comp-${sub.id}`}
                                selected={new Set(editDraft.components ?? sub.components)}
                                options={availableComponents ?? []}
                                onChange={(s) => setEditDraft(d => ({ ...d, components: [...s] }))}
                              />
                            ) : (sub.components.length === 0 ? <Label color="blue" isCompact>All</Label> : sub.components.map(c => <Label key={c} color="grey" isCompact className="app-mr-sm">{c}</Label>))}
                          </Td>
                          <Td>
                            {isEditing ? (
                              <TextInput value={editDraft.slackWebhook ?? sub.slackWebhook ?? ''} onChange={(_e, v) => setEditDraft(d => ({ ...d, slackWebhook: v }))} aria-label="Webhook" />
                            ) : (
                              <Tooltip content={sub.slackWebhook || '--'}><span className="app-cell-truncate">{sub.slackWebhook ? '.../' + sub.slackWebhook.split('/').slice(-1)[0] : '--'}</span></Tooltip>
                            )}
                          </Td>
                          <Td>
                            {isEditing ? (
                              <TextInput value={editDraft.jiraWebhook ?? sub.jiraWebhook ?? ''} onChange={(_e, v) => setEditDraft(d => ({ ...d, jiraWebhook: v }))} aria-label="Jira Webhook" />
                            ) : (
                              <Tooltip content={sub.jiraWebhook || '--'}><span className="app-cell-truncate">{sub.jiraWebhook ? '.../' + sub.jiraWebhook.split('/').slice(-1)[0] : '--'}</span></Tooltip>
                            )}
                          </Td>
                          <Td>
                            {isEditing ? (
                              <TextInput value={editDraft.emailRecipients !== undefined ? (editDraft.emailRecipients as string[]).join(', ') : sub.emailRecipients.join(', ')} onChange={(_e, v) => setEditDraft(d => ({ ...d, emailRecipients: v.split(',').map(e => e.trim()).filter(Boolean) }))} aria-label="Emails" />
                            ) : (
                              <Tooltip content={sub.emailRecipients.join(', ') || '--'}><span className="app-cell-truncate">{sub.emailRecipients.length > 0 ? sub.emailRecipients.join(', ') : '--'}</span></Tooltip>
                            )}
                          </Td>
                          <Td className="app-cell-nowrap">
                            {isEditing ? (
                              <ScheduleInlineEditor schedule={editDraft.schedule ?? sub.schedule} onChange={(v) => setEditDraft(d => ({ ...d, schedule: v }))} />
                            ) : formatScheduleLabel(sub.schedule)}
                          </Td>
                          <Td>
                            <Switch
                              id={`sub-enabled-${sub.id}`}
                              isChecked={sub.enabled}
                              onChange={(_e, checked) => updateSub.mutate({ id: sub.id, data: { enabled: checked } })}
                              isDisabled={!canEdit}
                              aria-label="Toggle notification"
                            />
                          </Td>
                          <Td>{sub.createdBy ? <Label color="grey" isCompact>{sub.createdBy.split('@')[0]}</Label> : '--'}</Td>
                          <Td>
                            {isEditing ? (
                              <Flex spaceItems={{ default: 'spaceItemsXs' }} flexWrap={{ default: 'nowrap' }}>
                                <FlexItem><Button variant="primary" size="sm" onClick={() => updateSub.mutate({ id: sub.id, data: editDraft })}>Save</Button></FlexItem>
                                <FlexItem><Button variant="link" size="sm" onClick={() => { setEditingSubId(null); setEditDraft({}); }}>Cancel</Button></FlexItem>
                              </Flex>
                            ) : canEdit ? (
                              <Dropdown
                                isOpen={kebabOpenId === sub.id}
                                onOpenChange={(open) => setKebabOpenId(open ? sub.id : null)}
                                onSelect={() => setKebabOpenId(null)}
                                popperProps={{ position: 'right' }}
                                toggle={(ref) => (
                                  <MenuToggle ref={ref} variant="plain" onClick={() => setKebabOpenId(kebabOpenId === sub.id ? null : sub.id)} isExpanded={kebabOpenId === sub.id} aria-label="Actions">
                                    <EllipsisVIcon />
                                  </MenuToggle>
                                )}
                              >
                                <DropdownList>
                                  {canEdit && <DropdownItem key="edit" onClick={() => { setEditingSubId(sub.id); setEditDraft({}); }}>Edit</DropdownItem>}
                                  {canEdit && (
                                    <DropdownItem key="test" onClick={() => testSub.mutate(sub.id)}>
                                      {testingSubId === sub.id ? 'Testing...' : 'Test'}
                                    </DropdownItem>
                                  )}
                                  {canEdit && <DropdownItem key="delete" isDanger onClick={() => deleteSub.mutate(sub.id)}>Delete</DropdownItem>}
                                </DropdownList>
                              </Dropdown>
                            ) : null}
                            {subTestMessages[sub.id] && <Alert variant={subTestMessages[sub.id].type} isInline isPlain title={subTestMessages[sub.id].text} className="app-mt-sm" />}
                          </Td>
                        </Tr>
                      );
                    })}
                    {newRow && (
                      <Tr>
                        <Td><TextInput value={newRow.name} onChange={(_e, v) => { setNewRow(r => r ? { ...r, name: v } : r); setNewRowTested(false); }} placeholder="Name" aria-label="Name" /></Td>
                        <Td>
                          <ComponentMultiSelect
                            id="new-sub-comp"
                            selected={new Set(newRow.components || [])}
                            options={availableComponents ?? []}
                            onChange={(s) => { setNewRow(r => r ? { ...r, components: [...s] } : r); setNewRowTested(false); }}
                          />
                        </Td>
                        <Td><TextInput value={newRow.slackWebhook} onChange={(_e, v) => { setNewRow(r => r ? { ...r, slackWebhook: v } : r); setNewRowTested(false); }} placeholder="https://hooks.slack.com/..." aria-label="Webhook" /></Td>
                        <Td><TextInput value={newRow.jiraWebhook} onChange={(_e, v) => { setNewRow(r => r ? { ...r, jiraWebhook: v } : r); setNewRowTested(false); }} placeholder="Jira bug webhook" aria-label="Jira Webhook" /></Td>
                        <Td><TextInput value={newRow.emailRecipients} onChange={(_e, v) => { setNewRow(r => r ? { ...r, emailRecipients: v } : r); setNewRowTested(false); }} placeholder="a@b.com, c@d.com" aria-label="Emails" /></Td>
                        <Td><ScheduleInlineEditor schedule={newRow.schedule} onChange={(v) => { setNewRow(r => r ? { ...r, schedule: v } : r); setNewRowTested(false); }} /></Td>
                        <Td><Label color="green" isCompact>Yes</Label></Td>
                        <Td><Label color="grey" isCompact>{user.email.split('@')[0]}</Label></Td>
                        <Td>
                          <Flex spaceItems={{ default: 'spaceItemsXs' }} flexWrap={{ default: 'nowrap' }}>
                            <FlexItem>
                              <Button variant="secondary" size="sm" onClick={() => testNewRow.mutate()} isLoading={testingSubId === 'new'} isDisabled={!newRow.name.trim() || (!newRow.slackWebhook && !newRow.emailRecipients)}>
                                Test
                              </Button>
                            </FlexItem>
                            <FlexItem>
                              <Button
                                variant="primary"
                                size="sm"
                                isDisabled={!newRowTested}
                                isLoading={createSub.isPending}
                                onClick={() => createSub.mutate({
                                  name: newRow.name,
                                  components: newRow.components,
                                  slackWebhook: newRow.slackWebhook,
                                  jiraWebhook: newRow.jiraWebhook,
                                  emailRecipients: newRow.emailRecipients.split(',').map(e => e.trim()).filter(Boolean),
                                  schedule: newRow.schedule,
                                  enabled: true,
                                })}
                              >
                                Save
                              </Button>
                            </FlexItem>
                            <FlexItem><Button variant="link" size="sm" onClick={() => { setNewRow(null); setNewRowTested(false); }}>Cancel</Button></FlexItem>
                          </Flex>
                          {subTestMessages['new'] && <Alert variant={subTestMessages['new'].type} isInline isPlain title={subTestMessages['new'].text} className="app-mt-sm" />}
                        </Td>
                      </Tr>
                    )}
                  </Tbody>
                </Table>
                </div>
              </CardBody>
            </Card>
          </GridItem>

          {/* Admin: User Management */}
          {isAdmin && (
            <GridItem span={12}>
              <Card>
                <CardTitle>User Management</CardTitle>
                <CardBody>
                  {!adminUsers ? (
                    <Spinner aria-label="Loading users" />
                  ) : adminUsers.length === 0 ? (
                    <Alert variant="info" isInline title="No users have logged in yet." />
                  ) : (
                    <div className="app-table-scroll">
                    <Table aria-label="Users" variant="compact">
                      <Thead>
                        <Tr>
                          <Th>Email</Th>
                          <Th>Name</Th>
                          <Th>Role</Th>
                          <Th>Last Login</Th>
                          <Th>Actions</Th>
                        </Tr>
                      </Thead>
                      <Tbody>
                        {adminUsers.map(u => (
                          <Tr key={u.email}>
                            <Td className="app-cell-nowrap">{u.email}</Td>
                            <Td className="app-cell-nowrap">{u.name}</Td>
                            <Td><Label color={u.role === 'admin' ? 'purple' : 'grey'} isCompact>{u.role}</Label></Td>
                            <Td className="app-cell-nowrap">{u.lastLogin ? new Date(u.lastLogin).toLocaleString() : 'Never'}</Td>
                            <Td>
                              <Button
                                variant="link"
                                size="sm"
                                onClick={() => setRole.mutate({ email: u.email, role: u.role === 'admin' ? 'user' : 'admin' })}
                              >
                                {u.role === 'admin' ? 'Demote to User' : 'Promote to Admin'}
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
          )}

          {/* Bootstrap Admin -- only shown when no admin exists and secret is configured */}
          {!isAdmin && !adminStatus?.hasAdmin && (
            <GridItem span={12} md={6}>
              <Card>
                <CardTitle>Become Admin</CardTitle>
                <CardBody>
                  <Content component="small" className="app-text-muted app-mb-md">
                    No admin has been set up yet. Enter the admin secret (configured in the server environment) to claim admin privileges.
                  </Content>
                  <Form>
                    <FormGroup label="Admin Secret" fieldId="bootstrap-secret">
                      <TextInput
                        id="bootstrap-secret"
                        type="password"
                        value={bootstrapSecret}
                        onChange={(_e, v) => setBootstrapSecret(v)}
                        placeholder="Enter the admin secret"
                      />
                    </FormGroup>
                    <Button variant="primary" size="sm" onClick={() => bootstrapAdmin.mutate()} isDisabled={!bootstrapSecret.trim()} isLoading={bootstrapAdmin.isPending}>
                      Bootstrap Admin
                    </Button>
                    {bootstrapMsg && <Alert variant={bootstrapMsg.type} isInline isPlain title={bootstrapMsg.text} className="app-mt-sm" />}
                  </Form>
                </CardBody>
              </Card>
            </GridItem>
          )}

          <GridItem span={12}>
            <Card>
              <CardTitle>System Information</CardTitle>
              <CardBody>
                <Flex alignItems={{ default: 'alignItemsCenter' }} spaceItems={{ default: 'spaceItemsLg' }}>
                  <FlexItem>
                    <span>Uptime: <strong>{formatUptime(sys.uptime)}</strong></span>
                  </FlexItem>
                  <FlexItem><SystemHealth /></FlexItem>
                </Flex>
              </CardBody>
            </Card>
          </GridItem>
        </Grid>
      </PageSection>
    </>
  );
};

type HealthCheck = { status: 'up' | 'down'; message: string };

const SystemHealth: React.FC = () => {
  const { data, isLoading } = useQuery({
    queryKey: ['systemHealth'],
    queryFn: () => apiFetch<Record<string, HealthCheck>>('/settings/health'),
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
  });

  if (isLoading || !data) return <Spinner size="md" aria-label="Checking services" />;

  const services = [
    { key: 'reportportal', label: 'ReportPortal' },
    { key: 'jira', label: 'Jira' },
  ];

  return (
    <Flex spaceItems={{ default: 'spaceItemsMd' }}>
      {services.map(({ key, label }) => {
        const check = data[key];
        if (!check) return null;
        return (
          <FlexItem key={key}>
            <Tooltip content={check.message}>
              <Label
                color={check.status === 'up' ? 'green' : 'red'}
                icon={check.status === 'up' ? <CheckCircleIcon /> : <ExclamationCircleIcon />}
              >
                {label}: {check.status === 'up' ? 'Online' : 'Offline'}
              </Label>
            </Tooltip>
          </FlexItem>
        );
      })}
    </Flex>
  );
};

const SCHED_DAYS = [
  { id: '1', label: 'M' },
  { id: '2', label: 'T' },
  { id: '3', label: 'W' },
  { id: '4', label: 'T' },
  { id: '5', label: 'F' },
  { id: '6', label: 'S' },
  { id: '0', label: 'S' },
];

const ScheduleInlineEditor: React.FC<{ schedule: string; onChange: (cron: string) => void }> = ({ schedule, onChange }) => {
  const parts = schedule.split(' ');
  const minute = parseInt(parts[0]) || 0;
  const hour = parseInt(parts[1]) || 7;
  const daysPart = parts[4] || '*';

  const days = React.useMemo(() => {
    if (daysPart === '*') return new Set(SCHED_DAYS.map(d => d.id));
    const ids = daysPart.split(',').flatMap(seg => {
      const m = seg.match(/^(\d)-(\d)$/);
      if (m) { const r: string[] = []; for (let i = parseInt(m[1]); i <= parseInt(m[2]); i++) r.push(String(i)); return r; }
      return [seg];
    });
    return new Set(ids);
  }, [daysPart]);

  const rebuild = (h: number, m: number, d: Set<string>) => {
    const ds = d.size === 0 || d.size === 7 ? '*' : [...d].sort((a, b) => parseInt(a) - parseInt(b)).join(',');
    onChange(`${m} ${h} * * ${ds}`);
  };

  return (
    <div className="app-schedule-editor">
      <input
        type="time"
        value={`${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`}
        onChange={(e) => { const [h, m] = e.target.value.split(':').map(Number); if (!isNaN(h) && !isNaN(m)) rebuild(h, m, days); }}
        style={{ padding: '3px 6px', border: '1px solid var(--pf-t--global--border--color--default)', borderRadius: 4, background: 'transparent', color: 'inherit', fontSize: 13, width: 90 }}
      />
      <div className="app-schedule-days">
        {SCHED_DAYS.map((day, i) => (
          <Button
            key={`${day.id}-${i}`}
            variant={days.has(day.id) ? 'primary' : 'plain'}
            size="sm"
            onClick={() => { const next = new Set(days); if (next.has(day.id)) { if (next.size > 1) next.delete(day.id); } else next.add(day.id); rebuild(hour, minute, next); }}
            style={{ padding: '2px 5px', minWidth: 22, fontSize: 11 }}
          >
            {day.label}
          </Button>
        ))}
      </div>
    </div>
  );
};
