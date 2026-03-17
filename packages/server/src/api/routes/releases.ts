import { Router, Request, Response, NextFunction } from 'express';
import { fetchCnvReleases } from '../../clients/productpages';
import { config } from '../../config';
import { logger, setResponseError } from '../../logger';
import type { ReleaseInfo, ChecklistTask } from '@cnv-monitor/shared';
import { sanitizeJql, createJiraClient } from './releases-helpers';
import { jiraSearch } from '../../clients/jira';
import checklistActionsRouter from './releases-actions';

const log = logger.child({ module: 'Releases' });
const router = Router();

router.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const ppReleases = await fetchCnvReleases();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const releases: ReleaseInfo[] = ppReleases
      .filter(release => !release.canceled && release.phase_display !== 'Unsupported')
      .map(release => {
        const tasks = (release.all_ga_tasks || []).sort(
          (a, b) => new Date(a.date_start).getTime() - new Date(b.date_start).getTime(),
        );

        const pastTasks = tasks.filter(task => new Date(task.date_start) <= today);
        const futureTasks = tasks.filter(task => new Date(task.date_start) > today);
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
          shortname: release.shortname,
          name: release.name,
          phase: release.phase_display,
          gaDate: release.ga_date,
          currentZStream,
          currentZStreamDate: lastReleased?.date_start ?? null,
          nextRelease: nextRelease ? { name: nextRelease.name, date: nextRelease.date_start } : null,
          daysUntilNext,
          daysSinceLastRelease,
          milestones: tasks.map(task => ({
            name: task.name,
            date: task.date_start,
            isPast: new Date(task.date_start) <= today,
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
  if (!config.jira.enabled) { res.json([]); return; }

  try {
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
    const searchFields = ['summary', 'status', 'assignee', 'components', 'labels', 'fixVersions', 'priority', 'created', 'updated', 'resolutiondate', 'subtasks'];
    const response = await jiraSearch(client, jql, searchFields, 100, 0);

    const tasks: ChecklistTask[] = (response.data.issues || []).map((issue: Record<string, unknown>) => {
      const f = issue.fields as Record<string, unknown>;
      const subtasks = (f.subtasks || []) as Array<{ fields: { status: { name: string } } }>;
      return {
        key: issue.key as string,
        summary: (f.summary as string) || '',
        status: (f.status as { name: string })?.name || '',
        assignee: (f.assignee as { displayName: string })?.displayName || null,
        components: ((f.components || []) as Array<{ name: string }>).map((c: { name: string }) => c.name),
        labels: (f.labels || []) as string[],
        fixVersions: ((f.fixVersions || []) as Array<{ name: string }>).map((v: { name: string }) => v.name),
        priority: (f.priority as { name: string })?.name || '',
        created: (f.created as string) || '',
        updated: (f.updated as string) || '',
        resolved: (f.resolutiondate as string) || null,
        subtaskCount: subtasks.length,
        subtasksDone: subtasks.filter(subtask => subtask.fields?.status?.name === 'Closed').length,
      };
    });

    res.json(tasks);
  } catch (err) {
    const rawMsg = err instanceof Error ? err.message : 'Jira unavailable';
    const statusCode = (err as { response?: { status?: number } })?.response?.status;
    let friendlyMsg = rawMsg;
    if (statusCode === 503) friendlyMsg = 'Jira is currently unavailable';
    else if (statusCode === 410) friendlyMsg = 'Jira search API endpoint is no longer available (410 Gone)';
    else if (statusCode === 401 || statusCode === 403) friendlyMsg = 'Jira authentication failed — check token configuration';
    const errorMsg = `Failed to fetch release checklist: ${friendlyMsg}`;
    setResponseError(res, errorMsg);
    res.status(502).json({ error: errorMsg });
  }
});

router.use('/checklist', checklistActionsRouter);

export default router;
