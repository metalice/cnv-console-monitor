import type { JiraMeta, JiraTestResponse } from '../../api/settings';
import type { SearchableSelectOption } from '../common/SearchableSelect';

import { toOptions } from './types';

type JiraMetaResolved = {
  jiraProjectSelectOptions: SearchableSelectOption[];
  issueTypeSelectOptions: SearchableSelectOption[];
};

export const resolveJiraMeta = (
  jiraMeta: JiraMeta | undefined,
  jiraMetaDraft: JiraTestResponse | undefined,
  jiraMetaOverride: JiraMeta | null,
  jiraTokenDirty: boolean,
  jiraTestMode: boolean,
): JiraMetaResolved => {
  const jiraMetaDraftData = jiraMetaDraft
    ? {
        components: jiraMetaDraft.components ?? [],
        issueTypes: jiraMetaDraft.issueTypes ?? [],
        projects: jiraMetaDraft.projects ?? [],
      }
    : null;

  const jiraMetaData = jiraTokenDirty
    ? jiraTestMode
      ? {
          components: jiraMetaDraftData?.components?.length
            ? jiraMetaDraftData.components
            : (jiraMetaOverride?.components ?? []),
          issueTypes: jiraMetaOverride?.issueTypes?.length
            ? jiraMetaOverride.issueTypes
            : (jiraMetaDraftData?.issueTypes ?? []),
          projects: jiraMetaOverride?.projects?.length
            ? jiraMetaOverride.projects
            : (jiraMetaDraftData?.projects ?? []),
        }
      : jiraMeta
    : jiraMeta;

  const jiraProjectOptions = jiraMetaData?.projects?.length ? jiraMetaData.projects : [];
  const jiraProjectSelectOptions: SearchableSelectOption[] = jiraProjectOptions.map(p => ({
    label: `${p.key} - ${p.name}`,
    value: p.key,
  }));
  const issueTypeOptions = jiraMetaData?.issueTypes?.length
    ? jiraMetaData.issueTypes
    : ['Bug', 'Task', 'Story'];
  const issueTypeSelectOptions = toOptions(issueTypeOptions);

  return { issueTypeSelectOptions, jiraProjectSelectOptions };
};

export const resolveRpProjectOptions = (
  rpProjectsOverride: string[] | null,
  rpProjects: string[] | undefined,
  currentProject: string,
): string[] => {
  const rpProjectsData = rpProjectsOverride ?? rpProjects ?? [];
  return rpProjectsData.length
    ? [...new Set([currentProject, ...rpProjectsData])]
    : [currentProject];
};
