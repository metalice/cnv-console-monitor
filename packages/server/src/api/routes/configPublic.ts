import { Router, Request, Response } from 'express';
import { config } from '../../config';

const router = Router();

router.get('/', (_req: Request, res: Response) => {
  res.json({
    reportportalUrl: config.reportportal.url,
    reportportalProject: config.reportportal.project,
    launchFilter: config.dashboard.launchFilter,
    jiraEnabled: config.jira.enabled,
    jiraUrl: config.jira.url || undefined,
    jiraProjectKey: config.jira.projectKey || undefined,
  });
});

export default router;
