import { config } from '../../config';
import { searchIssues } from '../../clients/jira';
import { getAllSubscriptions, getSetting } from '../../db/store';
import { sendSlackJiraNotification } from '../../notifiers/slack';

export const sanitizeJql = (query: string): string => {
  return query.replace(/["\\\n\r]/g, ' ').replace(/[{}()\[\]]/g, '').substring(0, 200);
}

export const searchJiraIssues = async (query: string) => {
  const sanitized = sanitizeJql(query);
  const jql = `project = ${config.jira.projectKey} AND text ~ "${sanitized}" ORDER BY updated DESC`;
  const result = await searchIssues(jql, 10);
  return result.issues.map(issue => ({
    key: issue.key,
    summary: issue.fields.summary,
    status: issue.fields.status.name,
  }));
}

export const resolveJiraComponent = async (launchComponent: string | null | undefined): Promise<string> => {
  return launchComponent || await getSetting('jira.component') || 'CNV User Interface';
}

export const fireSlackJiraNotification = (opts: {
  jiraKey: string;
  summary: string;
  testName: string;
  polarionId?: string;
  cnvVersion?: string;
  rpItemUrl: string;
  createdBy: string;
  launchComponent?: string | null;
}): void => {
  getAllSubscriptions().then(subs => {
    const webhooks = subs
      .filter(sub => sub.enabled && sub.jiraWebhook)
      .filter(sub => sub.components.length === 0 || (opts.launchComponent && sub.components.includes(opts.launchComponent)))
      .map(sub => sub.jiraWebhook!)
      .filter(Boolean);

    sendSlackJiraNotification({
      jiraKey: opts.jiraKey,
      summary: opts.summary,
      testName: opts.testName,
      polarionId: opts.polarionId,
      cnvVersion: opts.cnvVersion,
      rpItemUrl: opts.rpItemUrl,
      createdBy: opts.createdBy,
      webhookUrls: webhooks,
    });
  }).catch(() => {});
}
