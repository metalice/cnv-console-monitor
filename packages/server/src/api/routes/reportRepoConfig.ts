import { Router } from 'express';

import {
  type CreateReportRepo,
  CreateReportRepoSchema,
  detectProvider,
  type UpdateReportRepo,
  UpdateReportRepoSchema,
} from '@cnv-monitor/shared';

import {
  createReportRepo,
  deleteReportRepo,
  getAllReportRepos,
  getReportReposByComponent,
  updateReportRepo,
} from '../../db/store';
import { logger } from '../../logger';
import { validateBody } from '../middleware/validate';

const log = logger.child({ module: 'TeamReport:RepoConfig' });

export const reportRepoConfigRouter = Router();

reportRepoConfigRouter.get('/', async (req, res, next) => {
  try {
    const component = req.query.component as string | undefined;
    const repos = component
      ? await getReportReposByComponent(component)
      : await getAllReportRepos();
    res.json(repos);
  } catch (err) {
    next(err);
  }
});

reportRepoConfigRouter.post('/', validateBody(CreateReportRepoSchema), async (req, res, next) => {
  try {
    const body = req.body as CreateReportRepo;
    const provider = detectProvider(body.url);
    const created = await createReportRepo({
      component: body.component,
      enabled: body.enabled,
      name: body.name,
      provider,
      url: body.url,
    });
    log.info({ id: created.id, name: created.name, provider }, 'Report repo created');
    res.status(201).json(created);
  } catch (err) {
    next(err);
  }
});

reportRepoConfigRouter.put('/:id', validateBody(UpdateReportRepoSchema), async (req, res, next) => {
  try {
    const id = req.params.id as string;
    const body = req.body as UpdateReportRepo;
    const data: Partial<{
      component: string;
      enabled: boolean;
      name: string;
      provider: string;
      url: string;
    }> = { ...body };
    if (body.url) {
      data.provider = detectProvider(body.url);
    }
    const updated = await updateReportRepo(id, data);
    if (!updated) {
      res.status(404).json({ error: 'Report repo not found' });
      return;
    }
    log.info({ id }, 'Report repo updated');
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

reportRepoConfigRouter.delete('/:id', async (req, res, next) => {
  try {
    const id = req.params.id;
    await deleteReportRepo(id);
    log.info({ id }, 'Report repo deleted');
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});
