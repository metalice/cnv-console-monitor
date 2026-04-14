import { Router } from 'express';

import { getWeekId, UpdateReportRequestSchema } from '@cnv-monitor/shared';

import { entityToWeeklyReport } from '../../db/mappers/weeklyReport';
import {
  getCurrentWeeklyReport,
  getWeeklyReport,
  listWeeklyReports,
  updatePersonReportNotes,
  updateWeeklyReportNotes,
  updateWeeklyReportState,
} from '../../db/store';
import { logger } from '../../logger';
import { validateBody } from '../middleware/validate';

const log = logger.child({ module: 'WeeklyReport:Routes' });

export const weeklyReportsRouter = Router();

weeklyReportsRouter.get('/', async (req, res, next) => {
  try {
    const component = req.query.component as string | undefined;
    const reports = await listWeeklyReports(component);
    res.json(reports.map(entityToWeeklyReport));
  } catch (err) {
    next(err);
  }
});

weeklyReportsRouter.get('/current', async (req, res, next) => {
  try {
    const weekId = getWeekId();
    const component = req.query.component as string | undefined;
    const report = await getCurrentWeeklyReport(weekId, component);
    if (!report) {
      res.json(null);
      return;
    }
    res.json(entityToWeeklyReport(report));
  } catch (err) {
    next(err);
  }
});

weeklyReportsRouter.get('/:weekId', async (req, res, next) => {
  try {
    const report = await getWeeklyReport(req.params.weekId);
    if (!report) {
      res.status(404).json({ error: 'Report not found' });
      return;
    }
    res.json(entityToWeeklyReport(report));
  } catch (err) {
    next(err);
  }
});

weeklyReportsRouter.put(
  '/:weekId',
  validateBody(UpdateReportRequestSchema),
  async (req, res, next) => {
    try {
      const weekId = req.params.weekId as string;
      const { managerHighlights, personUpdates, taskSummary } = req.body;

      await updateWeeklyReportNotes(weekId, managerHighlights, taskSummary);

      if (personUpdates) {
        for (const update of personUpdates) {
          await updatePersonReportNotes(weekId, update.memberId, {
            excluded: update.excluded,
            managerNotes: update.managerNotes,
            sortOrder: update.sortOrder,
          });
        }
      }

      const updated = await getWeeklyReport(weekId);
      if (!updated) {
        res.status(404).json({ error: 'Report not found' });
        return;
      }
      res.json(entityToWeeklyReport(updated));
    } catch (err) {
      next(err);
    }
  },
);

weeklyReportsRouter.post('/:weekId/finalize', async (req, res, next) => {
  try {
    const weekId = req.params.weekId;
    await updateWeeklyReportState(weekId, 'FINALIZED');
    log.info({ weekId }, 'Weekly report finalized');
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

weeklyReportsRouter.post('/:weekId/send', async (req, res, next) => {
  try {
    const weekId = req.params.weekId;
    const report = await getWeeklyReport(weekId);
    if (!report) {
      res.status(404).json({ error: 'Report not found' });
      return;
    }

    const { distributeWeeklyReport } = await import('../../notifiers/sendWeeklyReport');
    await distributeWeeklyReport(entityToWeeklyReport(report));
    await updateWeeklyReportState(weekId, 'SENT');
    log.info({ weekId }, 'Weekly report sent');
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

weeklyReportsRouter.post('/:weekId/ai-enhance', async (req, res, next) => {
  try {
    const weekId = req.params.weekId;
    const { generateWeeklyReport } = await import('../../weekly/aggregator');
    const component = req.query.component as string | undefined;
    await generateWeeklyReport({ component });

    const report = await getWeeklyReport(weekId);
    if (!report) {
      res.status(404).json({ error: 'Report not found' });
      return;
    }
    res.json(entityToWeeklyReport(report));
  } catch (err) {
    next(err);
  }
});
