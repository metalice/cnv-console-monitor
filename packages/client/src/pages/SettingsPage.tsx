import { useEffect, useMemo, useState } from 'react';

import { Alert, Content, PageSection, Spinner, TextInput } from '@patternfly/react-core';
import {
  BellIcon,
  CodeBranchIcon,
  CogIcon,
  CubesIcon,
  InfoCircleIcon,
  KeyIcon,
  ListIcon,
  SearchIcon,
  UsersIcon,
} from '@patternfly/react-icons';

import { AboutSection } from '../components/settings/AboutSection';
import { BootstrapAdmin } from '../components/settings/BootstrapAdmin';
import { ComponentMappings } from '../components/settings/ComponentMappings';
import { DangerZone } from '../components/settings/DangerZone';
import { IntegrationsSection } from '../components/settings/IntegrationsCard';
import { NotificationPreview } from '../components/settings/NotificationPreview';
import { NotificationSubscriptions } from '../components/settings/NotificationSubscriptions';
import { PersonalTokensSection } from '../components/settings/PersonalTokensSection';
import { ReportRepoSettings } from '../components/settings/ReportRepoSettings';
import { RepositoryMappingSection } from '../components/settings/RepositoryMappingSection';
import { SystemStatusBanner } from '../components/settings/SystemStatusBanner';
import { UnsavedChangesBar } from '../components/settings/UnsavedChangesBar';
import { useCtrlSave } from '../components/settings/useCtrlSave';
import { UserManagement } from '../components/settings/UserManagement';
import { useSettingsPageNav } from '../components/settings/useSettingsPageNav';
import { useSettingsState } from '../components/settings/useSettingsState';

type SettingsTab = {
  adminOnly?: boolean;
  description: string;
  icon: React.ReactNode;
  key: string;
  keywords: string[];
  label: string;
};

const SETTINGS_TABS: SettingsTab[] = [
  {
    description: 'Subscriptions, Slack, email',
    icon: <BellIcon />,
    key: 'notifications',
    keywords: [
      'notification',
      'subscription',
      'slack',
      'email',
      'webhook',
      'digest',
      'channel',
      'preview',
      'schedule',
      'reminder',
    ],
    label: 'Notifications',
  },
  {
    description: 'ReportPortal, Jira, Git, AI',
    icon: <CubesIcon />,
    key: 'integrations',
    keywords: [
      'integration',
      'reportportal',
      'jira',
      'jenkins',
      'smartsheet',
      'git',
      'github',
      'gitlab',
      'email',
      'smtp',
      'polling',
      'links',
      'ai',
      'token',
      'api',
      'url',
      'connection',
    ],
    label: 'Integrations',
  },
  {
    description: 'GitHub, GitLab repos for reports',
    icon: <CodeBranchIcon />,
    key: 'team-report',
    keywords: ['report', 'team', 'github', 'gitlab', 'repo', 'repository', 'generate'],
    label: 'Team Report',
  },
  {
    description: 'Component to launcher mapping',
    icon: <ListIcon />,
    key: 'launchers',
    keywords: ['launcher', 'component', 'mapping', 'launch', 'test', 'cnv', 'tier'],
    label: 'Launchers',
  },
  {
    description: 'Test file repos and docs',
    icon: <CogIcon />,
    key: 'repositories',
    keywords: ['repository', 'test', 'file', 'doc', 'documentation', 'explorer', 'source'],
    label: 'Repositories',
  },
  {
    adminOnly: true,
    description: 'Manage users and roles',
    icon: <UsersIcon />,
    key: 'users',
    keywords: ['user', 'management', 'admin', 'role', 'bootstrap', 'impersonate'],
    label: 'Users',
  },
  {
    description: 'API tokens for integrations',
    icon: <KeyIcon />,
    key: 'tokens',
    keywords: ['token', 'personal', 'api', 'key', 'secret', 'access'],
    label: 'Personal Tokens',
  },
  {
    description: 'Version, architecture',
    icon: <InfoCircleIcon />,
    key: 'about',
    keywords: ['about', 'version', 'architecture', 'info'],
    label: 'About',
  },
];

export const SettingsPage = () => {
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

  const { activeTab, integrationSubTab, setActiveTab, setIntegrationSubTab } = useSettingsPageNav();
  useCtrlSave(hasChanges, saveAll);

  const [search, setSearch] = useState('');

  const visibleTabs = useMemo(() => {
    const tabs = SETTINGS_TABS.filter(tab => !tab.adminOnly || isAdmin);
    if (!search.trim()) return tabs;
    const term = search.toLowerCase();
    return tabs.filter(
      tab =>
        tab.label.toLowerCase().includes(term) ||
        tab.description.toLowerCase().includes(term) ||
        tab.keywords.some(keyword => keyword.includes(term)),
    );
  }, [search, isAdmin]);

  useEffect(() => {
    if (visibleTabs.length === 1 && visibleTabs[0].key !== activeTab) {
      setActiveTab(visibleTabs[0].key);
    }
  }, [visibleTabs, activeTab, setActiveTab]);

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
  const jenkinsEnabled = Boolean(val('jenkins.user') && val('jenkins.token'));
  const smartsheetEnabled = Boolean(val('smartsheet.token'));
  const gitEnabled = Boolean(val('gitlab.token') || val('github.token'));

  const allTabs = SETTINGS_TABS.filter(tab => !tab.adminOnly || isAdmin);
  const isTabVisible = (key: string) => visibleTabs.some(tab => tab.key === key);

  const renderPanel = () => {
    switch (activeTab) {
      case 'notifications':
        return (
          <>
            <Content className="app-mb-md" component="h2">
              Notifications
            </Content>
            <Content className="app-text-muted app-mb-lg" component="p">
              Configure notification subscriptions, Slack webhooks, and email recipients for daily
              and team reports.
            </Content>
            <NotificationSubscriptions />
            <div className="app-mt-lg">
              <NotificationPreview />
            </div>
          </>
        );
      case 'integrations':
        return (
          <>
            <Content className="app-mb-md" component="h2">
              Integrations
            </Content>
            <Content className="app-text-muted app-mb-lg" component="p">
              Connect external services: ReportPortal, Jira, Jenkins, Git providers, email server,
              and AI.
            </Content>
            <IntegrationsSection
              activeTab={integrationSubTab}
              emailEnabled={sys.emailEnabled}
              gitEnabled={gitEnabled}
              issueTypeSelectOptions={issueTypeSelectOptions}
              jenkinsEnabled={jenkinsEnabled}
              jiraEnabled={sys.jiraEnabled}
              jiraProjectSelectOptions={jiraProjectSelectOptions}
              jiraTest={jiraTest}
              jiraTestMsg={jiraTestMsg}
              jiraTokenDirty={jiraTokenDirty}
              rpEnabled={rpEnabled}
              rpProjectOptions={rpProjectOptions}
              rpTest={rpTest}
              rpTestMsg={rpTestMsg}
              sectionProps={sectionProps}
              setActiveTab={(tab: string | number) => setIntegrationSubTab(String(tab))}
              setJiraMetaOverride={setJiraMetaOverride}
              setJiraTestMode={setJiraTestMode}
              setJiraTestMsg={setJiraTestMsg}
              smartsheetEnabled={smartsheetEnabled}
              tokenHandlers={tokenHandlers}
            />
          </>
        );
      case 'team-report':
        return (
          <>
            <Content className="app-mb-md" component="h2">
              Team Report
            </Content>
            <Content className="app-text-muted app-mb-lg" component="p">
              Configure GitHub and GitLab repositories used when generating team reports.
            </Content>
            <ReportRepoSettings />
          </>
        );
      case 'launchers':
        return (
          <>
            <Content className="app-mb-md" component="h2">
              Launchers
            </Content>
            <Content className="app-text-muted app-mb-lg" component="p">
              Map ReportPortal test launcher names to components. This controls how launches are
              grouped on the dashboard.
            </Content>
            <ComponentMappings />
          </>
        );
      case 'repositories':
        return (
          <>
            <Content className="app-mb-md" component="h2">
              Repositories
            </Content>
            <Content className="app-text-muted app-mb-lg" component="p">
              Manage source code repositories for test file browsing and documentation.
            </Content>
            <RepositoryMappingSection />
          </>
        );
      case 'users':
        return (
          <>
            <Content className="app-mb-md" component="h2">
              Users
            </Content>
            <Content className="app-text-muted app-mb-lg" component="p">
              Manage user accounts, roles, and administrative access.
            </Content>
            <UserManagement />
            <div className="app-mt-lg">
              <BootstrapAdmin />
            </div>
          </>
        );
      case 'tokens':
        return (
          <>
            <Content className="app-mb-md" component="h2">
              Personal Tokens
            </Content>
            <Content className="app-text-muted app-mb-lg" component="p">
              Create and manage personal API tokens for programmatic access.
            </Content>
            <PersonalTokensSection />
          </>
        );
      case 'about':
        return (
          <>
            <Content className="app-mb-md" component="h2">
              About
            </Content>
            <Content className="app-text-muted app-mb-lg" component="p">
              Version information and system architecture.
            </Content>
            <AboutSection isAdmin={isAdmin} />
            {isAdmin && (
              <div className="app-mt-lg">
                <DangerZone />
              </div>
            )}
          </>
        );
      default:
        return null;
    }
  };

  return (
    <>
      <PageSection>
        <Content component="h1">Settings</Content>
      </PageSection>

      {isAdmin && hasChanges() && (
        <UnsavedChangesBar isSaving={saveMutation.isPending} onSave={saveAll} />
      )}

      {saveMessage && (
        <PageSection>
          <Alert isInline title={saveMessage.text} variant={saveMessage.type} />
        </PageSection>
      )}

      <SystemStatusBanner uptime={sys.uptime} />

      <PageSection isFilled>
        <div className="app-settings-layout">
          <nav className="app-settings-sidebar">
            <div className="app-settings-search">
              <TextInput
                aria-label="Search settings"
                customIcon={<SearchIcon />}
                placeholder="Search settings..."
                type="search"
                value={search}
                onChange={(_event, value) => setSearch(value)}
              />
            </div>
            {visibleTabs.length === 0 && (
              <div className="app-settings-no-results">No matching settings</div>
            )}
            {allTabs.map(tab => {
              const isMatch = isTabVisible(tab.key);
              return (
                <button
                  className={`app-settings-tab${activeTab === tab.key ? ' app-settings-tab--active' : ''}${!isMatch && search ? ' app-settings-tab--dimmed' : ''}`}
                  key={tab.key}
                  type="button"
                  onClick={() => {
                    setActiveTab(tab.key);
                    setSearch('');
                  }}
                >
                  <span className="app-settings-tab-icon">{tab.icon}</span>
                  <span className="app-settings-tab-text">
                    <span className="app-settings-tab-label">{tab.label}</span>
                    <span className="app-settings-tab-desc">{tab.description}</span>
                  </span>
                </button>
              );
            })}
          </nav>
          <div className="app-settings-panel">{renderPanel()}</div>
        </div>
      </PageSection>
    </>
  );
};
