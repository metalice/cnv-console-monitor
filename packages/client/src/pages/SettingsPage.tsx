import React, { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import {
  Alert,
  Button,
  Card,
  CardBody,
  CardTitle,
  Content,
  ExpandableSection,
  Flex,
  FlexItem,
  Form,
  FormGroup,
  Label,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  PageSection,
  Spinner,
  TextInput,
  Tooltip,
} from '@patternfly/react-core';
import {
  CheckCircleIcon,
  ClockIcon,
  DownloadIcon,
  ExclamationTriangleIcon,
  MoonIcon,
  SunIcon,
  SyncAltIcon,
  UploadIcon,
} from '@patternfly/react-icons';
import { useMutation, useQuery } from '@tanstack/react-query';

import { apiFetch } from '../api/client';
import { fetchPollStatus, type PollStatus } from '../api/poll';
import {
  fetchSettings,
  testJenkinsConnection,
  testJiraConnection,
  testRpConnection,
  updateSettings,
} from '../api/settings';
import { fetchSettingsChangelog, type SettingsLogEntry } from '../api/settings';
import { SearchableSelect } from '../components/common/SearchableSelect';
import { AISettings } from '../components/settings/AISettings';
import { ComponentMappings } from '../components/settings/ComponentMappings';
import { DataPipeline } from '../components/settings/DataPipeline';
import { EmailServerSettings } from '../components/settings/EmailServerSettings';
import { GitSettings } from '../components/settings/GitSettings';
import { JenkinsSettings } from '../components/settings/JenkinsSettings';
import { JiraSettings } from '../components/settings/JiraSettings';
import { LinksSettings } from '../components/settings/LinksSettings';
import { NotificationSubscriptions } from '../components/settings/NotificationSubscriptions';
import { PersonalTokensSection } from '../components/settings/PersonalTokensSection';
import { PollingSettings } from '../components/settings/PollingSettings';
import { ReportPortalSettings } from '../components/settings/ReportPortalSettings';
import { RepositoryMappingSection } from '../components/settings/RepositoryMappingSection';
import { SystemHealth } from '../components/settings/SystemHealth';
import { formatUptime } from '../components/settings/types';
import { BootstrapAdmin, UserManagement } from '../components/settings/UserManagement';
import { useSettingsState } from '../components/settings/useSettingsState';
import { usePreferences } from '../context/PreferencesContext';
import { useToast } from '../context/ToastContext';

const SettingsChangelog: React.FC = () => {
  const { data: log, isLoading } = useQuery<SettingsLogEntry[]>({
    queryFn: fetchSettingsChangelog,
    queryKey: ['settingsChangelog'],
    staleTime: 30_000,
  });

  return (
    <ExpandableSection toggleText={`Settings Changelog${log?.length ? ` (${log.length})` : ''}`}>
      {isLoading ? (
        <Spinner size="md" />
      ) : !log?.length ? (
        <Content className="app-text-muted" component="small">
          No changes recorded yet.
        </Content>
      ) : (
        <div className="app-max-h-300">
          {log.map(entry => (
            <div className="app-activity-item" key={entry.id}>
              <Flex
                alignItems={{ default: 'alignItemsCenter' }}
                spaceItems={{ default: 'spaceItemsSm' }}
              >
                <FlexItem>
                  <Label isCompact>{entry.key}</Label>
                </FlexItem>
                <FlexItem className="app-text-muted app-text-xs">
                  {entry.old_value ? `${entry.old_value} → ` : ''}
                  {entry.new_value}
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
  { label: 'Light', value: 'light' },
  { label: 'Dark', value: 'dark' },
  { label: 'System', value: 'auto' },
];

const timeAgo = (ts: number | null): string => {
  if (!ts) {
    return 'Never';
  }
  const diff = Math.round((Date.now() - ts) / 1000);
  if (diff < 60) {
    return `${diff}s ago`;
  }
  if (diff < 3600) {
    return `${Math.floor(diff / 60)}m ago`;
  }
  return `${Math.floor(diff / 3600)}h ago`;
};

export const SettingsPage: React.FC = () => {
  useEffect(() => {
    document.title = 'Settings | CNV Console Monitor';
  }, []);

  const state = useSettingsState();
  const {
    adminOnly,
    data,
    endTokenEdit,
    hasChanges,
    isAdmin,
    isLoading,
    issueTypeSelectOptions,
    jiraProjectSelectOptions,
    jiraTest,
    jiraTestMsg,
    jiraTokenDirty,
    rpProjectOptions,
    rpTest,
    rpTestMsg,
    saveAll,
    saveMessage,
    saveMutation,
    set,
    setJiraMetaOverride,
    setJiraTestMode,
    setJiraTestMsg,
    startTokenEdit,
    tokenEditing,
    val,
  } = state;

  const { preferences, setPreference } = usePreferences();
  const { addToast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTabState] = useState<string | number>(
    searchParams.get('tab') || 'reportportal',
  );
  const setActiveTab = (tab: string | number) => {
    setActiveTabState(tab);
    setSearchParams({ tab: String(tab) }, { replace: true });
  };
  const [dangerModal, setDangerModal] = useState<string | null>(null);
  const [dangerConfirm, setDangerConfirm] = useState('');

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (!tab) {
      return;
    }
    const target = tab === 'notifications' ? 'notifications' : 'integrations';
    setTimeout(
      () => document.getElementById(target)?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
      300,
    );
  }, [searchParams]);

  const { data: pollStatus } = useQuery<PollStatus>({
    queryFn: fetchPollStatus,
    queryKey: ['pollStatus'],
    refetchInterval: 15_000,
  });

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        if (hasChanges()) {
          saveAll();
        }
      }
    },
    [hasChanges, saveAll],
  );

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
      const summary = results.map(
        (r, i) => `${services[i]}: ${r.status === 'fulfilled' ? 'OK' : 'Failed'}`,
      );
      const allOk = results.every(r => r.status === 'fulfilled');
      return { allOk, summary: summary.join(' | ') };
    },
    onError: () => addToast('danger', 'Connection test failed'),
    onSuccess: result => addToast(result.allOk ? 'success' : 'warning', result.summary),
  });

  const dangerActions: Record<
    string,
    { label: string; description: string; confirmWord: string; action: () => Promise<unknown> }
  > = {
    clearData: {
      action: () => apiFetch('/poll/backfill', { method: 'POST' }),
      confirmWord: 'DELETE',
      description:
        'This will delete all launches, test items, and trends. Settings and users are preserved.',
      label: 'Clear All Data',
    },
    resetSettings: {
      action: () => apiFetch('/settings/reset', { method: 'POST' }),
      confirmWord: 'RESET',
      description: 'This will remove all custom settings and revert to environment/default values.',
      label: 'Reset All Settings',
    },
  };

  const handleDangerConfirm = () => {
    if (!dangerModal) {
      return;
    }
    const action = dangerActions[dangerModal];
    if (dangerConfirm !== action?.confirmWord) {
      return;
    }
    setDangerModal(null);
    setDangerConfirm('');
    addToast('info', `${action.label} started...`);
    action
      .action()
      .catch(e => addToast('danger', e instanceof Error ? e.message : 'Operation failed'));
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
    input.onchange = async e => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) {
        return;
      }
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

  if (isLoading || !data) {
    return (
      <div className="app-page-spinner">
        <Spinner aria-label="Loading settings" />
      </div>
    );
  }

  const sys = data.system;
  const sectionProps = { adminOnly, set, val };
  const tokenHandlers = { endTokenEdit, startTokenEdit, tokenEditing };

  const rpEnabled = Boolean(val('reportportal.url') && val('reportportal.token'));
  const { jiraEnabled } = sys;
  const jenkinsEnabled = Boolean(val('jenkins.user') && val('jenkins.token'));
  const { emailEnabled } = sys;

  const nextPollIn =
    pollStatus?.lastPollAt && pollStatus.pollIntervalMinutes
      ? Math.max(
          0,
          Math.round(
            (pollStatus.lastPollAt + pollStatus.pollIntervalMinutes * 60_000 - Date.now()) / 60_000,
          ),
        )
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
          <Flex
            alignItems={{ default: 'alignItemsCenter' }}
            justifyContent={{ default: 'justifyContentSpaceBetween' }}
          >
            <FlexItem>
              <Flex
                alignItems={{ default: 'alignItemsCenter' }}
                spaceItems={{ default: 'spaceItemsSm' }}
              >
                <FlexItem>
                  <span className="app-unsaved-dot" />
                </FlexItem>
                <FlexItem>
                  <strong>Unsaved changes</strong>
                </FlexItem>
              </Flex>
            </FlexItem>
            <FlexItem>
              <Flex spaceItems={{ default: 'spaceItemsSm' }}>
                <FlexItem>
                  <Button variant="link" onClick={() => window.location.reload()}>
                    Discard
                  </Button>
                </FlexItem>
                <FlexItem>
                  <Button isLoading={saveMutation.isPending} variant="primary" onClick={saveAll}>
                    Save Changes
                  </Button>
                </FlexItem>
              </Flex>
            </FlexItem>
          </Flex>
        </PageSection>
      )}

      {saveMessage && (
        <PageSection>
          <Alert isInline title={saveMessage.text} variant={saveMessage.type} />
        </PageSection>
      )}

      {/* System status banner */}
      <PageSection className="app-status-banner">
        <Flex
          alignItems={{ default: 'alignItemsCenter' }}
          flexWrap={{ default: 'wrap' }}
          spaceItems={{ default: 'spaceItemsLg' }}
        >
          <FlexItem>
            <Tooltip content="Server uptime since last restart">
              <Label isCompact icon={<ClockIcon />}>
                Uptime: {formatUptime(sys.uptime)}
              </Label>
            </Tooltip>
          </FlexItem>
          <FlexItem>
            <SystemHealth />
          </FlexItem>
          {pollStatus && (
            <>
              <FlexItem>
                <Tooltip
                  content={
                    pollStatus.lastPollAt
                      ? new Date(pollStatus.lastPollAt).toLocaleString()
                      : 'No polls yet'
                  }
                >
                  <Label
                    isCompact
                    color={pollStatus.active ? 'blue' : 'grey'}
                    icon={<SyncAltIcon />}
                  >
                    {pollStatus.active
                      ? `Polling: ${pollStatus.message}`
                      : `Last poll: ${timeAgo(pollStatus.lastPollAt)}`}
                  </Label>
                </Tooltip>
              </FlexItem>
              {nextPollIn !== null && !pollStatus.active && (
                <FlexItem>
                  <Label isCompact>Next: {nextPollIn}m</Label>
                </FlexItem>
              )}
            </>
          )}
          <FlexItem>
            <Button
              icon={<SyncAltIcon />}
              isLoading={testAllMutation.isPending}
              size="sm"
              variant="link"
              onClick={() => testAllMutation.mutate()}
            >
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
                {(
                  [
                    { enabled: rpEnabled, key: 'reportportal', label: 'ReportPortal' },
                    { enabled: jiraEnabled, key: 'jira', label: 'Jira' },
                    { enabled: jenkinsEnabled, key: 'jenkins', label: 'Jenkins' },
                    {
                      enabled: Boolean(val('gitlab.token') || val('github.token')),
                      key: 'git',
                      label: 'Git',
                    },
                    { enabled: emailEnabled, key: 'email', label: 'Email' },
                    { enabled: true, key: 'polling', label: 'Polling' },
                    { enabled: true, key: 'links', label: 'Links' },
                    { enabled: true, key: 'ai', label: 'AI' },
                  ] as const
                ).map(({ enabled, key, label }) => (
                  <button
                    className={`app-vtabs-btn${activeTab === key ? ' app-vtabs-btn--active' : ''}`}
                    key={key}
                    type="button"
                    onClick={() => setActiveTab(key)}
                  >
                    <CheckCircleIcon
                      className={enabled ? 'app-vtabs-icon--ok' : 'app-vtabs-icon--off'}
                    />
                    {label}
                  </button>
                ))}
              </nav>
              <div className="app-vtabs-panel">
                {activeTab === 'reportportal' && (
                  <ReportPortalSettings
                    {...sectionProps}
                    {...tokenHandlers}
                    isTestPending={rpTest.isPending}
                    rpProjectOptions={rpProjectOptions}
                    rpTestMsg={rpTestMsg}
                    onTestConnection={() => rpTest.mutate()}
                  />
                )}
                {activeTab === 'jira' && (
                  <JiraSettings
                    {...sectionProps}
                    {...tokenHandlers}
                    isTestPending={jiraTest.isPending}
                    issueTypeSelectOptions={issueTypeSelectOptions}
                    jiraEnabled={jiraEnabled}
                    jiraProjectSelectOptions={jiraProjectSelectOptions}
                    jiraTestMsg={jiraTestMsg}
                    onTestConnection={() => {
                      if (jiraTokenDirty) {
                        set('jira.projectKey', '');
                        set('jira.issueType', '');
                        set('jira.component', '');
                        setJiraMetaOverride({ components: [], issueTypes: [], projects: [] });
                      }
                      setJiraTestMode(true);
                      jiraTest.mutate();
                    }}
                    onTokenChange={v => {
                      set('jira.token', v);
                      setJiraTestMode(false);
                      setJiraMetaOverride(null);
                      setJiraTestMsg(null);
                    }}
                  />
                )}
                {activeTab === 'jenkins' && (
                  <JenkinsSettings {...sectionProps} {...tokenHandlers} />
                )}
                {activeTab === 'git' && <GitSettings {...sectionProps} {...tokenHandlers} />}
                {activeTab === 'email' && (
                  <EmailServerSettings {...sectionProps} emailEnabled={emailEnabled} />
                )}
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
            <Content className="app-text-muted app-mb-md" component="small">
              Preview what the daily Slack or email notification looks like using the latest data.
            </Content>
            <Flex spaceItems={{ default: 'spaceItemsSm' }}>
              <FlexItem>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => window.open('/api/notifications/preview/email', '_blank')}
                >
                  Preview Email
                </Button>
              </FlexItem>
              <FlexItem>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => window.open('/api/notifications/preview/slack', '_blank')}
                >
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
            <CardTitle>
              <Flex
                alignItems={{ default: 'alignItemsCenter' }}
                spaceItems={{ default: 'spaceItemsSm' }}
              >
                <FlexItem>
                  <ExclamationTriangleIcon />
                </FlexItem>
                <FlexItem>Danger Zone</FlexItem>
              </Flex>
            </CardTitle>
            <CardBody>
              <Content className="app-text-muted app-mb-md" component="small">
                These actions are destructive and cannot be undone. Proceed with caution.
              </Content>
              <Flex flexWrap={{ default: 'wrap' }} spaceItems={{ default: 'spaceItemsMd' }}>
                <FlexItem>
                  <Button
                    variant="danger"
                    onClick={() => {
                      setDangerModal('clearData');
                      setDangerConfirm('');
                    }}
                  >
                    Clear All Data
                  </Button>
                </FlexItem>
                <FlexItem>
                  <Button
                    variant="danger"
                    onClick={() => {
                      setDangerModal('resetSettings');
                      setDangerConfirm('');
                    }}
                  >
                    Reset All Settings
                  </Button>
                </FlexItem>
              </Flex>
            </CardBody>
          </Card>
        )}

        {/* About */}
        <Card>
          <CardTitle>About</CardTitle>
          <CardBody>
            <Flex
              alignItems={{ default: 'alignItemsCenter' }}
              className="app-mb-md"
              flexWrap={{ default: 'wrap' }}
              spaceItems={{ default: 'spaceItemsLg' }}
            >
              <FlexItem>
                <Content className="app-text-muted" component="small">
                  CNV Console Monitor
                </Content>
              </FlexItem>
              <FlexItem>
                <Flex
                  alignItems={{ default: 'alignItemsCenter' }}
                  spaceItems={{ default: 'spaceItemsSm' }}
                >
                  <FlexItem>{preferences.theme === 'dark' ? <MoonIcon /> : <SunIcon />}</FlexItem>
                  <FlexItem>
                    <SearchableSelect
                      id="theme-select"
                      options={THEME_OPTIONS}
                      placeholder="Theme"
                      value={preferences.theme || 'auto'}
                      onChange={v => setPreference('theme', v as 'light' | 'dark' | 'auto')}
                    />
                  </FlexItem>
                </Flex>
              </FlexItem>
              {isAdmin && (
                <>
                  <FlexItem>
                    <Button
                      icon={<DownloadIcon />}
                      size="sm"
                      variant="secondary"
                      onClick={handleExport}
                    >
                      Export Settings
                    </Button>
                  </FlexItem>
                  <FlexItem>
                    <Button
                      icon={<UploadIcon />}
                      size="sm"
                      variant="secondary"
                      onClick={handleImport}
                    >
                      Import Settings
                    </Button>
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
        <Modal isOpen variant="small" onClose={() => setDangerModal(null)}>
          <ModalHeader title={activeDanger.label} />
          <ModalBody>
            <Alert
              isInline
              className="app-mb-md"
              title={activeDanger.description}
              variant="danger"
            />
            <Form>
              <FormGroup
                fieldId="danger-confirm"
                label={`Type "${activeDanger.confirmWord}" to confirm`}
              >
                <TextInput
                  id="danger-confirm"
                  placeholder={activeDanger.confirmWord}
                  value={dangerConfirm}
                  onChange={(_e, v) => setDangerConfirm(v)}
                />
              </FormGroup>
            </Form>
          </ModalBody>
          <ModalFooter>
            <Button
              isDisabled={dangerConfirm !== activeDanger.confirmWord}
              variant="danger"
              onClick={handleDangerConfirm}
            >
              {activeDanger.label}
            </Button>
            <Button variant="link" onClick={() => setDangerModal(null)}>
              Cancel
            </Button>
          </ModalFooter>
        </Modal>
      )}
    </>
  );
};
