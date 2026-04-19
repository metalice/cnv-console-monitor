import { type NextFunction, type Request, type Response, Router } from 'express';

import {
  CreateFeedbackRequestSchema,
  CreateFeedbackResponseSchema,
  UpdateFeedbackRequestSchema,
} from '@cnv-monitor/shared';

import {
  addResponse,
  addVote,
  createFeedback,
  exportFeedbackCsv,
  getFeedbackById,
  getFeedbackStats,
  getResponseCountsForFeedback,
  getResponses,
  getVoteCount,
  getVoteCountsForFeedback,
  listFeedback,
  removeVote,
  searchSimilarFeedback,
  updateFeedback,
} from '../../db/store';
import {
  sendFeedbackAdminNotification,
  sendFeedbackStatusNotification,
} from '../../notifiers/feedback-email';
import { requireAdmin } from '../middleware/auth';
import { parseIntParam, validateBody } from '../middleware/validate';

const router = Router();

const mapFeedbackToDto = (
  entity: {
    admin_note: string | null;
    category: string;
    component_filter: string | null;
    console_errors: string | null;
    created_at: Date;
    description: string;
    id: number;
    page_url: string;
    priority: string | null;
    satisfaction: boolean | null;
    screenshot: string | null;
    status: string;
    submitted_by: string;
    tags: string[];
    updated_at: Date;
    user_agent: string | null;
  },
  extra: {
    responseCount?: number;
    responses?: {
      author_email: string;
      author_name: string;
      created_at: Date;
      id: number;
      message: string;
    }[];
    userHasVoted?: boolean;
    voteCount?: number;
  } = {},
) => ({
  adminNote: entity.admin_note,
  category: entity.category,
  componentFilter: entity.component_filter,
  consoleErrors: entity.console_errors,
  createdAt: entity.created_at.toISOString(),
  description: entity.description,
  id: entity.id,
  pageUrl: entity.page_url,
  priority: entity.priority,
  responseCount: extra.responseCount ?? extra.responses?.length ?? 0,
  responses: (extra.responses ?? []).map(resp => ({
    authorEmail: resp.author_email,
    authorName: resp.author_name,
    createdAt: resp.created_at.toISOString(),
    id: resp.id,
    message: resp.message,
  })),
  satisfaction: entity.satisfaction,
  screenshot: entity.screenshot,
  status: entity.status,
  submittedBy: entity.submitted_by,
  tags: entity.tags,
  updatedAt: entity.updated_at.toISOString(),
  userAgent: entity.user_agent,
  userHasVoted: extra.userHasVoted ?? false,
  voteCount: extra.voteCount ?? 0,
});

router.post(
  '/',
  validateBody(CreateFeedbackRequestSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = req.body as {
        category: string;
        componentFilter?: string | null;
        consoleErrors?: string | null;
        description: string;
        pageUrl: string;
        screenshot?: string | null;
      };

      const entity = await createFeedback({
        category: body.category,
        componentFilter: body.componentFilter,
        consoleErrors: body.consoleErrors,
        description: body.description,
        pageUrl: body.pageUrl,
        screenshot: body.screenshot,
        submittedBy: req.user?.email ?? 'unknown',
        userAgent: req.headers['user-agent'] ?? null,
      });

      void sendFeedbackAdminNotification({
        category: entity.category,
        description: entity.description,
        id: entity.id,
        pageUrl: entity.page_url,
        screenshot: entity.screenshot,
        submittedBy: entity.submitted_by,
      });

      res.status(201).json(mapFeedbackToDto(entity));
    } catch (err) {
      next(err);
    }
  },
);

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { category, limit, page, priority, sort, status } = req.query as Record<string, string>;
    const result = await listFeedback(
      {
        category,
        limit: limit ? parseInt(limit, 10) : undefined,
        page: page ? parseInt(page, 10) : undefined,
        priority,
        sort: sort === 'votes' ? 'votes' : 'newest',
        status,
      },
      req.user?.email,
    );

    const feedbackIds = result.items.map(item => item.id);
    const [voteCounts, responseCounts] = await Promise.all([
      getVoteCountsForFeedback(feedbackIds),
      getResponseCountsForFeedback(feedbackIds),
    ]);

    const items = result.items.map(item =>
      mapFeedbackToDto(item, {
        responseCount: responseCounts.get(item.id) ?? 0,
        userHasVoted: result.votedIds.has(item.id),
        voteCount: voteCounts.get(item.id) ?? 0,
      }),
    );

    res.json({
      items,
      page: result.page,
      pageSize: result.pageSize,
      total: result.total,
    });
  } catch (err) {
    next(err);
  }
});

router.get('/stats', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    res.json(await getFeedbackStats());
  } catch (err) {
    next(err);
  }
});

router.get('/search-similar', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = req.query.q as string;
    const category = req.query.category as string | undefined;
    if (!query || query.length < 3) {
      res.json([]);
      return;
    }

    const results = await searchSimilarFeedback(query, category);
    const feedbackIds = results.map(item => item.id);
    const voteCounts = await getVoteCountsForFeedback(feedbackIds);

    res.json(
      results.map(item => mapFeedbackToDto(item, { voteCount: voteCounts.get(item.id) ?? 0 })),
    );
  } catch (err) {
    next(err);
  }
});

router.get('/export', requireAdmin, async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const csv = await exportFeedbackCsv();
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="feedback-export.csv"');
    res.send(csv);
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseIntParam(req.params.id, 'id', res);
    if (id === null) return;

    const entity = await getFeedbackById(id);
    if (!entity) {
      res.status(404).json({ error: 'Feedback not found' });
      return;
    }

    const [voteCount, responses] = await Promise.all([getVoteCount(id), getResponses(id)]);

    const userEmail = req.user?.email;
    let userHasVoted = false;
    if (userEmail) {
      const { alreadyVoted } = await addVote(id, userEmail).catch(() => ({
        alreadyVoted: true,
      }));
      if (alreadyVoted) {
        userHasVoted = true;
      } else {
        await removeVote(id, userEmail);
      }
    }

    res.json(mapFeedbackToDto(entity, { responses, userHasVoted, voteCount }));
  } catch (err) {
    next(err);
  }
});

router.patch(
  '/:id',
  validateBody(UpdateFeedbackRequestSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseIntParam(req.params.id, 'id', res);
      if (id === null) return;

      const existing = await getFeedbackById(id);
      if (!existing) {
        res.status(404).json({ error: 'Feedback not found' });
        return;
      }

      const body = req.body as {
        adminNote?: string | null;
        priority?: string | null;
        satisfaction?: boolean | null;
        status?: string;
        tags?: string[];
      };

      const isSatisfactionOnly =
        body.satisfaction !== undefined &&
        !body.status &&
        !body.priority &&
        !body.adminNote &&
        !body.tags;
      const isSubmitter = req.user?.email === existing.submitted_by;

      if (isSatisfactionOnly && isSubmitter) {
        // Submitter can set satisfaction on their own feedback
      } else if (req.user?.role !== 'admin') {
        res.status(403).json({ error: 'Admin access required' });
        return;
      }

      const previousStatus = existing.status;
      const updated = await updateFeedback(id, body);
      if (!updated) {
        res.status(404).json({ error: 'Feedback not found' });
        return;
      }

      if (body.status && body.status !== previousStatus) {
        void sendFeedbackStatusNotification(
          existing.submitted_by,
          id,
          body.status,
          existing.category,
        );
      }

      res.json(mapFeedbackToDto(updated));
    } catch (err) {
      next(err);
    }
  },
);

router.post('/:id/vote', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseIntParam(req.params.id, 'id', res);
    if (id === null) return;

    const feedback = await getFeedbackById(id);
    if (!feedback) {
      res.status(404).json({ error: 'Feedback not found' });
      return;
    }

    const userEmail = req.user?.email ?? '';
    const { alreadyVoted } = await addVote(id, userEmail);
    if (alreadyVoted) {
      res.status(409).json({ error: 'Already voted' });
      return;
    }

    const voteCount = await getVoteCount(id);
    res.json({ success: true, voteCount });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id/vote', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseIntParam(req.params.id, 'id', res);
    if (id === null) return;

    const userEmail = req.user?.email ?? '';
    await removeVote(id, userEmail);

    const voteCount = await getVoteCount(id);
    res.json({ success: true, voteCount });
  } catch (err) {
    next(err);
  }
});

router.post(
  '/:id/respond',
  requireAdmin,
  validateBody(CreateFeedbackResponseSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseIntParam(req.params.id, 'id', res);
      if (id === null) return;

      const feedback = await getFeedbackById(id);
      if (!feedback) {
        res.status(404).json({ error: 'Feedback not found' });
        return;
      }

      const body = req.body as { message: string };
      const response = await addResponse(
        id,
        req.user?.email ?? 'unknown',
        req.user?.name ?? 'Admin',
        body.message,
      );

      res.status(201).json({
        authorEmail: response.author_email,
        authorName: response.author_name,
        createdAt: response.created_at.toISOString(),
        id: response.id,
        message: response.message,
      });
    } catch (err) {
      next(err);
    }
  },
);

export default router;
