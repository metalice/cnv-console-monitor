import { Router, Request, Response } from 'express';
import axios from 'axios';
import https from 'https';
import { config, startedAt, lastPollAt } from '../../config';
import { createJiraClient } from '../../clients/jira-auth';
import { logger } from '../../logger';

const log = logger.child({ module: 'SettingsMeta' });
const httpsAgent = new https.Agent({ rejectUnauthorized: false });
const router = Router();

router.get('/health', async (_req: Request, res: Response) => {
  const rpCheck = (config.reportportal.url && config.reportportal.token)
    ? axios.get(`${config.reportportal.url}/api/v1/${config.reportportal.project}/launch`, {
        params: { 'page.size': 1 },
        headers: { Authorization: `Bearer ${config.reportportal.token}` },
        timeout: 3000, httpsAgent,
      }).then(rpRes => ({ status: 'up' as const, message: `${rpRes.data?.page?.totalElements ?? 0} launches` }))
      .catch(err => ({ status: 'down' as const, message: err instanceof Error ? err.message : 'Unreachable' }))
    : Promise.resolve({ status: 'down' as const, message: 'Not configured' });

  const jiraCheck = (config.jira.url && config.jira.token)
    ? createJiraClient().get('/myself')
      .then(() => ({ status: 'up' as const, message: 'Connected' }))
      .catch(err => ({ status: 'down' as const, message: err instanceof Error ? err.message : 'Unreachable' }))
    : Promise.resolve({ status: 'down' as const, message: 'Not configured' });

  const [reportportal, jira] = await Promise.all([rpCheck, jiraCheck]);

  res.json({ reportportal, jira, system: { uptime: Math.round((Date.now() - startedAt) / 1000), lastPollAt } });
});

router.get('/rp-projects', async (_req: Request, res: Response) => {
  try {
    const client = axios.create({
      baseURL: config.reportportal.url,
      headers: { Authorization: `Bearer ${config.reportportal.token}` },
      timeout: 15000, httpsAgent,
    });
    const response = await client.get('/api/v1/project/list', { params: { 'page.size': 100 } });
    const projects: string[] = (response.data?.content || []).map((project: { projectName: string }) => project.projectName);
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
      timeout: 15000, httpsAgent,
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
    res.json({ projects: [], issueTypes: [], components: [] });
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

    const projects = projectsRes.status === 'fulfilled'
      ? (projectsRes.value.data as Array<{ key: string; name: string }>).map(proj => ({ key: proj.key, name: proj.name })).sort((first, second) => first.key.localeCompare(second.key))
      : [{ key: config.jira.projectKey, name: config.jira.projectKey }];
    const issueTypes = issueTypeRes.status === 'fulfilled'
      ? (issueTypeRes.value.data as Array<{ name: string }>).map(type => type.name).filter(name => !name.toLowerCase().includes('sub-task'))
      : ['Bug', 'Task', 'Story'];
    const components = componentRes.status === 'fulfilled'
      ? (componentRes.value.data as Array<{ name: string }>).map(comp => comp.name).sort()
      : [];

    res.json({ projects, issueTypes, components });
  } catch (err) {
    log.warn({ err }, 'Failed to fetch Jira metadata');
    res.json({ projects: [{ key: config.jira.projectKey, name: config.jira.projectKey }], issueTypes: ['Bug'], components: [] });
  }
});

export default router;
