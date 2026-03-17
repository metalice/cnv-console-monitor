import axios from 'axios';
import { config } from '../config';
import { logger } from '../logger';
import { DailyReport } from '../analyzer';
import { buildBlocks } from './slack-blocks';
import { withRetry } from '../utils/retry';

const log = logger.child({ module: 'Slack' });
const SLACK_TIMEOUT_MS = 15000;

const postSlack = (url: string, body: Record<string, unknown>): Promise<void> =>
  withRetry(() => axios.post(url, body, { timeout: SLACK_TIMEOUT_MS }), 'slack.post', { maxRetries: 2, baseDelayMs: 2000 }).then(() => {});

export const sendSlackReport = async (report: DailyReport, webhookUrl?: string): Promise<void> => {
  if (!webhookUrl) {
    log.debug('No Slack webhook provided, skipping');
    return;
  }

  try {
    const blocks = buildBlocks(report);
    await postSlack(webhookUrl, {
      text: `Console Dashboard Report — ${report.date}: ${report.failedLaunches} Failed / ${report.passedLaunches} Passed`,
      blocks,
    });
    log.info('Report sent');
  } catch (err) {
    log.error({ err }, 'Failed to send Slack report');
    throw err;
  }
}

export const sendSlackAcknowledgment = async (reviewer: string, notes: string, date: string, webhookUrl?: string): Promise<void> => {
  if (!webhookUrl) return;

  try {
    const dashboardUrl = config.dashboard.url;
    const dashboardLink = dashboardUrl ? ` | <${dashboardUrl}|Dashboard>` : '';
    await postSlack(webhookUrl, {
      text: `:white_check_mark: *${date} report reviewed* by ${reviewer}${notes ? `\nNotes: "${notes}"` : ''}${dashboardLink}`,
    });
  } catch (err) {
    log.error({ err }, 'Failed to send Slack acknowledgment');
    throw err;
  }
}

export const sendSlackReminder = async (webhookUrl?: string): Promise<void> => {
  if (!webhookUrl) return;

  try {
    const dashboardUrl = config.dashboard.url;
    const dashboardLink = dashboardUrl ? `\n<${dashboardUrl}|Open Dashboard to review>` : '';
    await postSlack(webhookUrl, {
      text: `:warning: *Reminder:* Today's console dashboard report has not been acknowledged yet. Please review and acknowledge.${dashboardLink}`,
    });
  } catch (err) {
    log.error({ err }, 'Failed to send Slack reminder');
    throw err;
  }
}

export const sendSlackJiraNotification = async (params: {
  jiraKey: string;
  summary: string;
  testName: string;
  polarionId?: string;
  cnvVersion?: string;
  rpItemUrl: string;
  createdBy: string;
  webhookUrls?: string[];
}): Promise<void> => {
  const urls = params.webhookUrls?.filter(Boolean) ?? [];
  if (config.slack.jiraWebhookUrl) urls.push(config.slack.jiraWebhookUrl);
  if (urls.length === 0) return;

  const jiraUrl = config.jira.url ? `${config.jira.url}/browse/${params.jiraKey}` : params.jiraKey;
  const polarion = params.polarionId ? `\n*Polarion:* ${params.polarionId}` : '';
  const version = params.cnvVersion ? `\n*CNV Version:* ${params.cnvVersion}` : '';

  const text = `:bug: *New Jira Bug Created*\n` +
    `*<${jiraUrl}|${params.jiraKey}>* — ${params.summary}\n` +
    `*Test:* ${params.testName.split('.').pop() || params.testName}${polarion}${version}\n` +
    `*Created by:* ${params.createdBy}\n` +
    `<${params.rpItemUrl}|View in ReportPortal>`;

  for (const url of [...new Set(urls)]) {
    try {
      await postSlack(url, { text });
      log.info({ jiraKey: params.jiraKey }, 'Jira notification sent to Slack');
    } catch (err) {
      log.warn({ err, jiraKey: params.jiraKey }, 'Failed to send Jira Slack notification');
    }
  }
}
