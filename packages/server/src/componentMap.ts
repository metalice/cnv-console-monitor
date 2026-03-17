import {
  getAllComponentMappings, ComponentMappingRecord,
  getDistinctJenkinsTeams, upsertComponentMapping,
  updateComponentByJenkinsTeam,
} from './db/store';
import { config } from './config';
import { createJiraClient } from './clients/jira-auth';
import { logger } from './logger';

const log = logger.child({ module: 'ComponentMap' });

type CachedMapping = { pattern: string; component: string; type: string };
let mappingCache: CachedMapping[] = [];

export const refreshMappingCache = async (): Promise<void> => {
  try {
    const dbMappings = await getAllComponentMappings();
    mappingCache = dbMappings.map((mapping: ComponentMappingRecord) => ({
      pattern: mapping.pattern,
      component: mapping.component,
      type: mapping.type,
    }));
    log.info({ count: mappingCache.length }, 'Component mapping cache refreshed');
  } catch (error) {
    log.warn({ error }, 'Failed to load component mappings from DB');
  }
};

export const resolveComponent = (jenkinsTeam: string | null | undefined, launchName?: string): string | null => {
  if (jenkinsTeam) return jenkinsTeam;

  if (!launchName) return null;
  const manualMappings = mappingCache.filter((item) => item.type === 'manual');
  for (const entry of manualMappings) {
    try {
      if (new RegExp(entry.pattern, 'i').test(launchName)) return entry.component;
    } catch { /* invalid regex */ }
  }
  return null;
};

export const fetchJiraComponents = async (): Promise<string[]> => {
  if (!config.jira.enabled || !config.jira.token) return [];
  try {
    const client = createJiraClient();
    const response = await client.get(`/project/${config.jira.projectKey}/components`);
    return (response.data as Array<{ name: string }>).map((comp) => comp.name).sort();
  } catch (error) {
    log.warn({ error }, 'Failed to fetch Jira components');
    return [];
  }
};

export type AutoMappingResult = {
  mapped: Array<{ jenkinsTeam: string; jiraComponent: string }>;
  unmapped: string[];
};

export const autoGenerateMappings = async (): Promise<AutoMappingResult> => {
  const [jenkinsTeams, jiraComponents] = await Promise.all([
    getDistinctJenkinsTeams(),
    fetchJiraComponents(),
  ]);

  log.info({ jenkinsTeams: jenkinsTeams.length, jiraComponents: jiraComponents.length }, 'Auto-mapping');

  if (jiraComponents.length === 0) {
    log.warn('No Jira components found');
    return { mapped: [], unmapped: jenkinsTeams };
  }

  const jiraSet = new Set(jiraComponents.map((comp) => comp.toLowerCase()));
  const mapped: AutoMappingResult['mapped'] = [];
  const unmapped: string[] = [];

  for (const team of jenkinsTeams) {
    if (jiraSet.has(team.toLowerCase())) {
      const jiraName = jiraComponents.find((comp) => comp.toLowerCase() === team.toLowerCase()) ?? team;
      mapped.push({ jenkinsTeam: team, jiraComponent: jiraName });
      await upsertComponentMapping(team, jiraName, 'auto');
      await updateComponentByJenkinsTeam(team, jiraName);
    } else {
      unmapped.push(team);
    }
  }

  await refreshMappingCache();

  const { backfillComponentFromSiblings } = await import('./db/store');
  const backfilled = await backfillComponentFromSiblings();
  log.info({ mapped: mapped.length, unmapped: unmapped.length, backfilled }, 'Auto-mapping complete');
  return { mapped, unmapped };
};
