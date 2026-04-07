import type { UseMutationResult } from '@tanstack/react-query';

import type { JiraMeta } from '../../api/settings';
import type { SearchableSelectOption } from '../common/SearchableSelect';

import { AISettings } from './AISettings';
import { EmailServerSettings } from './EmailServerSettings';
import { GitSettings } from './GitSettings';
import { JenkinsSettings } from './JenkinsSettings';
import { JiraSettings } from './JiraSettings';
import { LinksSettings } from './LinksSettings';
import { PollingSettings } from './PollingSettings';
import { ReportPortalSettings } from './ReportPortalSettings';
import { SmartsheetSettings } from './SmartsheetSettings';
import type { AlertMessage, SettingsSectionProps, TokenEditHandlers } from './types';

type IntegrationsTabPanelProps = {
  activeTab: string | number;
  sectionProps: SettingsSectionProps;
  tokenHandlers: TokenEditHandlers;
  rpProjectOptions: string[];
  rpTestMsg: AlertMessage | null;
  rpTest: UseMutationResult<unknown, Error, void>;
  jiraProjectSelectOptions: SearchableSelectOption[];
  issueTypeSelectOptions: SearchableSelectOption[];
  jiraTestMsg: AlertMessage | null;
  jiraTest: UseMutationResult<unknown, Error, void>;
  jiraEnabled: boolean;
  jiraTokenDirty: boolean;
  emailEnabled: boolean;
  setJiraMetaOverride: (meta: JiraMeta | null) => void;
  setJiraTestMode: (mode: boolean) => void;
  setJiraTestMsg: (msg: AlertMessage | null) => void;
};

export const IntegrationsTabPanel = ({
  activeTab,
  emailEnabled,
  issueTypeSelectOptions,
  jiraEnabled,
  jiraProjectSelectOptions,
  jiraTest,
  jiraTestMsg,
  jiraTokenDirty,
  rpProjectOptions,
  rpTest,
  rpTestMsg,
  sectionProps,
  setJiraMetaOverride,
  setJiraTestMode,
  setJiraTestMsg,
  tokenHandlers,
}: IntegrationsTabPanelProps) => {
  const handleJiraTest = () => {
    if (jiraTokenDirty) {
      sectionProps.set('jira.projectKey', '');
      sectionProps.set('jira.issueType', '');
      sectionProps.set('jira.component', '');
      setJiraMetaOverride({ components: [], issueTypes: [], projects: [] });
    }
    setJiraTestMode(true);
    jiraTest.mutate();
  };

  const handleJiraToken = (tokenValue: string) => {
    sectionProps.set('jira.token', tokenValue);
    setJiraTestMode(false);
    setJiraMetaOverride(null);
    setJiraTestMsg(null);
  };

  if (activeTab === 'reportportal') {
    return (
      <ReportPortalSettings
        {...sectionProps}
        {...tokenHandlers}
        isTestPending={rpTest.isPending}
        rpProjectOptions={rpProjectOptions}
        rpTestMsg={rpTestMsg}
        onTestConnection={() => rpTest.mutate()}
      />
    );
  }
  if (activeTab === 'jira') {
    return (
      <JiraSettings
        {...sectionProps}
        {...tokenHandlers}
        isTestPending={jiraTest.isPending}
        issueTypeSelectOptions={issueTypeSelectOptions}
        jiraEnabled={jiraEnabled}
        jiraProjectSelectOptions={jiraProjectSelectOptions}
        jiraTestMsg={jiraTestMsg}
        onTestConnection={handleJiraTest}
        onTokenChange={handleJiraToken}
      />
    );
  }
  if (activeTab === 'jenkins') return <JenkinsSettings {...sectionProps} {...tokenHandlers} />;
  if (activeTab === 'smartsheet')
    return <SmartsheetSettings {...sectionProps} {...tokenHandlers} />;
  if (activeTab === 'git') return <GitSettings {...sectionProps} {...tokenHandlers} />;
  if (activeTab === 'email') {
    return <EmailServerSettings {...sectionProps} emailEnabled={emailEnabled} />;
  }
  if (activeTab === 'polling') return <PollingSettings {...sectionProps} />;
  if (activeTab === 'links') return <LinksSettings {...sectionProps} />;
  if (activeTab === 'ai') return <AISettings />;
  return null;
};
