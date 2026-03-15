import { Router, Request, Response } from 'express';
import axios from 'axios';
import https from 'https';
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
      projects = (projectsRes.data?.content || []).map((project: { projectName: string }) => project.projectName).sort();
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
          .map(project => ({ key: project.key, name: project.name }))
          .sort((a, b) => a.key.localeCompare(b.key))
      : [];

    const issueTypes = issueTypeRes.status === 'fulfilled'
      ? (issueTypeRes.value.data as Array<{ name: string }>)
          .map(type => type.name)
          .filter(name => !name.toLowerCase().includes('sub-task'))
      : [];

    const components = componentRes.status === 'fulfilled'
      ? (componentRes.value.data as Array<{ name: string }>).map(component => component.name).sort()
      : [];

    const message = projectResponse
      ? `Connected to project ${projectResponse.data.name} (${projectResponse.data.key}).`
      : `Connected to Jira. ${projects.length} projects available.`;

    res.json({ success: true, message, projects, issueTypes, components });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Connection failed';
    res.status(502).json({ success: false, message: `Jira connection failed: ${msg}`, error: `Jira connection failed: ${msg}` });
  }
});

export default router;
