import { Router, Request, Response, NextFunction } from 'express';
import axios from 'axios';
import https from 'https';
import { fetchCnvReleases } from '../../clients/productpages';
import { config } from '../../config';
import { requireAdmin } from '../middleware/auth';
import { logger, setResponseError } from '../../logger';
import type { ReleaseInfo, ChecklistTask, ChecklistDetail } from '@cnv-monitor/shared';

const log = logger.child({ module: 'Releases' });
const httpsAgent = new https.Agent({ rejectUnauthorized: false });
const router = Router();

const JIRA_KEY_PATTERN = /^[A-Z][A-Z0-9]+-\d+$/;
function isValidJiraKey(key: string): boolean {
  return JIRA_KEY_PATTERN.test(key) && key.length <= 30;
}

function createJiraClient() {
  return axios.create({
    baseURL: `${config.jira.url}/rest/api/2`,
    headers: { Authorization: `Bearer ${config.jira.token}`, 'Content-Type': 'application/json' },
    timeout: 15000,
    httpsAgent,
  });
}

router.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const ppReleases = await fetchCnvReleases();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const releases: ReleaseInfo[] = ppReleases
      .filter(r => !r.canceled && r.phase_display !== 'Unsupported')
      .map(r => {
        const tasks = (r.all_ga_tasks || []).sort(
          (a, b) => new Date(a.date_start).getTime() - new Date(b.date_start).getTime(),
        );

        const pastTasks = tasks.filter(t => new Date(t.date_start) <= today);
        const futureTasks = tasks.filter(t => new Date(t.date_start) > today);
        const lastReleased = pastTasks.length ? pastTasks[pastTasks.length - 1] : null;
        const nextRelease = futureTasks.length ? futureTasks[0] : null;

        const zMatch = lastReleased?.name.match(/(\d+\.\d+\.?\d*)/);
        const currentZStream = zMatch ? zMatch[1] : null;

        const daysUntilNext = nextRelease
          ? Math.round((new Date(nextRelease.date_start).getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
          : null;

        const daysSinceLastRelease = lastReleased
          ? Math.round((today.getTime() - new Date(lastReleased.date_start).getTime()) / (1000 * 60 * 60 * 24))
          : null;

        return {
          shortname: r.shortname,
          name: r.name,
          phase: r.phase_display,
          gaDate: r.ga_date,
          currentZStream,
          currentZStreamDate: lastReleased?.date_start ?? null,
          nextRelease: nextRelease ? { name: nextRelease.name, date: nextRelease.date_start } : null,
          daysUntilNext,
          daysSinceLastRelease,
          milestones: tasks.map(t => ({
            name: t.name,
            date: t.date_start,
            isPast: new Date(t.date_start) <= today,
          })),
        };
      })
      .sort((a, b) => {
        const aDate = a.gaDate ? new Date(a.gaDate).getTime() : Infinity;
        const bDate = b.gaDate ? new Date(b.gaDate).getTime() : Infinity;
        return bDate - aDate;
      });

    res.json(releases);
  } catch (err) {
    next(err);
  }
});

router.get('/checklist', async (req: Request, res: Response, next: NextFunction) => {
  if (!config.jira.enabled) {
    res.json([]);
    return;
  }

  try {
    const sanitizeJql = (s: string) => s.replace(/["\\\n\r{}()\[\]]/g, '').substring(0, 100);
    const component = req.query.component ? sanitizeJql(req.query.component as string) : undefined;
    const status = (req.query.status as string) || 'open';
    const version = req.query.version ? sanitizeJql(req.query.version as string) : undefined;

    const jqlParts = [
      `project = ${config.jira.projectKey}`,
      `labels = CNV-Release-Checklist`,
      `issuetype = Task`,
    ];

    if (component) jqlParts.push(`component = "${component}"`);
    if (status === 'open') jqlParts.push(`status != Closed`);
    if (version) jqlParts.push(`fixVersion = "${version}"`);

    const jql = jqlParts.join(' AND ') + ' ORDER BY updated DESC';
    const client = createJiraClient();
    const fields = ['summary', 'status', 'assignee', 'components', 'labels', 'fixVersions', 'priority', 'created', 'updated', 'resolutiondate', 'subtasks'];
    const pageSize = 100;
    const tasks: ChecklistTask[] = [];
    let startAt = 0;
    let total = 0;

    do {
      const response = await client.post('/search', { jql, maxResults: pageSize, startAt, fields });
      total = response.data.total || 0;

      for (const issue of (response.data.issues || [])) {
        const f = issue.fields as Record<string, unknown>;
        const subtasks = (f.subtasks || []) as Array<{ fields: { status: { name: string } } }>;
        tasks.push({
          key: issue.key as string,
          summary: (f.summary as string) || '',
          status: (f.status as { name: string })?.name || '',
          assignee: (f.assignee as { displayName: string })?.displayName || null,
          components: ((f.components || []) as Array<{ name: string }>).map(c => c.name),
          labels: (f.labels || []) as string[],
          fixVersions: ((f.fixVersions || []) as Array<{ name: string }>).map(v => v.name),
          priority: (f.priority as { name: string })?.name || '',
          created: (f.created as string) || '',
          updated: (f.updated as string) || '',
          resolved: (f.resolutiondate as string) || null,
          subtaskCount: subtasks.length,
          subtasksDone: subtasks.filter(s => s.fields?.status?.name === 'Closed').length,
        });
      }

      startAt += pageSize;
    } while (startAt < total);

    res.json(tasks);
  } catch (err) {
    const rawMsg = err instanceof Error ? err.message : 'Jira unavailable';
    const errorMsg = `Failed to fetch release checklist: ${rawMsg.includes('503') ? 'Jira is currently unavailable' : rawMsg}`;
    setResponseError(res, errorMsg);
    res.status(502).json({ error: errorMsg });
  }
});

router.get('/checklist/:key', async (req: Request, res: Response, next: NextFunction) => {
  if (!config.jira.enabled) {
    res.status(400).json({ error: 'Jira not configured' });
    return;
  }
  if (!isValidJiraKey(req.params.key)) {
    res.status(400).json({ error: 'Invalid Jira key format' });
    return;
  }

  try {
    const client = createJiraClient();
    const [issueRes, transRes] = await Promise.all([
      client.get(`/issue/${req.params.key}`, {
        params: { fields: 'summary,status,assignee,components,labels,fixVersions,priority,created,updated,resolutiondate,subtasks,description' },
      }),
      client.get(`/issue/${req.params.key}/transitions`),
    ]);

    const f = issueRes.data.fields;
    const subtasks = (f.subtasks || []) as Array<{ key: string; fields: { summary: string; status: { name: string } } }>;

    const detail: ChecklistDetail = {
      key: issueRes.data.key,
      summary: f.summary || '',
      status: f.status?.name || '',
      assignee: f.assignee?.displayName || null,
      components: (f.components || []).map((c: { name: string }) => c.name),
      labels: f.labels || [],
      fixVersions: (f.fixVersions || []).map((v: { name: string }) => v.name),
      priority: f.priority?.name || '',
      created: f.created || '',
      updated: f.updated || '',
      resolved: f.resolutiondate || null,
      subtaskCount: subtasks.length,
      subtasksDone: subtasks.filter(s => s.fields?.status?.name === 'Closed').length,
      description: f.description || null,
      subtasks: subtasks.map(s => ({ key: s.key, summary: s.fields.summary, status: s.fields.status.name })),
      transitions: (transRes.data.transitions || []).map((t: { id: string; name: string }) => ({ id: t.id, name: t.name })),
    };

    res.json(detail);
  } catch (err) {
    next(err);
  }
});

router.post('/checklist/:key/transition', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  if (!config.jira.enabled) {
    res.status(400).json({ error: 'Jira not configured' });
    return;
  }
  if (!isValidJiraKey(req.params.key)) {
    res.status(400).json({ error: 'Invalid Jira key format' });
    return;
  }

  try {
    const { transitionId, comment, assignee } = req.body as { transitionId: string; comment?: string; assignee?: string };
    const client = createJiraClient();

    await client.post(`/issue/${req.params.key}/transitions`, {
      transition: { id: transitionId },
    });

    if (comment) {
      await client.post(`/issue/${req.params.key}/comment`, { body: comment });
    }

    if (assignee) {
      await client.put(`/issue/${req.params.key}`, { fields: { assignee: { name: assignee } } });
    }

    res.json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Transition failed';
    res.status(502).json({ error: msg });
  }
});

router.post('/checklist/:key/comment', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  if (!config.jira.enabled) {
    res.status(400).json({ error: 'Jira not configured' });
    return;
  }
  if (!isValidJiraKey(req.params.key)) {
    res.status(400).json({ error: 'Invalid Jira key format' });
    return;
  }

  try {
    const { comment } = req.body as { comment: string };
    const client = createJiraClient();
    await client.post(`/issue/${req.params.key}/comment`, { body: comment });
    res.json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Comment failed';
    res.status(502).json({ error: msg });
  }
});

export default router;
