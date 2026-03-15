import { Router, Request, Response, NextFunction } from 'express';
import { JiraCreateRequestSchema, JiraLinkRequestSchema } from '@cnv-monitor/shared';
import { config } from '../../config';
import { createIssue, findExistingIssue, getIssueStatus, buildBugDescription } from '../../clients/jira';
import { getTestItemByRpId, updateTestItemJira, addTriageLog, getLaunchByRpId } from '../../db/store';
import { getReportPortalLaunchUrl, getReportPortalItemUrl } from '../../clients/reportportal';
import { validateBody } from '../middleware/validate';
import { broadcast } from '../../ws';
import { searchJiraIssues, resolveJiraComponent, fireSlackJiraNotification } from './jira-helpers';

const router = Router();

router.post('/create', validateBody(JiraCreateRequestSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!config.jira.enabled) {
      res.status(400).json({ error: 'Jira integration is not configured' });
      return;
    }

    const { testItemId } = req.body;
    const performedBy = req.user?.email || req.body.performedBy || 'unknown';

    const item = await getTestItemByRpId(testItemId);
    if (!item) { res.status(404).json({ error: 'Test item not found' }); return; }

    const launch = await getLaunchByRpId(item.launch_rp_id);
    const rpLaunchUrl = getReportPortalLaunchUrl(item.launch_rp_id);
    const rpItemUrl = getReportPortalItemUrl(item.launch_rp_id, item.rp_id);

    const existing = await findExistingIssue(item.name, item.polarion_id || undefined);
    if (existing) {
      await updateTestItemJira(item.rp_id, existing.key, existing.fields.status.name);
      broadcast('data-updated');
      res.json({ success: true, existing: true, issue: { key: existing.key, status: existing.fields.status.name, summary: existing.fields.summary } });
      return;
    }

    const shortName = item.name.split('.').pop() || item.name;
    const summary = `[Console Test] ${item.polarion_id ? `${item.polarion_id} - ` : ''}${shortName}`;

    const description = buildBugDescription({
      testName: item.name,
      polarionId: item.polarion_id || undefined,
      polarionUrl: config.polarion.url || undefined,
      launchName: launch?.name || 'Unknown',
      cnvVersion: launch?.cnv_version || undefined,
      ocpVersion: launch?.ocp_version || undefined,
      clusterName: launch?.cluster_name || undefined,
      errorMessage: item.error_message || undefined,
      rpLaunchUrl,
      rpItemUrl,
    });

    const labels = ['cnv-console', 'automated-bug'];
    if (launch?.cnv_version) labels.push(`cnv-${launch.cnv_version}`);

    const jiraComponent = await resolveJiraComponent(launch?.component);
    const issue = await createIssue({ summary, description, labels, component: jiraComponent, rpLaunchUrl, rpItemUrl });

    await updateTestItemJira(item.rp_id, issue.key, 'Open');
    await addTriageLog({ test_item_rp_id: item.rp_id, action: 'create_jira', new_value: issue.key, performed_by: performedBy });
    broadcast('data-updated');

    fireSlackJiraNotification({
      jiraKey: issue.key, summary, testName: item.name,
      polarionId: item.polarion_id || undefined,
      cnvVersion: launch?.cnv_version || undefined,
      rpItemUrl, createdBy: performedBy,
      launchComponent: launch?.component,
    });

    res.json({ success: true, existing: false, issue: { key: issue.key, status: 'Open', summary } });
  } catch (err) {
    next(err);
  }
});

router.post('/link', validateBody(JiraLinkRequestSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { testItemId, jiraKey } = req.body;
    const performedBy = req.user?.email || req.body.performedBy || 'unknown';

    const item = await getTestItemByRpId(testItemId);
    if (!item) { res.status(404).json({ error: 'Test item not found' }); return; }

    const status = await getIssueStatus(jiraKey);
    await updateTestItemJira(item.rp_id, jiraKey, status);
    await addTriageLog({ test_item_rp_id: item.rp_id, action: 'link_jira', new_value: jiraKey, performed_by: performedBy });

    broadcast('data-updated');
    res.json({ success: true, jiraKey, status });
  } catch (err) {
    next(err);
  }
});

router.get('/search', async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!config.jira.enabled) {
      res.status(400).json({ error: 'Jira integration is not configured' });
      return;
    }
    const query = req.query.q as string;
    if (!query) { res.status(400).json({ error: 'q parameter is required' }); return; }

    res.json(await searchJiraIssues(query));
  } catch (err) {
    next(err);
  }
});

export default router;
