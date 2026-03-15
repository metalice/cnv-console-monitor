import axios from 'axios';
import { config } from '../config';
import { logger } from '../logger';
import { DailyReport, LaunchGroup, EnrichedFailedItem } from '../analyzer';

const log = logger.child({ module: 'Slack' });

interface SlackBlock {
  type: string;
  text?: { type: string; text: string; emoji?: boolean };
  elements?: Array<{ type: string; text?: { type: string; text: string }; url?: string; action_id?: string }>;
  fields?: Array<{ type: string; text: string }>;
}

function healthEmoji(health: string): string {
  switch (health) {
    case 'green': return ':large_green_circle:';
    case 'yellow': return ':large_yellow_circle:';
    case 'red': return ':red_circle:';
    default: return ':white_circle:';
  }
}

function streakBar(statuses: string[]): string {
  return '[' + statuses.map(s => s === 'FAILED' ? 'X' : s === 'PASSED' ? '-' : '?').join('') + ']';
}

function formatLastPass(lastPassDate: string | null, lastPassTime: number | null): string {
  if (!lastPassDate || !lastPassTime) return 'Never passed';
  const d = new Date(lastPassTime);
  const month = d.toLocaleString('en-US', { month: 'short' });
  const day = d.getDate();
  const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return `Last passed: ${month} ${day} ${time}`;
}

function buildBlocks(report: DailyReport): SlackBlock[] {
  const blocks: SlackBlock[] = [];
  const dashboardUrl = config.dashboard.url;

  blocks.push({
    type: 'header',
    text: { type: 'plain_text', text: `Console Dashboard Report — ${report.date}`, emoji: true },
  });

  const statusLine = `${healthEmoji(report.overallHealth)} *Overall:* ${report.failedLaunches} Failed / ${report.passedLaunches} Passed` +
    (report.inProgressLaunches > 0 ? ` / ${report.inProgressLaunches} In Progress` : '');

  blocks.push({
    type: 'section',
    text: { type: 'mrkdwn', text: statusLine },
  });

  blocks.push({ type: 'divider' } as SlackBlock);

  const groupsByComponent = new Map<string, LaunchGroup[]>();
  for (const group of report.groups) {
    const comp = group.component || 'Other';
    if (!groupsByComponent.has(comp)) groupsByComponent.set(comp, []);
    groupsByComponent.get(comp)!.push(group);
  }

  for (const [component, groups] of [...groupsByComponent.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    const failedGroups = groups.filter(g => g.health === 'red');
    const greenGroups = groups.filter(g => g.health === 'green');
    if (failedGroups.length === 0 && greenGroups.length === 0) continue;

    blocks.push({
      type: 'section',
      text: { type: 'mrkdwn', text: `*${component}*` },
    });

    if (failedGroups.length > 0) {
      for (const group of failedGroups) {
        blocks.push(...buildFailedGroupBlocks(group));
      }
    }

    if (greenGroups.length > 0) {
      const greenList = greenGroups.map(g => `${g.tier}-${g.cnvVersion}`).join(', ');
      blocks.push({
        type: 'section',
        text: { type: 'mrkdwn', text: `:white_check_mark: All Green: ${greenList}` },
      });
    }

    blocks.push({ type: 'divider' } as SlackBlock);
  }

  if (report.newFailures.length > 0) {
    blocks.push({ type: 'divider' } as SlackBlock);
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `:new: *${report.newFailures.length} New Failure(s)* (not seen in previous window)`,
      },
    });
  }

  const actionElements: SlackBlock['elements'] = [];
  if (dashboardUrl) {
    actionElements.push({
      type: 'button',
      text: { type: 'plain_text', text: 'Open Dashboard' },
      url: dashboardUrl,
      action_id: 'open_dashboard',
    });
  }

  if (actionElements.length > 0) {
    blocks.push({ type: 'actions', elements: actionElements });
  }

  if (blocks.length > 48) {
    const truncated = blocks.slice(0, 47);
    truncated.push({
      type: 'section',
      text: { type: 'mrkdwn', text: `_...and more. View full report in the dashboard._` },
    });
    return truncated;
  }

  return blocks;
}

function buildFailedGroupBlocks(group: LaunchGroup): SlackBlock[] {
  const blocks: SlackBlock[] = [];
  const dashboardUrl = config.dashboard.url;
  const items = group.enrichedFailedItems.length > 0 ? group.enrichedFailedItems : group.failedItems;

  let text = `*${group.tier}-${group.cnvVersion}* (${group.passedTests}/${group.totalTests} passed, ${group.failedTests} failed)\n`;

  for (const item of items.slice(0, 10)) {
    const enriched = item as EnrichedFailedItem;
    const polarion = item.polarion_id ? `${item.polarion_id}: ` : '';
    const shortName = item.name.split('.').pop() || item.name;
    const jira = item.jira_key ? ` | ${item.jira_key}` : '';

    if (enriched.recentStatuses) {
      const bar = streakBar(enriched.recentStatuses);
      const failInfo = `Failing ${enriched.consecutiveFailures}/${enriched.totalRuns}`;
      const lastPass = formatLastPass(enriched.lastPassDate, enriched.lastPassTime);
      text += `  • ${polarion}${shortName}\n    \`${bar}\` ${failInfo} | ${lastPass}${jira}\n`;
    } else {
      text += `  • ${polarion}${shortName}${jira}\n`;
    }
  }

  if (items.length > 10) {
    text += `  _...and ${items.length - 10} more_\n`;
  }

  if (dashboardUrl) {
    text += `<${dashboardUrl}/launch/${group.latestLaunch.rp_id}|View in Dashboard>`;
  }

  blocks.push({
    type: 'section',
    text: { type: 'mrkdwn', text },
  });

  return blocks;
}

export async function sendSlackReport(report: DailyReport, webhookUrl?: string): Promise<void> {
  if (!webhookUrl) {
    log.debug('No Slack webhook provided, skipping');
    return;
  }

  try {
    const blocks = buildBlocks(report);

    await axios.post(webhookUrl, {
      text: `Console Dashboard Report — ${report.date}: ${report.failedLaunches} Failed / ${report.passedLaunches} Passed`,
      blocks,
    });

    log.info('Report sent');
  } catch (err) {
    log.error({ err }, 'Failed to send Slack report');
    throw err;
  }
}

export async function sendSlackAcknowledgment(reviewer: string, notes: string, date: string, webhookUrl?: string): Promise<void> {
  if (!webhookUrl) return;

  try {
    const dashboardUrl = config.dashboard.url;
    const dashboardLink = dashboardUrl ? ` | <${dashboardUrl}|Dashboard>` : '';

    await axios.post(webhookUrl, {
      text: `:white_check_mark: *${date} report reviewed* by ${reviewer}${notes ? `\nNotes: "${notes}"` : ''}${dashboardLink}`,
    });
  } catch (err) {
    log.error({ err }, 'Failed to send Slack acknowledgment');
    throw err;
  }
}

export async function sendSlackReminder(webhookUrl?: string): Promise<void> {
  if (!webhookUrl) return;

  try {
    const dashboardUrl = config.dashboard.url;
    const dashboardLink = dashboardUrl ? `\n<${dashboardUrl}|Open Dashboard to review>` : '';

    await axios.post(webhookUrl, {
      text: `:warning: *Reminder:* Today's console dashboard report has not been acknowledged yet. Please review and acknowledge.${dashboardLink}`,
    });
  } catch (err) {
    log.error({ err }, 'Failed to send Slack reminder');
    throw err;
  }
}

export async function sendSlackJiraNotification(params: {
  jiraKey: string;
  summary: string;
  testName: string;
  polarionId?: string;
  cnvVersion?: string;
  rpItemUrl: string;
  createdBy: string;
  webhookUrls?: string[];
}): Promise<void> {
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
      await axios.post(url, { text });
      log.info({ jiraKey: params.jiraKey }, 'Jira notification sent to Slack');
    } catch (err) {
      log.warn({ err, jiraKey: params.jiraKey }, 'Failed to send Jira Slack notification');
    }
  }
}
