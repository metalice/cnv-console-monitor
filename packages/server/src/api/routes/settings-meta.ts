import { Router, Request, Response } from 'express';
import axios from 'axios';
import https from 'https';
import { config, startedAt, lastPollAt } from '../../config';
import { logger } from '../../logger';

const log = logger.child({ module: 'SettingsMeta' });
const httpsAgent = new https.Agent({ rejectUnauthorized: false });
const router = Router();

router.get('/health', async (_req: Request, res: Response) => {
  const checks: Record<string, { status: 'up' | 'down'; message: string }> = {};

  if (config.reportportal.url && config.reportportal.token) {
    try {
      const rpRes = await axios.get(`${config.reportportal.url}/api/v1/${config.reportportal.project}/launch`, {
        params: { 'page.size': 1 },
        headers: { Authorization: `Bearer ${config.reportportal.token}` },
        timeout: 5000,
        httpsAgent,
      });
      const total = rpRes.data?.page?.totalElements ?? 0;
      checks.reportportal = { status: 'up', message: `${total} launches` };
    } catch (err) {
      checks.reportportal = { status: 'down', message: err instanceof Error ? err.message : 'Unreachable' };
    }
  } else {
    checks.reportportal = { status: 'down', message: 'Not configured' };
  }

  if (config.jira.url && config.jira.token) {
    try {
      await axios.get(`${config.jira.url}/rest/api/2/myself`, {
        headers: { Authorization: `Bearer ${config.jira.token}` },
        timeout: 5000,
        httpsAgent,
      });
      checks.jira = { status: 'up', message: 'Connected' };
    } catch (err) {
      checks.jira = { status: 'down', message: err instanceof Error ? err.message : 'Unreachable' };
    }
  } else {
    checks.jira = { status: 'down', message: 'Not configured' };
  }

  res.json({ ...checks, system: { uptime: Math.round((Date.now() - startedAt) / 1000), lastPollAt } });
});

router.get('/rp-projects', async (_req: Request, res: Response) => {
  try {
    const client = axios.create({
      baseURL: config.reportportal.url,
      headers: { Authorization: `Bearer ${config.reportportal.token}` },
      timeout: 15000,
      httpsAgent,
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
      timeout: 15000,
      httpsAgent,
    });
    const response = await client.get('/launch/names');
    const names: string[] = response.data?.content || response.data || [];
    res.json(names.sort());
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
    const client = axios.create({
      baseURL: `${config.jira.url}/rest/api/2`,
      headers: { Authorization: `Bearer ${config.jira.token}` },
      timeout: 15000,
      httpsAgent,
    });

    const [projectsRes, issueTypeRes, componentRes] = await Promise.allSettled([
      client.get('/project'),
      client.get('/issuetype'),
      client.get(`/project/${projectKey}/components`),
    ]);

    const projects = projectsRes.status === 'fulfilled'
      ? (projectsRes.value.data as Array<{ key: string; name: string }>)
          .map(project => ({ key: project.key, name: project.name }))
          .sort((a, b) => a.key.localeCompare(b.key))
      : [{ key: config.jira.projectKey, name: config.jira.projectKey }];

    const issueTypes = issueTypeRes.status === 'fulfilled'
      ? (issueTypeRes.value.data as Array<{ name: string }>)
          .map(type => type.name)
          .filter(name => !name.toLowerCase().includes('sub-task'))
      : ['Bug', 'Task', 'Story'];

    const components = componentRes.status === 'fulfilled'
      ? (componentRes.value.data as Array<{ name: string }>).map(component => component.name).sort()
      : [];

    res.json({ projects, issueTypes, components });
  } catch (err) {
    log.warn({ err }, 'Failed to fetch Jira metadata');
    res.json({ projects: [{ key: config.jira.projectKey, name: config.jira.projectKey }], issueTypes: ['Bug'], components: [] });
  }
});

export default router;
