import { Router, Request, Response, NextFunction } from 'express';
import { config } from '../../config';
import { buildDailyReport } from '../../analyzer';
import { buildBlocks } from '../../notifiers/slack-blocks';
import { buildHtml } from '../../notifiers/email-template';

const router = Router();

router.get('/status', (_req: Request, res: Response) => {
  res.json({
    email: {
      enabled: config.email.enabled,
      host: config.email.host || null,
      from: config.email.from,
    },
    slack: {
      jiraWebhookConfigured: !!config.slack.jiraWebhookUrl,
    },
  });
});

router.get('/preview/:format', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const format = req.params.format as string;
    const report = await buildDailyReport(24);

    if (format === 'slack') {
      const blocks = buildBlocks(report);
      res.json({ blocks, text: `Preview — ${report.date}: ${report.failedLaunches} Failed / ${report.passedLaunches} Passed` });
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
