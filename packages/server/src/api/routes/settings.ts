import { Router, Request, Response, NextFunction } from 'express';
import axios from 'axios';
import https from 'https';
import { config, applySettingsOverrides, EDITABLE_KEYS, startedAt, lastPollAt } from '../../config';
import { getAllSettings, setSetting } from '../../db/store';
import { requireAdmin } from '../middleware/auth';
import { logger } from '../../logger';

const log = logger.child({ module: 'Settings' });
const httpsAgent = new https.Agent({ rejectUnauthorized: false });

const router = Router();

router.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const dbSettings = await getAllSettings();

    const editableSettings: Record<string, { value: string; source: 'db' | 'env' }> = {};
    const maskToken = (t: string) => t ? `••••${t.substring(t.length - 4)}` : '';

    const configValues: Record<string, string> = {
      'reportportal.url': config.reportportal.url,
      'reportportal.project': config.reportportal.project,
      'reportportal.token': maskToken(config.reportportal.token),
      'email.from': config.email.from,
      'email.host': config.email.host,
      'email.user': config.email.user,
      'email.pass': config.email.pass ? '••••••' : '',
      'schedule.pollIntervalMinutes': String(config.schedule.pollIntervalMinutes),
      'schedule.timezone': config.schedule.timezone,
      'schedule.initialLookbackDays': String(config.schedule.initialLookbackDays),
      'dashboard.url': config.dashboard.url,
      'polarion.url': config.polarion.url,
      'jira.url': config.jira.url,
      'jira.projectKey': config.jira.projectKey,
      'jira.issueType': config.jira.issueType,
      'jira.component': dbSettings['jira.component'] || 'CNV User Interface',
      'jira.token': maskToken(config.jira.token),
      'slack.jiraWebhookUrl': config.slack.jiraWebhookUrl,
    };

    for (const key of EDITABLE_KEYS) {
      editableSettings[key] = {
        value: configValues[key] ?? dbSettings[key] ?? '',
        source: dbSettings[key] !== undefined ? 'db' : 'env',
      };
    }

    res.json({
      settings: editableSettings,
      system: {
        reportportalUrl: config.reportportal.url,
        reportportalProject: config.reportportal.project,
        authEnabled: config.auth.enabled,
        emailEnabled: config.email.enabled,
        slackEnabled: !!config.slack.jiraWebhookUrl,
        jiraEnabled: config.jira.enabled,
        uptime: Math.round((Date.now() - startedAt) / 1000),
        lastPollAt,
      },
    });
  } catch (err) {
    next(err);
  }
});

router.put('/', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const updates = req.body as Record<string, string>;
    const updatedBy = req.user?.email || 'unknown';

    for (const [key, value] of Object.entries(updates)) {
      if (!EDITABLE_KEYS.includes(key)) {
        res.status(400).json({ error: `Setting '${key}' is not editable` });
        return;
      }
      await setSetting(key, value, updatedBy);
    }

    const dbSettings = await getAllSettings();
    applySettingsOverrides(dbSettings);

    res.json({ success: true, updated: Object.keys(updates) });
  } catch (err) {
    next(err);
  }
});

router.get('/health', async (_req: Request, res: Response) => {
  const checks: Record<string, { status: 'up' | 'down'; message: string }> = {};

  // ReportPortal
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

  // Jira
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

  res.json(checks);
});

router.post('/test-rp', requireAdmin, async (req: Request, res: Response) => {
  try {
    const payload = (req.body || {}) as { url?: string; project?: string; token?: string };
    const dbSettings = await getAllSettings();
    const rpUrl = (
      payload.url !== undefined
        ? payload.url
        : (dbSettings['reportportal.url'] ?? config.reportportal.url)
    ).replace(/\/+$/, '');
    const rpProject = (
      payload.project !== undefined
        ? payload.project
        : (dbSettings['reportportal.project'] ?? config.reportportal.project)
    ).trim();
    const rpToken = (
      payload.token !== undefined
        ? payload.token
        : (dbSettings['reportportal.token'] ?? config.reportportal.token)
    ).trim();

    if (!rpUrl || !rpToken) {
      res.status(400).json({ error: 'ReportPortal URL and token are required.' });
      return;
    }
    if (!rpProject) {
      res.status(400).json({ error: 'ReportPortal project is required.' });
      return;
    }

    const client = axios.create({
      baseURL: `${rpUrl}/api/v1/${rpProject}`,
      headers: { Authorization: `Bearer ${rpToken}` },
      timeout: 10000,
      httpsAgent,
    });
    const response = await client.get('/launch', { params: { 'page.size': 1 } });
    const total = response.data?.page?.totalElements ?? 0;

    let projects: string[] = [];
    let launchNames: string[] = [];

    try {
      const rpRoot = axios.create({
        baseURL: rpUrl,
        headers: { Authorization: `Bearer ${rpToken}` },
        timeout: 10000,
        httpsAgent,
      });
      const projectsRes = await rpRoot.get('/api/v1/project/list', { params: { 'page.size': 100 } });
      projects = (projectsRes.data?.content || []).map((p: { projectName: string }) => p.projectName).sort();
    } catch {
      // optional
    }

    try {
      const namesRes = await client.get('/launch/names');
      launchNames = (namesRes.data?.content || namesRes.data || []).sort();
    } catch {
      // optional
    }

    res.json({
      success: true,
      message: `Connected. ${total} launches found in project ${rpProject}.`,
      projects,
      launchNames,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Connection failed';
    res.status(502).json({ success: false, message: `ReportPortal connection failed: ${msg}`, error: `ReportPortal connection failed: ${msg}` });
  }
});

router.post('/test-jira', requireAdmin, async (req: Request, res: Response) => {
  const payload = (req.body || {}) as { url?: string; token?: string; projectKey?: string };
  const dbSettings = await getAllSettings();
  const jiraUrl = (
    payload.url !== undefined
      ? payload.url
      : (dbSettings['jira.url'] ?? config.jira.url)
  ).replace(/\/+$/, '');
  const jiraToken = (
    payload.token !== undefined
      ? payload.token
      : (dbSettings['jira.token'] ?? config.jira.token)
  ).trim();
  const jiraProject = (
    payload.projectKey !== undefined
      ? payload.projectKey
      : (dbSettings['jira.projectKey'] ?? config.jira.projectKey)
  ).trim();

  if (!jiraUrl || !jiraToken) {
    res.status(400).json({ success: false, message: 'Jira URL and token are required.', error: 'Jira URL and token are required.' });
    return;
  }
  try {
    const client = axios.create({
      baseURL: `${jiraUrl}/rest/api/2`,
      headers: { Authorization: `Bearer ${jiraToken}` },
      timeout: 10000,
      httpsAgent,
    });
    await client.get('/myself');
    const projectResponse = jiraProject ? await client.get(`/project/${jiraProject}`) : null;

    const [projectsRes, issueTypeRes, componentRes] = await Promise.allSettled([
      client.get('/project'),
      client.get('/issuetype'),
      jiraProject ? client.get(`/project/${jiraProject}/components`) : Promise.resolve({ data: [] }),
    ]);

    const projects = projectsRes.status === 'fulfilled'
      ? (projectsRes.value.data as Array<{ key: string; name: string }>)
          .map(p => ({ key: p.key, name: p.name }))
          .sort((a, b) => a.key.localeCompare(b.key))
      : [];

    const issueTypes = issueTypeRes.status === 'fulfilled'
      ? (issueTypeRes.value.data as Array<{ name: string }>)
          .map(t => t.name)
          .filter(n => !n.toLowerCase().includes('sub-task'))
      : [];

    const components = componentRes.status === 'fulfilled'
      ? (componentRes.value.data as Array<{ name: string }>).map(c => c.name).sort()
      : [];

    const message = projectResponse
      ? `Connected to project ${projectResponse.data.name} (${projectResponse.data.key}).`
      : `Connected to Jira. ${projects.length} projects available.`;

    res.json({
      success: true,
      message,
      projects,
      issueTypes,
      components,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Connection failed';
    res.status(502).json({ success: false, message: `Jira connection failed: ${msg}`, error: `Jira connection failed: ${msg}` });
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
          .map(p => ({ key: p.key, name: p.name }))
          .sort((a, b) => a.key.localeCompare(b.key))
      : [{ key: config.jira.projectKey, name: config.jira.projectKey }];

    const issueTypes = issueTypeRes.status === 'fulfilled'
      ? (issueTypeRes.value.data as Array<{ name: string }>)
          .map(t => t.name)
          .filter(n => !n.toLowerCase().includes('sub-task'))
      : ['Bug', 'Task', 'Story'];

    const components = componentRes.status === 'fulfilled'
      ? (componentRes.value.data as Array<{ name: string }>).map(c => c.name).sort()
      : [];

    res.json({ projects, issueTypes, components });
  } catch (err) {
    log.warn({ err }, 'Failed to fetch Jira metadata');
    res.json({ projects: [{ key: config.jira.projectKey, name: config.jira.projectKey }], issueTypes: ['Bug'], components: [] });
  }
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
    const projects: string[] = (response.data?.content || []).map((p: { projectName: string }) => p.projectName);
    res.json(projects.sort());
  } catch (err) {
    log.warn({ err }, 'Failed to fetch RP projects');
    res.json([config.reportportal.project]);
  }
});

export default router;
