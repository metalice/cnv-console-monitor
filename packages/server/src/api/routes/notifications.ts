import { Router, Request, Response } from 'express';
import { config } from '../../config';

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

export default router;
