import { searchIssues } from '../../clients/jira';
import { config } from '../../config';
import { getAllSubscriptions, getSetting } from '../../db/store';
import { sendSlackJiraNotification } from '../../notifiers/slack';

const sanitizeJql = (query: string): string =>
  query
    .replace(/["\\\n\r]/g, ' ')
    .replace(/[{}()[\]]/g, '')
    .substring(0, 200);

export const searchJiraIssues = async (query: string) => {
  const sanitized = sanitizeJql(query);
  const jql = `project = ${config.jira.projectKey} AND text ~ "${sanitized}" ORDER BY updated DESC`;
  const result = await searchIssues(jql, 10);
  return result.issues.map(issue => ({
    key: issue.key,
    status: issue.fields.status.name,
    summary: issue.fields.summary,
  }));
};

export const resolveJiraComponent = async (
  launchComponent: string | null | undefined,
): Promise<string> =>
  launchComponent || (await getSetting('jira.component')) || 'CNV User Interface';

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
  void getAllSubscriptions()
    .then(subs => {
      const webhooks = subs
        .filter(sub => sub.enabled && sub.jiraWebhook)
        .filter(
          sub =>
            sub.components.length === 0 ||
            (opts.launchComponent && sub.components.includes(opts.launchComponent)),
        )
        .map(sub => sub.jiraWebhook)
        .filter((url): url is string => Boolean(url));

      void sendSlackJiraNotification({
        cnvVersion: opts.cnvVersion,
        createdBy: opts.createdBy,
        jiraKey: opts.jiraKey,
        polarionId: opts.polarionId,
        rpItemUrl: opts.rpItemUrl,
        summary: opts.summary,
        testName: opts.testName,
        webhookUrls: webhooks,
      });
      return undefined;
    })
    .catch(() => {
      // no-op
    });
};
