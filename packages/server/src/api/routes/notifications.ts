import { type NextFunction, type Request, type Response, Router } from 'express';

import { getWeekId } from '@cnv-monitor/shared';

import { buildDailyReport } from '../../analyzer';
import { config } from '../../config';
import { entityToWeeklyReport } from '../../db/mappers/weeklyReport';
import { getCurrentWeeklyReport } from '../../db/store';
import { buildHtml } from '../../notifiers/email-template';
import { buildBlocks } from '../../notifiers/slack-blocks';
import { buildWeeklyEmailHtml } from '../../notifiers/weeklyEmail';
import { buildWeeklySlackBlocks } from '../../notifiers/weeklySlack';

const router = Router();

router.get('/status', (_req: Request, res: Response) => {
  res.json({
    email: {
      enabled: config.email.enabled,
      from: config.email.from,
      host: config.email.host || null,
    },
    slack: {
      jiraWebhookConfigured: Boolean(config.slack.jiraWebhookUrl),
    },
  });
});

router.get('/preview/weekly-slack', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const weekId = getWeekId();
    const entity = await getCurrentWeeklyReport(weekId);
    if (!entity) {
      res.status(404).json({
        error: 'No team report found. Generate one first from the Team Report page.',
      });
      return;
    }
    const report = entityToWeeklyReport(entity);
    const blocks = buildWeeklySlackBlocks(report);
    res.json({ blocks, text: `Team Report Preview — ${report.weekStart} to ${report.weekEnd}` });
  } catch (err) {
    next(err);
  }
});

router.get('/preview/weekly-email', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const weekId = getWeekId();
    const entity = await getCurrentWeeklyReport(weekId);
    if (!entity) {
      res
        .status(404)
        .type('html')
        .send(
          '<html><body><h2>No team report found</h2><p>Generate one first from the Team Report page.</p></body></html>',
        );
      return;
    }
    const report = entityToWeeklyReport(entity);
    const html = buildWeeklyEmailHtml(report);
    res.type('html').send(html);
  } catch (err) {
    next(err);
  }
});

router.get('/preview/:format', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const format = req.params.format as string;
    const report = await buildDailyReport(24);

    if (format === 'slack') {
      const blocks = buildBlocks(report);
      res.json({
        blocks,
        text: `Preview — ${report.date}: ${report.failedLaunches} Failed / ${report.passedLaunches} Passed`,
      });
    } else if (format === 'email') {
      const html = buildHtml(report);
      res.type('html').send(html);
    } else {
      res.status(400).json({ error: 'Format must be "slack" or "email"' });
    }
  } catch (err) {
    next(err);
  }
});

export default router;
