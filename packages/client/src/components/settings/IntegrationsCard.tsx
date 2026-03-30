import { Card, CardBody, CardTitle } from '@patternfly/react-core';
import { CheckCircleIcon } from '@patternfly/react-icons';
import type { UseMutationResult } from '@tanstack/react-query';

import type { JiraMeta } from '../../api/settings';
import type { SearchableSelectOption } from '../common/SearchableSelect';

import { IntegrationsTabPanel } from './IntegrationsTabPanel';
import type { AlertMessage, SettingsSectionProps, TokenEditHandlers } from './types';

type IntegrationsCardProps = {
  sectionProps: SettingsSectionProps;
  tokenHandlers: TokenEditHandlers;
  activeTab: string | number;
  setActiveTab: (tab: string | number) => void;
  rpEnabled: boolean;
  jiraEnabled: boolean;
  jenkinsEnabled: boolean;
  emailEnabled: boolean;
  gitEnabled: boolean;
  rpProjectOptions: string[];
  rpTestMsg: AlertMessage | null;
  rpTest: UseMutationResult<unknown, Error, void>;
  jiraProjectSelectOptions: SearchableSelectOption[];
  issueTypeSelectOptions: SearchableSelectOption[];
  jiraTestMsg: AlertMessage | null;
  jiraTest: UseMutationResult<unknown, Error, void>;
  jiraTokenDirty: boolean;
  setJiraMetaOverride: (meta: JiraMeta | null) => void;
  setJiraTestMode: (mode: boolean) => void;
  setJiraTestMsg: (msg: AlertMessage | null) => void;
};

const TABS = [
  { key: 'reportportal', label: 'ReportPortal' },
  { key: 'jira', label: 'Jira' },
  { key: 'jenkins', label: 'Jenkins' },
  { key: 'git', label: 'Git' },
  { key: 'email', label: 'Email' },
  { key: 'polling', label: 'Polling' },
  { key: 'links', label: 'Links' },
  { key: 'ai', label: 'AI' },
] as const;

export const IntegrationsCard = (props: IntegrationsCardProps) => {
  const {
    activeTab,
    emailEnabled,
    gitEnabled,
    jenkinsEnabled,
    jiraEnabled,
    rpEnabled,
    setActiveTab,
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
  };

  return (
    <Card className="app-mb-lg" id="integrations">
      <CardTitle>Integrations</CardTitle>
      <CardBody>
        <div className="app-vtabs">
          <nav className="app-vtabs-nav">
            {TABS.map(({ key, label }) => (
              <button
                className={`app-vtabs-btn${activeTab === key ? ' app-vtabs-btn--active' : ''}`}
                key={key}
                type="button"
                onClick={() => setActiveTab(key)}
              >
                <CheckCircleIcon
                  className={enabled[key] ? 'app-vtabs-icon--ok' : 'app-vtabs-icon--off'}
                />
                {label}
              </button>
            ))}
          </nav>
          <div className="app-vtabs-panel">
            <IntegrationsTabPanel {...props} />
          </div>
        </div>
      </CardBody>
    </Card>
  );
};
