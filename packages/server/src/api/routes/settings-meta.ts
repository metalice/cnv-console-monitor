import https from 'https';

import axios from 'axios';
import { type Request, type Response, Router } from 'express';

import { createJiraClient } from '../../clients/jira-auth';
import { config, lastPollAt, startedAt } from '../../config';
import { logger } from '../../logger';

const log = logger.child({ module: 'SettingsMeta' });
const httpsAgent = new https.Agent({ rejectUnauthorized: false });
const router = Router();

router.get('/health', async (_req: Request, res: Response) => {
  const rpCheck =
    config.reportportal.url && config.reportportal.token
      ? axios
          .get(`${config.reportportal.url}/api/v1/${config.reportportal.project}/launch`, {
            headers: { Authorization: `Bearer ${config.reportportal.token}` },
            httpsAgent,
            params: { 'page.size': 1 },
            timeout: 3000,
          })
          .then(rpRes => ({
            message: `${rpRes.data?.page?.totalElements ?? 0} launches`,
            status: 'up' as const,
          }))
          .catch(err => ({
            message: err instanceof Error ? err.message : 'Unreachable',
            status: 'down' as const,
          }))
      : Promise.resolve({ message: 'Not configured', status: 'down' as const });

  const jiraCheck =
    config.jira.url && config.jira.token
      ? createJiraClient()
          .get('/myself')
          .then(() => ({ message: 'Connected', status: 'up' as const }))
          .catch(err => ({
            message: err instanceof Error ? err.message : 'Unreachable',
            status: 'down' as const,
          }))
      : Promise.resolve({ message: 'Not configured', status: 'down' as const });

  const [reportportal, jira] = await Promise.all([rpCheck, jiraCheck]);

  res.json({
    jira,
    reportportal,
    system: { lastPollAt, uptime: Math.round((Date.now() - startedAt) / 1000) },
  });
});

router.get('/rp-projects', async (_req: Request, res: Response) => {
  try {
    const client = axios.create({
      baseURL: config.reportportal.url,
      headers: { Authorization: `Bearer ${config.reportportal.token}` },
      httpsAgent,
      timeout: 15000,
    });
    const response = await client.get('/api/v1/project/list', { params: { 'page.size': 100 } });
    const projects: string[] = (response.data?.content || []).map(
      (project: { projectName: string }) => project.projectName,
    );
    res.json(projects.sort());
  } catch (err) {
    log.warn({ err }, 'Failed to fetch RP projects');
    res.json([config.reportportal.project]);
  }
});

router.get('/launch-names', async (_req: Request, res: Response) => {
  try {
    const client = axios.create({
      baseURL: `${config.reportportal.url}/api/v1/${config.reportportal.project}`,
      headers: { Authorization: `Bearer ${config.reportportal.token}` },
      httpsAgent,
      timeout: 15000,
    });
    const response = await client.get('/launch/names');
    res.json((response.data?.content || response.data || []).sort());
  } catch (err) {
    log.warn({ err }, 'Failed to fetch launch names');
    res.json([]);
  }
});

router.get('/jira-meta', async (req: Request, res: Response) => {
  if (!config.jira.enabled) {
    res.json({ components: [], issueTypes: [], projects: [] });
    return;
  }
  const projectKey = (req.query.project as string) || config.jira.projectKey;
  try {
    const client = createJiraClient();
    const [projectsRes, issueTypeRes, componentRes] = await Promise.allSettled([
      client.get('/project'),
      client.get('/issuetype'),
      client.get(`/project/${projectKey}/components`),
    ]);

    const projects =
      projectsRes.status === 'fulfilled'
        ? (projectsRes.value.data as { key: string; name: string }[])
            .map(proj => ({ key: proj.key, name: proj.name }))
            .sort((first, second) => first.key.localeCompare(second.key))
        : [{ key: config.jira.projectKey, name: config.jira.projectKey }];
    const issueTypes =
      issueTypeRes.status === 'fulfilled'
        ? (issueTypeRes.value.data as { name: string }[])
            .map(type => type.name)
            .filter(name => !name.toLowerCase().includes('sub-task'))
        : ['Bug', 'Task', 'Story'];
    const components =
      componentRes.status === 'fulfilled'
        ? (componentRes.value.data as { name: string }[]).map(comp => comp.name).sort()
        : [];

    res.json({ components, issueTypes, projects });
  } catch (err) {
    log.warn({ err }, 'Failed to fetch Jira metadata');
    res.json({
      components: [],
      issueTypes: ['Bug'],
      projects: [{ key: config.jira.projectKey, name: config.jira.projectKey }],
    });
  }
});

export default router;
