import React, { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  PageSection,
  Content,
  Card,
  CardBody,
  CardTitle,
  Button,
  Alert,
  Flex,
  FlexItem,
  Spinner,
  Label,
  Tooltip,
  Modal,
  ModalBody,
  ModalHeader,
  ModalFooter,
  TextInput,
  FormGroup,
  Form,
  ExpandableSection,
} from '@patternfly/react-core';
import {
  CheckCircleIcon,
  ClockIcon,
  SyncAltIcon,
  DownloadIcon,
  UploadIcon,
  MoonIcon,
  SunIcon,
  ExclamationTriangleIcon,
} from '@patternfly/react-icons';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useSettingsState } from '../components/settings/useSettingsState';
import { ReportPortalSettings } from '../components/settings/ReportPortalSettings';
import { JiraSettings } from '../components/settings/JiraSettings';
import { EmailServerSettings } from '../components/settings/EmailServerSettings';
import { PollingSettings } from '../components/settings/PollingSettings';
import { LinksSettings } from '../components/settings/LinksSettings';
import { AISettings } from '../components/settings/AISettings';
import { JenkinsSettings } from '../components/settings/JenkinsSettings';
import { NotificationSubscriptions } from '../components/settings/NotificationSubscriptions';
import { ComponentMappings } from '../components/settings/ComponentMappings';
import { UserManagement, BootstrapAdmin } from '../components/settings/UserManagement';
import { SystemHealth } from '../components/settings/SystemHealth';
import { DataPipeline } from '../components/settings/DataPipeline';
import { formatUptime } from '../components/settings/types';
import { usePreferences } from '../context/PreferencesContext';
import { useToast } from '../context/ToastContext';
import { fetchPollStatus, type PollStatus } from '../api/poll';
import { testRpConnection, testJiraConnection, testJenkinsConnection, fetchSettings, updateSettings } from '../api/settings';
import { apiFetch } from '../api/client';
import { SearchableSelect } from '../components/common/SearchableSelect';
import { RepositoryMappingSection } from '../components/settings/RepositoryMappingSection';
import { PersonalTokensSection } from '../components/settings/PersonalTokensSection';
import { fetchSettingsChangelog, type SettingsLogEntry } from '../api/settings';

const SettingsChangelog: React.FC = () => {
  const { data: log, isLoading } = useQuery<SettingsLogEntry[]>({
    queryKey: ['settingsChangelog'],
    queryFn: fetchSettingsChangelog,
    staleTime: 30_000,
  });

  return (
    <ExpandableSection toggleText={`Settings Changelog${log?.length ? ` (${log.length})` : ''}`}>
      {isLoading ? <Spinner size="md" /> : !log?.length ? (
        <Content component="small" className="app-text-muted">No changes recorded yet.</Content>
      ) : (
        <div className="app-max-h-300">
          {log.map((entry) => (
            <div key={entry.id} className="app-activity-item">
              <Flex spaceItems={{ default: 'spaceItemsSm' }} alignItems={{ default: 'alignItemsCenter' }}>
                <FlexItem><Label isCompact>{entry.key}</Label></FlexItem>
                <FlexItem className="app-text-muted app-text-xs">
                  {entry.old_value ? `${entry.old_value} → ` : ''}{entry.new_value}
                </FlexItem>
                <FlexItem className="app-text-muted app-text-xs">
                  by {entry.changed_by || 'system'} — {new Date(entry.changed_at).toLocaleString()}
                </FlexItem>
              </Flex>
            </div>
          ))}
        </div>
      )}
    </ExpandableSection>
  );
};

const THEME_OPTIONS = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'auto', label: 'System' },
];


const timeAgo = (ts: number | null): string => {
  if (!ts) return 'Never';
  const diff = Math.round((Date.now() - ts) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
};

export const SettingsPage: React.FC = () => {
  useEffect(() => { document.title = 'Settings | CNV Console Monitor'; }, []);

  const state = useSettingsState();
  const {
    data, isLoading, isAdmin,
    val, set, adminOnly,
    tokenEditing, startTokenEdit, endTokenEdit,
    saveMessage, saveAll, saveMutation, hasChanges,
    rpProjectOptions, rpTestMsg, rpTest,
    jiraTestMsg, jiraTest, jiraTokenDirty,
    jiraProjectSelectOptions, issueTypeSelectOptions,
    setJiraTestMode, setJiraMetaOverride, setJiraTestMsg,
  } = state;

  const { preferences, setPreference } = usePreferences();
  const { addToast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTabState] = useState<string | number>(searchParams.get('tab') || 'reportportal');
  const setActiveTab = (tab: string | number) => {
    setActiveTabState(tab);
    setSearchParams({ tab: String(tab) }, { replace: true });
  };
  const [dangerModal, setDangerModal] = useState<string | null>(null);
  const [dangerConfirm, setDangerConfirm] = useState('');

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (!tab) return;
    const target = tab === 'notifications' ? 'notifications' : 'integrations';
    setTimeout(() => document.getElementById(target)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 300);
  }, [searchParams]);

  const { data: pollStatus } = useQuery<PollStatus>({ queryKey: ['pollStatus'], queryFn: fetchPollStatus, refetchInterval: 15_000 });

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 's') {
      e.preventDefault();
      if (hasChanges()) saveAll();
    }
  }, [hasChanges, saveAll]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const testAllMutation = useMutation({
    mutationFn: async () => {
      const results = await Promise.allSettled([
        testRpConnection(),
        testJiraConnection(),
        testJenkinsConnection(),
      ]);
      const services = ['ReportPortal', 'Jira', 'Jenkins'];
      const summary = results.map((r, i) => `${services[i]}: ${r.status === 'fulfilled' ? 'OK' : 'Failed'}`);
      const allOk = results.every(r => r.status === 'fulfilled');
      return { allOk, summary: summary.join(' | ') };
    },
    onSuccess: (result) => addToast(result.allOk ? 'success' : 'warning', result.summary),
    onError: () => addToast('danger', 'Connection test failed'),
  });

  const dangerActions: Record<string, { label: string; description: string; confirmWord: string; action: () => Promise<unknown> }> = {
    clearData: {
      label: 'Clear All Data',
      description: 'This will delete all launches, test items, and trends. Settings and users are preserved.',
      confirmWord: 'DELETE',
      action: () => apiFetch('/poll/backfill', { method: 'POST' }),
    },
    resetSettings: {
      label: 'Reset All Settings',
      description: 'This will remove all custom settings and revert to environment/default values.',
      action: () => apiFetch('/settings/reset', { method: 'POST' }),
      confirmWord: 'RESET',
    },
  };

  const handleDangerConfirm = () => {
    if (!dangerModal) return;
    const action = dangerActions[dangerModal];
    if (!action || dangerConfirm !== action.confirmWord) return;
    setDangerModal(null);
    setDangerConfirm('');
    addToast('info', `${action.label} started...`);
    action.action()
      .catch((e) => addToast('danger', e instanceof Error ? e.message : 'Operation failed'));
  };

  const handleExport = async () => {
    try {
      const settingsData = await fetchSettings();
      const exportData: Record<string, string> = {};
      for (const [key, entry] of Object.entries(settingsData.settings)) {
        if (!key.includes('token') && !key.includes('pass') && !key.includes('secret')) {
          exportData[key] = entry.value;
        }
      }
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `cnv-monitor-settings-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      addToast('success', 'Settings exported (tokens excluded)');
    } catch {
      addToast('danger', 'Failed to export settings');
    }
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const imported = JSON.parse(text) as Record<string, string>;
        await updateSettings(imported);
        addToast('success', `Imported ${Object.keys(imported).length} settings`);
        window.location.reload();
      } catch (err) {
        addToast('danger', err instanceof Error ? err.message : 'Invalid settings file');
      }
    };
    input.click();
  };

  if (isLoading || !data) return <div className="app-page-spinner"><Spinner aria-label="Loading settings" /></div>;

  const sys = data.system;
  const sectionProps = { val, set, adminOnly };
  const tokenHandlers = { tokenEditing, startTokenEdit, endTokenEdit };

  const rpEnabled = Boolean(val('reportportal.url') && val('reportportal.token'));
  const jiraEnabled = sys.jiraEnabled;
  const jenkinsEnabled = Boolean(val('jenkins.user') && val('jenkins.token'));
  const emailEnabled = sys.emailEnabled;

  const nextPollIn = pollStatus?.lastPollAt && pollStatus.pollIntervalMinutes
    ? Math.max(0, Math.round((pollStatus.lastPollAt + pollStatus.pollIntervalMinutes * 60_000 - Date.now()) / 60_000))
    : null;

  const activeDanger = dangerModal ? dangerActions[dangerModal] : null;

  return (
    <>
      {/* Page header */}
      <PageSection>
        <Content component="h1">Settings</Content>
      </PageSection>

      {/* Sticky save bar */}
      {isAdmin && hasChanges() && (
        <PageSection className="app-sticky-save-bar">
          <Flex alignItems={{ default: 'alignItemsCenter' }} justifyContent={{ default: 'justifyContentSpaceBetween' }}>
            <FlexItem>
              <Flex alignItems={{ default: 'alignItemsCenter' }} spaceItems={{ default: 'spaceItemsSm' }}>
                <FlexItem><span className="app-unsaved-dot" /></FlexItem>
                <FlexItem><strong>Unsaved changes</strong></FlexItem>
              </Flex>
            </FlexItem>
            <FlexItem>
              <Flex spaceItems={{ default: 'spaceItemsSm' }}>
                <FlexItem>
                  <Button variant="link" onClick={() => window.location.reload()}>Discard</Button>
                </FlexItem>
                <FlexItem>
                  <Button variant="primary" onClick={saveAll} isLoading={saveMutation.isPending}>Save Changes</Button>
                </FlexItem>
              </Flex>
            </FlexItem>
          </Flex>
        </PageSection>
      )}

      {saveMessage && (
        <PageSection><Alert variant={saveMessage.type} isInline title={saveMessage.text} /></PageSection>
      )}

      {/* System status banner */}
      <PageSection className="app-status-banner">
        <Flex alignItems={{ default: 'alignItemsCenter' }} spaceItems={{ default: 'spaceItemsLg' }} flexWrap={{ default: 'wrap' }}>
          <FlexItem>
            <Tooltip content="Server uptime since last restart">
              <Label isCompact icon={<ClockIcon />}>Uptime: {formatUptime(sys.uptime)}</Label>
            </Tooltip>
          </FlexItem>
          <FlexItem><SystemHealth /></FlexItem>
          {pollStatus && (
            <>
              <FlexItem>
                <Tooltip content={pollStatus.lastPollAt ? new Date(pollStatus.lastPollAt).toLocaleString() : 'No polls yet'}>
                  <Label isCompact color={pollStatus.active ? 'blue' : 'grey'} icon={<SyncAltIcon />}>
                    {pollStatus.active ? `Polling: ${pollStatus.message}` : `Last poll: ${timeAgo(pollStatus.lastPollAt)}`}
                  </Label>
                </Tooltip>
              </FlexItem>
              {nextPollIn !== null && !pollStatus.active && (
                <FlexItem><Label isCompact>Next: {nextPollIn}m</Label></FlexItem>
              )}
            </>
          )}
          <FlexItem>
            <Button variant="link" size="sm" icon={<SyncAltIcon />} onClick={() => testAllMutation.mutate()} isLoading={testAllMutation.isPending}>
              Test All Connections
            </Button>
          </FlexItem>
        </Flex>
        <DataPipeline />
      </PageSection>

      <PageSection>
        {/* Notification Subscriptions */}
        <div className="app-mb-lg" id="notifications">
          <NotificationSubscriptions />
        </div>

        {/* Component Mappings */}
        <div className="app-mb-lg">
          <ComponentMappings />
        </div>

        {/* Integrations - vertical tabs */}
        <Card className="app-mb-lg" id="integrations">
          <CardTitle>Integrations</CardTitle>
          <CardBody>
            <div className="app-vtabs">
              <nav className="app-vtabs-nav">
                {([
                  { key: 'reportportal', label: 'ReportPortal', enabled: rpEnabled },
                  { key: 'jira', label: 'Jira', enabled: jiraEnabled },
                  { key: 'jenkins', label: 'Jenkins', enabled: jenkinsEnabled },
                  { key: 'email', label: 'Email', enabled: emailEnabled },
                  { key: 'polling', label: 'Polling', enabled: true },
                  { key: 'links', label: 'Links', enabled: true },
                  { key: 'ai', label: 'AI', enabled: true },
                ] as const).map(({ key, label, enabled }) => (
                  <button
                    key={key}
                    className={`app-vtabs-btn${activeTab === key ? ' app-vtabs-btn--active' : ''}`}
                    onClick={() => setActiveTab(key)}
                    type="button"
                  >
                    <CheckCircleIcon className={enabled ? 'app-vtabs-icon--ok' : 'app-vtabs-icon--off'} />
                    {label}
                  </button>
                ))}
              </nav>
              <div className="app-vtabs-panel">
                {activeTab === 'reportportal' && (
                  <ReportPortalSettings {...sectionProps} {...tokenHandlers} rpProjectOptions={rpProjectOptions} rpTestMsg={rpTestMsg} onTestConnection={() => rpTest.mutate()} isTestPending={rpTest.isPending} />
                )}
                {activeTab === 'jira' && (
                  <JiraSettings
                    {...sectionProps}
                    {...tokenHandlers}
                    jiraEnabled={jiraEnabled}
                    jiraProjectSelectOptions={jiraProjectSelectOptions}
                    issueTypeSelectOptions={issueTypeSelectOptions}
                    jiraTestMsg={jiraTestMsg}
                    onTokenChange={(v) => { set('jira.token', v); setJiraTestMode(false); setJiraMetaOverride(null); setJiraTestMsg(null); }}
                    onTestConnection={() => {
                      if (jiraTokenDirty) { set('jira.projectKey', ''); set('jira.issueType', ''); set('jira.component', ''); setJiraMetaOverride({ projects: [], issueTypes: [], components: [] }); }
                      setJiraTestMode(true);
                      jiraTest.mutate();
                    }}
                    isTestPending={jiraTest.isPending}
                  />
                )}
                {activeTab === 'jenkins' && <JenkinsSettings {...sectionProps} {...tokenHandlers} />}
                {activeTab === 'email' && <EmailServerSettings {...sectionProps} emailEnabled={emailEnabled} />}
                {activeTab === 'polling' && <PollingSettings {...sectionProps} />}
                {activeTab === 'links' && <LinksSettings {...sectionProps} />}
                {activeTab === 'ai' && <AISettings />}
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Notification Preview */}
        <Card className="app-mb-lg">
          <CardTitle>Notification Preview</CardTitle>
          <CardBody>
            <Content component="small" className="app-text-muted app-mb-md">
              Preview what the daily Slack or email notification looks like using the latest data.
            </Content>
            <Flex spaceItems={{ default: 'spaceItemsSm' }}>
              <FlexItem>
                <Button variant="secondary" size="sm" onClick={() => window.open('/api/notifications/preview/email', '_blank')}>
                  Preview Email
                </Button>
              </FlexItem>
              <FlexItem>
                <Button variant="secondary" size="sm" onClick={() => window.open('/api/notifications/preview/slack', '_blank')}>
                  Preview Slack JSON
                </Button>
              </FlexItem>
            </Flex>
          </CardBody>
        </Card>

        {/* User Management */}
        <div className="app-mb-lg">
          <UserManagement />
        </div>

        <div className="app-mb-lg">
          <BootstrapAdmin />
        </div>

        {/* Danger Zone */}
        {isAdmin && (
          <Card className="app-mb-lg app-danger-zone">
            <CardTitle><Flex alignItems={{ default: 'alignItemsCenter' }} spaceItems={{ default: 'spaceItemsSm' }}><FlexItem><ExclamationTriangleIcon /></FlexItem><FlexItem>Danger Zone</FlexItem></Flex></CardTitle>
            <CardBody>
              <Content component="small" className="app-text-muted app-mb-md">
                These actions are destructive and cannot be undone. Proceed with caution.
              </Content>
              <Flex spaceItems={{ default: 'spaceItemsMd' }} flexWrap={{ default: 'wrap' }}>
                <FlexItem>
                  <Button variant="danger" onClick={() => { setDangerModal('clearData'); setDangerConfirm(''); }}>Clear All Data</Button>
                </FlexItem>
                <FlexItem>
                  <Button variant="danger" onClick={() => { setDangerModal('resetSettings'); setDangerConfirm(''); }}>Reset All Settings</Button>
                </FlexItem>
              </Flex>
            </CardBody>
          </Card>
        )}

        {/* About */}
        <Card>
          <CardTitle>About</CardTitle>
          <CardBody>
            <Flex spaceItems={{ default: 'spaceItemsLg' }} flexWrap={{ default: 'wrap' }} alignItems={{ default: 'alignItemsCenter' }} className="app-mb-md">
              <FlexItem>
                <Content component="small" className="app-text-muted">CNV Console Monitor</Content>
              </FlexItem>
              <FlexItem>
                <Flex alignItems={{ default: 'alignItemsCenter' }} spaceItems={{ default: 'spaceItemsSm' }}>
                  <FlexItem>{preferences.theme === 'dark' ? <MoonIcon /> : <SunIcon />}</FlexItem>
                  <FlexItem>
                    <SearchableSelect
                      id="theme-select"
                      value={preferences.theme || 'auto'}
                      options={THEME_OPTIONS}
                      onChange={(v) => setPreference('theme', v as 'light' | 'dark' | 'auto')}
                      placeholder="Theme"
                    />
                  </FlexItem>
                </Flex>
              </FlexItem>
              {isAdmin && (
                <>
                  <FlexItem>
                    <Button variant="secondary" size="sm" icon={<DownloadIcon />} onClick={handleExport}>Export Settings</Button>
                  </FlexItem>
                  <FlexItem>
                    <Button variant="secondary" size="sm" icon={<UploadIcon />} onClick={handleImport}>Import Settings</Button>
                  </FlexItem>
                </>
              )}
            </Flex>
            {isAdmin && <SettingsChangelog />}
          </CardBody>
        </Card>
      </PageSection>

      <PageSection>
        <RepositoryMappingSection />
      </PageSection>

      <PageSection>
        <PersonalTokensSection />
      </PageSection>

      {/* Danger zone confirmation modal */}
      {activeDanger && (
        <Modal isOpen onClose={() => setDangerModal(null)} variant="small">
          <ModalHeader title={activeDanger.label} />
          <ModalBody>
            <Alert variant="danger" isInline title={activeDanger.description} className="app-mb-md" />
            <Form>
              <FormGroup label={`Type "${activeDanger.confirmWord}" to confirm`} fieldId="danger-confirm">
                <TextInput id="danger-confirm" value={dangerConfirm} onChange={(_e, v) => setDangerConfirm(v)} placeholder={activeDanger.confirmWord} />
              </FormGroup>
            </Form>
          </ModalBody>
          <ModalFooter>
            <Button variant="danger" onClick={handleDangerConfirm} isDisabled={dangerConfirm !== activeDanger.confirmWord}>
              {activeDanger.label}
            </Button>
            <Button variant="link" onClick={() => setDangerModal(null)}>Cancel</Button>
          </ModalFooter>
        </Modal>
      )}
    </>
  );
};
