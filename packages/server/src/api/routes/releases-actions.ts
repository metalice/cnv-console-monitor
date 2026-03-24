import { type NextFunction, type Request, type Response, Router } from 'express';

import type { ChecklistDetail } from '@cnv-monitor/shared';

import { config } from '../../config';
import { requireAdmin } from '../middleware/auth';

import { createJiraClient, isValidJiraKey } from './releases-helpers';

const router = Router();

router.get('/:key', async (req: Request, res: Response, next: NextFunction) => {
  if (!config.jira.enabled) {
    res.status(400).json({ error: 'Jira not configured' });
    return;
  }
  const key = req.params.key as string;
  if (!isValidJiraKey(key)) {
    res.status(400).json({ error: 'Invalid Jira key format' });
    return;
  }

  try {
    const client = createJiraClient();
    const [issueRes, transRes] = await Promise.all([
      client.get(`/issue/${key}`, {
        params: {
          fields:
            'summary,status,assignee,components,labels,fixVersions,priority,created,updated,resolutiondate,subtasks,description',
        },
      }),
      client.get(`/issue/${key}/transitions`),
    ]);

    const { fields } = issueRes.data;
    const subtasks = (fields.subtasks || []) as {
      key: string;
      fields: { summary: string; status: { name: string } };
    }[];

    const detail: ChecklistDetail = {
      assignee: fields.assignee?.displayName || null,
      components: (fields.components || []).map((component: { name: string }) => component.name),
      created: fields.created || '',
      description: fields.description || null,
      fixVersions: (fields.fixVersions || []).map((version: { name: string }) => version.name),
      key: issueRes.data.key,
      labels: fields.labels || [],
      priority: fields.priority?.name || '',
      resolved: fields.resolutiondate || null,
      status: fields.status?.name || '',
      subtaskCount: subtasks.length,
      subtasks: subtasks.map(subtask => ({
        key: subtask.key,
        status: subtask.fields.status.name,
        summary: subtask.fields.summary,
      })),
      subtasksDone: subtasks.filter(subtask => subtask.fields?.status?.name === 'Closed').length,
      summary: fields.summary || '',
      transitions: (transRes.data.transitions || []).map(
        (transition: { id: string; name: string }) => ({
          id: transition.id,
          name: transition.name,
        }),
      ),
      updated: fields.updated || '',
    };

    res.json(detail);
  } catch (err) {
    next(err);
  }
});

router.post(
  '/:key/transition',
  requireAdmin,
  async (req: Request, res: Response, _next: NextFunction) => {
    if (!config.jira.enabled) {
      res.status(400).json({ error: 'Jira not configured' });
      return;
    }
    const key = req.params.key as string;
    if (!isValidJiraKey(key)) {
      res.status(400).json({ error: 'Invalid Jira key format' });
      return;
    }

    try {
      const { assignee, comment, transitionId } = req.body as {
        transitionId: string;
        comment?: string;
        assignee?: string;
      };
      const client = createJiraClient();

      await client.post(`/issue/${key}/transitions`, { transition: { id: transitionId } });
      if (comment) {
        await client.post(`/issue/${key}/comment`, { body: comment });
      }
      if (assignee) {
        await client.put(`/issue/${key}`, { fields: { assignee: { name: assignee } } });
      }

      res.json({ success: true });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Transition failed';
      res.status(502).json({ error: msg });
    }
  },
);

router.post(
  '/:key/comment',
  requireAdmin,
  async (req: Request, res: Response, _next: NextFunction) => {
    if (!config.jira.enabled) {
      res.status(400).json({ error: 'Jira not configured' });
      return;
    }
    const key = req.params.key as string;
    if (!isValidJiraKey(key)) {
      res.status(400).json({ error: 'Invalid Jira key format' });
      return;
    }

    try {
      const { comment } = req.body as { comment: string };
      const client = createJiraClient();
      await client.post(`/issue/${key}/comment`, { body: comment });
      res.json({ success: true });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Comment failed';
      res.status(502).json({ error: msg });
    }
  },
);

export default router;
