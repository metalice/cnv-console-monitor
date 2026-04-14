import { Router } from 'express';

import {
  CreateWeeklyRepoSchema,
  detectProvider,
  UpdateWeeklyRepoSchema,
} from '@cnv-monitor/shared';

import {
  createWeeklyRepo,
  deleteWeeklyRepo,
  getAllWeeklyRepos,
  getWeeklyReposByComponent,
  updateWeeklyRepo,
} from '../../db/store';
import { logger } from '../../logger';
import { validateBody } from '../middleware/validate';

const log = logger.child({ module: 'WeeklyReport:RepoConfig' });

export const weeklyRepoConfigRouter = Router();

weeklyRepoConfigRouter.get('/', async (req, res, next) => {
  try {
    const component = req.query.component as string | undefined;
    const repos = component
      ? await getWeeklyReposByComponent(component)
      : await getAllWeeklyRepos();
    res.json(repos);
  } catch (err) {
    next(err);
  }
});

weeklyRepoConfigRouter.post('/', validateBody(CreateWeeklyRepoSchema), async (req, res, next) => {
  try {
    const { component, enabled, name, url } = req.body;
    const provider = detectProvider(url);
    const created = await createWeeklyRepo({ component, enabled, name, provider, url });
    log.info({ id: created.id, name: created.name, provider }, 'Weekly repo created');
    res.status(201).json(created);
  } catch (err) {
    next(err);
  }
});

weeklyRepoConfigRouter.put('/:id', validateBody(UpdateWeeklyRepoSchema), async (req, res, next) => {
  try {
    const id = req.params.id as string;
    const data = { ...req.body };
    if (data.url) {
      data.provider = detectProvider(data.url);
    }
    const updated = await updateWeeklyRepo(id, data);
    if (!updated) {
      res.status(404).json({ error: 'Weekly repo not found' });
      return;
    }
    log.info({ id }, 'Weekly repo updated');
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

weeklyRepoConfigRouter.delete('/:id', async (req, res, next) => {
  try {
    const id = req.params.id;
    await deleteWeeklyRepo(id);
    log.info({ id }, 'Weekly repo deleted');
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});
