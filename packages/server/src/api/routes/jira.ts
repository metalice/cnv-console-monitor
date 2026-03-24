import { type NextFunction, type Request, type Response, Router } from 'express';

import {
  type JiraCreateRequest,
  JiraCreateRequestSchema,
  type JiraLinkRequest,
  JiraLinkRequestSchema,
} from '@cnv-monitor/shared';

import {
  buildBugDescription,
  createIssue,
  findExistingIssue,
  getIssueStatus,
} from '../../clients/jira';
import { getReportPortalItemUrl, getReportPortalLaunchUrl } from '../../clients/reportportal';
import { config } from '../../config';
import {
  addTriageLog,
  getLaunchByRpId,
  getTestItemByRpId,
  updateTestItemJira,
} from '../../db/store';
import { broadcast } from '../../ws';
import { requireAdmin } from '../middleware/auth';
import { validateBody } from '../middleware/validate';

import { fireSlackJiraNotification, resolveJiraComponent, searchJiraIssues } from './jira-helpers';

const router = Router();

router.post(
  '/create',
  requireAdmin,
  validateBody(JiraCreateRequestSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!config.jira.enabled) {
        res.status(400).json({ error: 'Jira integration is not configured' });
        return;
      }

      const { testItemId } = req.body as JiraCreateRequest;
      const performedBy = req.user?.email || 'unknown';

      const item = await getTestItemByRpId(testItemId);
      if (!item) {
        res.status(404).json({ error: 'Test item not found' });
        return;
      }

      const launch = await getLaunchByRpId(item.launch_rp_id);
      const rpLaunchUrl = getReportPortalLaunchUrl(item.launch_rp_id);
      const rpItemUrl = getReportPortalItemUrl(item.launch_rp_id, item.rp_id);

      const existing = await findExistingIssue(item.name, item.polarion_id || undefined);
      if (existing) {
        await updateTestItemJira(item.rp_id, existing.key, existing.fields.status.name);
        broadcast('data-updated');
        res.json({
          existing: true,
          issue: {
            key: existing.key,
            status: existing.fields.status.name,
            summary: existing.fields.summary,
          },
          success: true,
        });
        return;
      }

      const shortName = item.name.split('.').pop() || item.name;
      const summary = `[Console Test] ${item.polarion_id ? `${item.polarion_id} - ` : ''}${shortName}`;

      const description = buildBugDescription({
        clusterName: launch?.cluster_name || undefined,
        cnvVersion: launch?.cnv_version || undefined,
        errorMessage: item.error_message || undefined,
        launchName: launch?.name || 'Unknown',
        ocpVersion: launch?.ocp_version || undefined,
        polarionId: item.polarion_id || undefined,
        polarionUrl: config.polarion.url || undefined,
        rpItemUrl,
        rpLaunchUrl,
        testName: item.name,
      });

      const labels = ['cnv-console', 'automated-bug'];
      if (launch?.cnv_version) {
        labels.push(`cnv-${launch.cnv_version}`);
      }

      const jiraComponent = await resolveJiraComponent(launch?.component);
      const issue = await createIssue({
        component: jiraComponent,
        description,
        labels,
        rpItemUrl,
        rpLaunchUrl,
        summary,
      });

      await updateTestItemJira(item.rp_id, issue.key, 'Open');
      await addTriageLog({
        action: 'create_jira',
        new_value: issue.key,
        performed_by: performedBy,
        test_item_rp_id: item.rp_id,
      });
      broadcast('data-updated');

      fireSlackJiraNotification({
        cnvVersion: launch?.cnv_version || undefined,
        createdBy: performedBy,
        jiraKey: issue.key,
        launchComponent: launch?.component,
        polarionId: item.polarion_id || undefined,
        rpItemUrl,
        summary,
        testName: item.name,
      });

      res.json({
        existing: false,
        issue: { key: issue.key, status: 'Open', summary },
        success: true,
      });
    } catch (err) {
      next(err);
    }
  },
);

router.post(
  '/link',
  requireAdmin,
  validateBody(JiraLinkRequestSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = req.body as JiraLinkRequest;
      const { jiraKey, testItemId } = body;
      const performedBy = req.user?.email || 'unknown';

      const item = await getTestItemByRpId(testItemId);
      if (!item) {
        res.status(404).json({ error: 'Test item not found' });
        return;
      }

      const status = await getIssueStatus(jiraKey);
      await updateTestItemJira(item.rp_id, jiraKey, status);
      await addTriageLog({
        action: 'link_jira',
        new_value: jiraKey,
        performed_by: performedBy,
        test_item_rp_id: item.rp_id,
      });

      broadcast('data-updated');
      res.json({ jiraKey, status, success: true });
    } catch (err) {
      next(err);
    }
  },
);

router.get('/search', async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!config.jira.enabled) {
      res.status(400).json({ error: 'Jira integration is not configured' });
      return;
    }
    const query = req.query.q as string;
    if (!query) {
      res.status(400).json({ error: 'q parameter is required' });
      return;
    }

    res.json(await searchJiraIssues(query));
  } catch (err) {
    next(err);
  }
});

export default router;
