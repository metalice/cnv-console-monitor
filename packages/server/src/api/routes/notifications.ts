import { Router, Request, Response, NextFunction } from 'express';
import { buildDailyReport } from '../../analyzer';
import { sendEmailReport } from '../../notifiers/email';
import { sendSlackReport } from '../../notifiers/slack';
import { config } from '../../config';

const router = Router();

router.post('/test-email', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    if (!config.email.enabled) {
      res.status(400).json({ error: 'Email not configured. Set SMTP_HOST in .env to enable.' });
      return;
    }
    if (config.email.recipients.length === 0) {
      res.status(400).json({ error: 'No email recipients configured. Set EMAIL_RECIPIENTS in .env.' });
      return;
    }

    const report = await buildDailyReport(24);
    await sendEmailReport(report);

    res.json({
      success: true,
      message: `Test email sent to ${config.email.recipients.join(', ')}`,
      from: config.email.from,
      host: config.email.host,
      port: config.email.port,
    });
  } catch (err) {
    next(err);
  }
});

router.post('/test-slack', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    if (!process.env.SLACK_WEBHOOK_URL) {
      res.status(400).json({ error: 'Slack not configured. Set SLACK_WEBHOOK_URL in .env to enable.' });
      return;
    }

    const report = await buildDailyReport(24);
    await sendSlackReport(report);

    res.json({ success: true, message: 'Test Slack notification sent' });
  } catch (err) {
    next(err);
  }
});

router.get('/status', (_req: Request, res: Response) => {
  res.json({
    email: {
      enabled: config.email.enabled,
      host: config.email.host || null,
      port: config.email.port,
      from: config.email.from,
      recipients: config.email.recipients,
      authConfigured: !!config.email.user,
    },
    slack: {
      enabled: !!process.env.SLACK_WEBHOOK_URL,
    },
  });
});

export default router;
