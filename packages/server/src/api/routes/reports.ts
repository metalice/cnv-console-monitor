import { Router } from 'express';

import {
  getWeekId,
  type UpdateReportRequest,
  UpdateReportRequestSchema,
} from '@cnv-monitor/shared';

import { entityToReport } from '../../db/mappers/report';
import {
  deleteReport,
  getCurrentReport,
  getReport,
  listReports,
  updatePersonReportNotes,
  updateReportNotes,
  updateReportState,
} from '../../db/store';
import { logger } from '../../logger';
import { validateBody } from '../middleware/validate';

const log = logger.child({ module: 'TeamReport:Routes' });

export const reportsRouter = Router();

reportsRouter.get('/', async (req, res, next) => {
  try {
    const component = req.query.component as string | undefined;
    const reports = await listReports(component);
    res.json(reports.map(entityToReport));
  } catch (err) {
    next(err);
  }
});

reportsRouter.get('/current', async (req, res, next) => {
  try {
    const weekId = getWeekId();
    const component = req.query.component as string | undefined;
    const report = await getCurrentReport(weekId, component);
    if (!report) {
      res.json(null);
      return;
    }
    res.json(entityToReport(report));
  } catch (err) {
    next(err);
  }
});

reportsRouter.get('/:weekId', async (req, res, next) => {
  try {
    const component = req.query.component as string | undefined;
    const report = await getReport(req.params.weekId, component);
    if (!report) {
      res.status(404).json({ error: 'Report not found' });
      return;
    }
    res.json(entityToReport(report));
  } catch (err) {
    next(err);
  }
});

reportsRouter.put('/:weekId', validateBody(UpdateReportRequestSchema), async (req, res, next) => {
  try {
    const weekId = req.params.weekId as string;
    const component = (req.query.component as string) || '';
    const body = req.body as UpdateReportRequest;

    await updateReportNotes(weekId, component, body.managerHighlights, body.taskSummary);

    if (body.personUpdates) {
      await Promise.all(
        body.personUpdates.map(update =>
          updatePersonReportNotes(weekId, update.memberId, {
            excluded: update.excluded,
            managerNotes: update.managerNotes,
            sortOrder: update.sortOrder,
          }),
        ),
      );
    }

    const updated = await getReport(weekId, component || undefined);
    if (!updated) {
      res.status(404).json({ error: 'Report not found' });
      return;
    }
    res.json(entityToReport(updated));
  } catch (err) {
    next(err);
  }
});

reportsRouter.post('/:weekId/finalize', async (req, res, next) => {
  try {
    const weekId = req.params.weekId;
    const component = req.query.component as string | undefined;
    await updateReportState(weekId, 'FINALIZED', component);
    log.info({ component, weekId }, 'Team report finalized');
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

reportsRouter.post('/:weekId/send', async (req, res, next) => {
  try {
    const weekId = req.params.weekId;
    const component = req.query.component as string | undefined;
    const report = await getReport(weekId, component);
    if (!report) {
      res.status(404).json({ error: 'Report not found' });
      return;
    }

    const { distributeReport } = await import('../../notifiers/sendReport');
    await distributeReport(entityToReport(report));
    await updateReportState(weekId, 'SENT', component);
    log.info({ component, weekId }, 'Team report sent');
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

reportsRouter.delete('/:id', async (req, res, next) => {
  try {
    const deleted = await deleteReport(req.params.id);
    if (!deleted) {
      res.status(404).json({ error: 'Report not found' });
      return;
    }
    log.info({ id: req.params.id }, 'Team report deleted');
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

reportsRouter.post('/:weekId/ai-enhance', async (req, res, next) => {
  try {
    const weekId = req.params.weekId;
    const { generateReport } = await import('../../report/aggregator');
    const component = req.query.component as string | undefined;
    await generateReport({ component });

    const report = await getReport(weekId, component);
    if (!report) {
      res.status(404).json({ error: 'Report not found' });
      return;
    }
    res.json(entityToReport(report));
  } catch (err) {
    next(err);
  }
});
