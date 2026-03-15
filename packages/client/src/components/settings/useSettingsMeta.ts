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
  const jiraProjectSelectOptions: SearchableSelectOption[] = jiraProjectOptions.map(p => ({ value: p.key, label: `${p.key} - ${p.name}` }));
  const issueTypeOptions = jiraMetaData?.issueTypes?.length ? jiraMetaData.issueTypes : ['Bug', 'Task', 'Story'];
  const issueTypeSelectOptions = toOptions(issueTypeOptions);

  return { jiraProjectSelectOptions, issueTypeSelectOptions };
}

export const resolveRpProjectOptions = (
  rpProjectsOverride: string[] | null,
  rpProjects: string[] | undefined,
  currentProject: string,
): string[] => {
  const rpProjectsData = rpProjectsOverride ?? rpProjects ?? [];
  return rpProjectsData.length
    ? [...new Set([currentProject, ...rpProjectsData])]
    : [currentProject];
}
