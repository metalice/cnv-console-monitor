import { type NextFunction, type Request, type Response, Router } from 'express';

import { buildDailyReport } from '../../analyzer';
import { config } from '../../config';
import { buildHtml } from '../../notifiers/email-template';
import { buildBlocks } from '../../notifiers/slack-blocks';

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
