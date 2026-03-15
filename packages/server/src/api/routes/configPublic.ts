import { Router, Request, Response } from 'express';
import { config } from '../../config';

const router = Router();

router.get('/', (_req: Request, res: Response) => {
  const rpBase = `${config.reportportal.url}/ui/#${config.reportportal.project.toLowerCase()}`;
  res.json({
    reportportalUrl: config.reportportal.url,
    reportportalProject: config.reportportal.project,
    jiraEnabled: config.jira.enabled,
    jiraUrl: config.jira.url || undefined,
    jiraProjectKey: config.jira.projectKey || undefined,
    polarionUrl: config.polarion.url || undefined,
    rpLaunchBaseUrl: `${rpBase}/launches/all`,
    rpItemBaseUrl: `${rpBase}/launches/all`,
  });
});

export default router;
