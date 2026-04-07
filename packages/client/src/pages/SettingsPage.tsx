import { useEffect } from 'react';

import { Alert, Content, PageSection, Spinner } from '@patternfly/react-core';

import { AboutSection } from '../components/settings/AboutSection';
import { BootstrapAdmin } from '../components/settings/BootstrapAdmin';
import { ComponentMappings } from '../components/settings/ComponentMappings';
import { DangerZone } from '../components/settings/DangerZone';
import { IntegrationsCard } from '../components/settings/IntegrationsCard';
import { NotificationPreview } from '../components/settings/NotificationPreview';
import { NotificationSubscriptions } from '../components/settings/NotificationSubscriptions';
import { PersonalTokensSection } from '../components/settings/PersonalTokensSection';
import { RepositoryMappingSection } from '../components/settings/RepositoryMappingSection';
import { SystemStatusBanner } from '../components/settings/SystemStatusBanner';
import { UnsavedChangesBar } from '../components/settings/UnsavedChangesBar';
import { useCtrlSave } from '../components/settings/useCtrlSave';
import { UserManagement } from '../components/settings/UserManagement';
import { useSettingsPageNav } from '../components/settings/useSettingsPageNav';
import { useSettingsState } from '../components/settings/useSettingsState';

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

  const { activeTab, setActiveTab } = useSettingsPageNav();
  useCtrlSave(hasChanges, saveAll);

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

      <PageSection>
        <div className="app-mb-lg" id="notifications">
          <NotificationSubscriptions />
        </div>

        <div className="app-mb-lg">
          <ComponentMappings />
        </div>

        <IntegrationsCard
          activeTab={activeTab}
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
          setActiveTab={setActiveTab}
          setJiraMetaOverride={setJiraMetaOverride}
          setJiraTestMode={setJiraTestMode}
          setJiraTestMsg={setJiraTestMsg}
          smartsheetEnabled={smartsheetEnabled}
          tokenHandlers={tokenHandlers}
        />

        <NotificationPreview />

        <div className="app-mb-lg">
          <UserManagement />
        </div>

        <div className="app-mb-lg">
          <BootstrapAdmin />
        </div>

        {isAdmin && <DangerZone />}

        <AboutSection isAdmin={isAdmin} />
      </PageSection>

      <PageSection>
        <RepositoryMappingSection />
      </PageSection>

      <PageSection>
        <PersonalTokensSection />
      </PageSection>
    </>
  );
};
