import { Tab, Tabs, TabTitleText } from '@patternfly/react-core';
import { CheckCircleIcon } from '@patternfly/react-icons';
import type { UseMutationResult } from '@tanstack/react-query';

import type { JiraMeta } from '../../api/settings';
import type { SearchableSelectOption } from '../common/SearchableSelect';

import { IntegrationsTabPanel } from './IntegrationsTabPanel';
import type { AlertMessage, SettingsSectionProps, TokenEditHandlers } from './types';

type IntegrationsCardProps = {
  activeTab: string | number;
  emailEnabled: boolean;
  gitEnabled: boolean;
  issueTypeSelectOptions: SearchableSelectOption[];
  jenkinsEnabled: boolean;
  jiraEnabled: boolean;
  jiraProjectSelectOptions: SearchableSelectOption[];
  jiraTest: UseMutationResult<unknown, Error, void>;
  jiraTestMsg: AlertMessage | null;
  jiraTokenDirty: boolean;
  rpEnabled: boolean;
  rpProjectOptions: string[];
  rpTest: UseMutationResult<unknown, Error, void>;
  rpTestMsg: AlertMessage | null;
  sectionProps: SettingsSectionProps;
  setActiveTab: (tab: string | number) => void;
  setJiraMetaOverride: (meta: JiraMeta | null) => void;
  setJiraTestMode: (mode: boolean) => void;
  setJiraTestMsg: (msg: AlertMessage | null) => void;
  smartsheetEnabled: boolean;
  tokenHandlers: TokenEditHandlers;
};

const TABS = [
  { key: 'reportportal', label: 'ReportPortal' },
  { key: 'jira', label: 'Jira' },
  { key: 'jenkins', label: 'Jenkins' },
  { key: 'smartsheet', label: 'Smartsheet' },
  { key: 'git', label: 'Git' },
  { key: 'email', label: 'Email' },
  { key: 'polling', label: 'Polling' },
  { key: 'links', label: 'Links' },
  { key: 'ai', label: 'AI' },
] as const;

export const IntegrationsSection = (props: IntegrationsCardProps) => {
  const {
    activeTab,
    emailEnabled,
    gitEnabled,
    jenkinsEnabled,
    jiraEnabled,
    rpEnabled,
    setActiveTab,
    smartsheetEnabled,
  } = props;

  const enabled: Record<string, boolean> = {
    ai: true,
    email: emailEnabled,
    git: gitEnabled,
    jenkins: jenkinsEnabled,
    jira: jiraEnabled,
    links: true,
    polling: true,
    reportportal: rpEnabled,
    smartsheet: smartsheetEnabled,
  };

  return (
    <>
      <Tabs activeKey={activeTab} onSelect={(_event, key) => setActiveTab(key)}>
        {TABS.map(({ key, label }) => (
          <Tab
            eventKey={key}
            key={key}
            title={
              <TabTitleText>
                <CheckCircleIcon
                  className={`${enabled[key] ? 'app-vtabs-icon--ok' : 'app-vtabs-icon--off'} app-mr-xs`}
                />
                {label}
              </TabTitleText>
            }
          />
        ))}
      </Tabs>
      <div className="app-mt-md">
        <IntegrationsTabPanel {...props} />
      </div>
    </>
  );
};
