import { Router, Request, Response } from 'express';
import { config } from '../../config';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  const rpBase = `${config.reportportal.url}/ui/#${config.reportportal.project.toLowerCase()}`;
  const userEmail = req.user?.email;

  let slackEnabled = !!config.slack.jiraWebhookUrl;
  let emailEnabled = config.email.enabled;
  try {
    const { getAllSubscriptions } = await import('../../db/store');
    const subs = await getAllSubscriptions();
    const userSubs = userEmail ? subs.filter(s => s.createdBy === userEmail) : [];
    if (!slackEnabled) slackEnabled = userSubs.some(s => !!s.slackWebhook);
    if (!emailEnabled) emailEnabled = userSubs.some(s => s.emailRecipients && s.emailRecipients.length > 0);
  } catch { /* ignore */ }

  res.json({
    reportportalUrl: config.reportportal.url,
    reportportalProject: config.reportportal.project,
    jiraEnabled: config.jira.enabled,
    jiraUrl: config.jira.url || undefined,
    jiraProjectKey: config.jira.projectKey || undefined,
    polarionUrl: config.polarion.url || undefined,
    rpLaunchBaseUrl: `${rpBase}/launches/all`,
    rpItemBaseUrl: `${rpBase}/launches/all`,
    emailEnabled,
    slackEnabled,
  });
});

export default router;
