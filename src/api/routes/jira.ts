import { Router, Request, Response } from 'express';
import { config } from '../../config';
import { createIssue, findExistingIssue, getIssueStatus, buildBugDescription, searchIssues } from '../../clients/jira';
import { getTestItemByRpId, updateTestItemJira, addTriageLog, getLaunchByRpId } from '../../db/store';
import { getReportPortalLaunchUrl, getReportPortalItemUrl } from '../../clients/reportportal';

const router = Router();

router.post('/create', async (req: Request, res: Response) => {
  if (!config.jira.enabled) {
    res.status(400).json({ error: 'Jira integration is not configured' });
    return;
  }

  const { testItemId, performedBy } = req.body;

  const item = getTestItemByRpId(testItemId);
  if (!item) {
    res.status(404).json({ error: 'Test item not found' });
    return;
  }

  const launch = getLaunchByRpId(item.launch_rp_id);
  const rpLaunchUrl = getReportPortalLaunchUrl(item.launch_rp_id);
  const rpItemUrl = getReportPortalItemUrl(item.launch_rp_id, item.rp_id);

  const existing = await findExistingIssue(item.name, item.polarion_id || undefined);
  if (existing) {
    updateTestItemJira(item.rp_id, existing.key, existing.fields.status.name);
    res.json({
      success: true,
      existing: true,
      issue: { key: existing.key, status: existing.fields.status.name, summary: existing.fields.summary },
    });
    return;
  }

  try {
    const shortName = item.name.split('.').pop() || item.name;
    const summary = `[Console Test] ${item.polarion_id ? `${item.polarion_id} - ` : ''}${shortName}`;

    const description = buildBugDescription({
      testName: item.name,
      polarionId: item.polarion_id || undefined,
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

    const issue = await createIssue({
      summary,
      description,
      labels,
      rpLaunchUrl,
      rpItemUrl,
    });

    updateTestItemJira(item.rp_id, issue.key, 'Open');

    addTriageLog({
      test_item_rp_id: item.rp_id,
      action: 'create_jira',
      new_value: issue.key,
      performed_by: performedBy,
    });

    res.json({ success: true, existing: false, issue: { key: issue.key, status: 'Open', summary } });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to create Jira issue';
    res.status(502).json({ error: message });
  }
});

router.post('/link', async (req: Request, res: Response) => {
  const { testItemId, jiraKey, performedBy } = req.body;

  if (!testItemId || !jiraKey) {
    res.status(400).json({ error: 'testItemId and jiraKey are required' });
    return;
  }

  const item = getTestItemByRpId(testItemId);
  if (!item) {
    res.status(404).json({ error: 'Test item not found' });
    return;
  }

  try {
    const status = await getIssueStatus(jiraKey);
    updateTestItemJira(item.rp_id, jiraKey, status);

    addTriageLog({
      test_item_rp_id: item.rp_id,
      action: 'link_jira',
      new_value: jiraKey,
      performed_by: performedBy,
    });

    res.json({ success: true, jiraKey, status });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to link Jira issue';
    res.status(502).json({ error: message });
  }
});

router.get('/search', async (req: Request, res: Response) => {
  if (!config.jira.enabled) {
    res.status(400).json({ error: 'Jira integration is not configured' });
    return;
  }

  const query = req.query.q as string;
  if (!query) {
    res.status(400).json({ error: 'q parameter is required' });
    return;
  }

  try {
    const jql = `project = ${config.jira.projectKey} AND text ~ "${query}" ORDER BY updated DESC`;
    const result = await searchIssues(jql, 10);
    res.json(result.issues.map(i => ({
      key: i.key,
      summary: i.fields.summary,
      status: i.fields.status.name,
    })));
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to search Jira';
    res.status(502).json({ error: message });
  }
});

export default router;
