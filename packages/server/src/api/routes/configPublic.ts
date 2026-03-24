import { type Request, type Response, Router } from 'express';

import { config } from '../../config';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  const rpBase = `${config.reportportal.url}/ui/#${config.reportportal.project.toLowerCase()}`;
  const userEmail = req.user?.email;

  let slackEnabled = Boolean(config.slack.jiraWebhookUrl);
  let emailEnabled = config.email.enabled;
  try {
    const { getAllSubscriptions } = await import('../../db/store');
    const subs = await getAllSubscriptions();
    const userSubs = userEmail ? subs.filter(s => s.createdBy === userEmail) : [];
    if (!slackEnabled) {
      slackEnabled = userSubs.some(s => Boolean(s.slackWebhook));
    }
    if (!emailEnabled) {
      emailEnabled = userSubs.some(s => s.emailRecipients && s.emailRecipients.length > 0);
    }
  } catch {
    /* Ignore */
  }

  res.json({
    emailEnabled,
    jiraEnabled: config.jira.enabled,
    jiraProjectKey: config.jira.projectKey || undefined,
    jiraUrl: config.jira.url || undefined,
    polarionUrl: config.polarion.url || undefined,
    reportportalProject: config.reportportal.project,
    reportportalUrl: config.reportportal.url,
    rpItemBaseUrl: `${rpBase}/launches/all`,
    rpLaunchBaseUrl: `${rpBase}/launches/all`,
    slackEnabled,
  });
});

export default router;
