import https from 'https';

import axios from 'axios';
import { type Request, type Response, Router } from 'express';

import { config } from '../../config';
import { getAllSettings } from '../../db/store';
import { requireAdmin } from '../middleware/auth';

const httpsAgent = new https.Agent({ rejectUnauthorized: false });
const router = Router();

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
      httpsAgent,
      timeout: 10000,
    });
    const response = await client.get('/launch', { params: { 'page.size': 1 } });
    const total = response.data?.page?.totalElements ?? 0;

    let projects: string[] = [];
    let launchNames: string[] = [];

    try {
      const rpRoot = axios.create({
        baseURL: rpUrl,
        headers: { Authorization: `Bearer ${rpToken}` },
        httpsAgent,
        timeout: 10000,
      });
      const projectsRes = await rpRoot.get('/api/v1/project/list', {
        params: { 'page.size': 100 },
      });
      projects = (projectsRes.data?.content || [])
        .map((project: { projectName: string }) => project.projectName)
        .sort();
    } catch {
      // Optional
    }

    try {
      const namesRes = await client.get('/launch/names');
      launchNames = (namesRes.data?.content || namesRes.data || []).sort();
    } catch {
      // Optional
    }

    res.json({
      launchNames,
      message: `Connected. ${total} launches found in project ${rpProject}.`,
      projects,
      success: true,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Connection failed';
    res.status(502).json({
      error: `ReportPortal connection failed: ${msg}`,
      message: `ReportPortal connection failed: ${msg}`,
      success: false,
    });
  }
});

router.post('/test-jira', requireAdmin, async (req: Request, res: Response) => {
  const payload = (req.body || {}) as {
    url?: string;
    token?: string;
    email?: string;
    projectKey?: string;
  };
  const dbSettings = await getAllSettings();
  const resolve = (key: string, fallback: string) =>
    (payload[key as keyof typeof payload] !== undefined
      ? String(payload[key as keyof typeof payload])
      : (dbSettings[`jira.${key}`] ?? fallback)
    ).trim();
  const jiraUrl = resolve('url', config.jira.url).replace(/\/+$/, '');
  const jiraToken = resolve('token', config.jira.token);
  const jiraEmail = resolve('email', config.jira.email);
  const jiraProject = resolve('projectKey', config.jira.projectKey);

  if (!jiraUrl || !jiraToken) {
    res.status(400).json({
      error: 'Jira URL and token are required.',
      message: 'Jira URL and token are required.',
      success: false,
    });
    return;
  }
  try {
    const { createJiraClient } = await import('../../clients/jira-auth');
    const client = createJiraClient({ email: jiraEmail, token: jiraToken, url: jiraUrl });
    await client.get('/myself');
    const projectResponse = jiraProject ? await client.get(`/project/${jiraProject}`) : null;

    const [projectsRes, issueTypeRes, componentRes] = await Promise.allSettled([
      client.get('/project'),
      client.get('/issuetype'),
      jiraProject
        ? client.get(`/project/${jiraProject}/components`)
        : Promise.resolve({ data: [] }),
    ]);

    const projects =
      projectsRes.status === 'fulfilled'
        ? (projectsRes.value.data as { key: string; name: string }[])
            .map(project => ({ key: project.key, name: project.name }))
            .sort((a, b) => a.key.localeCompare(b.key))
        : [];

    const issueTypes =
      issueTypeRes.status === 'fulfilled'
        ? (issueTypeRes.value.data as { name: string }[])
            .map(type => type.name)
            .filter(name => !name.toLowerCase().includes('sub-task'))
        : [];

    const components =
      componentRes.status === 'fulfilled'
        ? (componentRes.value.data as { name: string }[]).map(component => component.name).sort()
        : [];

    const message = projectResponse
      ? `Connected to project ${projectResponse.data.name} (${projectResponse.data.key}).`
      : `Connected to Jira. ${projects.length} projects available.`;

    res.json({ components, issueTypes, message, projects, success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Connection failed';
    res.status(502).json({
      error: `Jira connection failed: ${msg}`,
      message: `Jira connection failed: ${msg}`,
      success: false,
    });
  }
});

router.post('/test-jenkins', requireAdmin, async (req: Request, res: Response) => {
  const payload = (req.body || {}) as { user?: string; token?: string };
  const dbSettings = await getAllSettings();
  const jenkinsUser = (payload.user ?? dbSettings['jenkins.user'] ?? config.jenkins.user).trim();
  const jenkinsToken = (
    payload.token ??
    dbSettings['jenkins.token'] ??
    config.jenkins.token
  ).trim();

  if (!jenkinsUser || !jenkinsToken) {
    res
      .status(400)
      .json({ message: 'Jenkins username and API token are required.', success: false });
    return;
  }
  try {
    const testUrl = 'https://jenkins-csb-cnvqe-main.dno.corp.redhat.com/api/json?tree=nodeName';
    await axios.get(testUrl, {
      auth: { password: jenkinsToken, username: jenkinsUser },
      httpsAgent,
      timeout: 10000,
    });
    res.json({ message: `Connected to Jenkins as ${jenkinsUser}.`, success: true });
  } catch (err) {
    const status = (err as Record<string, unknown>).response
      ? ((err as Record<string, unknown>).response as Record<string, unknown>).status
      : undefined;
    const message =
      status === 403
        ? 'Invalid credentials (403 Forbidden)'
        : err instanceof Error
          ? err.message
          : 'Connection failed';
    res.status(502).json({ message: `Jenkins connection failed: ${message}`, success: false });
  }
});

router.post('/test-gitlab', requireAdmin, async (req: Request, res: Response) => {
  const payload = (req.body || {}) as { token?: string };
  const dbSettings = await getAllSettings();
  const token = (payload.token ?? dbSettings['gitlab.token'] ?? '').trim();

  if (!token) {
    res.status(400).json({ message: 'GitLab access token is required.', success: false });
    return;
  }
  try {
    const repos = await (await import('../../db/store')).getAllRepositories();
    const gitlabRepo = repos.find(r => r.provider === 'gitlab');
    const baseUrl = gitlabRepo?.api_base_url || '';
    if (!baseUrl) {
      res.status(400).json({
        message: 'No GitLab repository configured. Add one first to detect the API URL.',
        success: false,
      });
      return;
    }
    const apiRes = await axios.get(`${baseUrl}/user`, {
      headers: { 'Private-Token': token },
      httpsAgent,
      timeout: 10000,
    });
    res.json({
      message: `Connected to GitLab as ${apiRes.data.username} (${apiRes.data.email || 'no email'}).`,
      success: true,
    });
  } catch (err) {
    const status = (err as Record<string, unknown>).response
      ? ((err as Record<string, unknown>).response as Record<string, unknown>).status
      : undefined;
    let message: string;
    if (status === 401) {
      message = 'Token is invalid or expired.';
    } else if (status === 403) {
      message = 'Token lacks required permissions (needs read_api scope).';
    } else {
      message = err instanceof Error ? err.message : 'Connection failed';
    }
    res.status(502).json({ message: `GitLab connection failed: ${message}`, success: false });
  }
});

router.post('/test-github', requireAdmin, async (req: Request, res: Response) => {
  const payload = (req.body || {}) as { token?: string };
  const dbSettings = await getAllSettings();
  const token = (payload.token ?? dbSettings['github.token'] ?? '').trim();

  if (!token) {
    res.status(400).json({ message: 'GitHub access token is required.', success: false });
    return;
  }
  try {
    const apiRes = await axios.get('https://api.github.com/user', {
      headers: { Authorization: `Bearer ${token}` },
      timeout: 10000,
    });
    res.json({
      message: `Connected to GitHub as ${apiRes.data.login} (${apiRes.data.email || 'no email'}).`,
      success: true,
    });
  } catch (err) {
    const status = (err as Record<string, unknown>).response
      ? ((err as Record<string, unknown>).response as Record<string, unknown>).status
      : undefined;
    let message: string;
    if (status === 401) {
      message = 'Token is invalid or expired.';
    } else if (status === 403) {
      message = 'Token lacks required permissions.';
    } else {
      message = err instanceof Error ? err.message : 'Connection failed';
    }
    res.status(502).json({ message: `GitHub connection failed: ${message}`, success: false });
  }
});

export default router;
