import axios from 'axios';
import { config } from '../config';
import { DailyReport, LaunchGroup } from '../analyzer';
import { getReportPortalLaunchUrl } from '../clients/reportportal';

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

function buildBlocks(report: DailyReport, dashboardUrl?: string): SlackBlock[] {
  const blocks: SlackBlock[] = [];

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

  const failedGroups = report.groups.filter(g => g.health === 'red');
  if (failedGroups.length > 0) {
    blocks.push({
      type: 'section',
      text: { type: 'mrkdwn', text: ':rotating_light: *Failed Launches*' },
    });

    for (const group of failedGroups) {
      blocks.push(...buildFailedGroupBlocks(group));
    }
  }

  const greenGroups = report.groups.filter(g => g.health === 'green');
  if (greenGroups.length > 0) {
    const greenList = greenGroups.map(g => `${g.tier}-${g.cnvVersion}`).join(', ');
    blocks.push({
      type: 'section',
      text: { type: 'mrkdwn', text: `:white_check_mark: *All Green:* ${greenList}` },
    });
  }

  if (report.newFailures.length > 0) {
    blocks.push({ type: 'divider' } as SlackBlock);
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `:new: *${report.newFailures.length} New Failure(s)* (not seen yesterday)`,
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

  return blocks;
}

function buildFailedGroupBlocks(group: LaunchGroup): SlackBlock[] {
  const blocks: SlackBlock[] = [];
  const rpUrl = getReportPortalLaunchUrl(group.latestLaunch.rp_id);

  let text = `*${group.tier}-${group.cnvVersion}* (${group.passedTests}/${group.totalTests} passed, ${group.failedTests} failed)\n`;

  for (const item of group.failedItems.slice(0, 5)) {
    const polarion = item.polarion_id ? `${item.polarion_id}: ` : '';
    const shortName = item.name.split('.').pop() || item.name;
    const prediction = item.ai_prediction && item.ai_confidence
      ? ` [${item.ai_prediction.replace('Predicted ', '')} ${item.ai_confidence}%]`
      : '';
    const jira = item.jira_key ? ` — ${item.jira_key}` : '';
    text += `  • ${polarion}${shortName}${prediction}${jira}\n`;
  }

  if (group.failedItems.length > 5) {
    text += `  _...and ${group.failedItems.length - 5} more_\n`;
  }

  text += `<${rpUrl}|View in ReportPortal>`;

  blocks.push({
    type: 'section',
    text: { type: 'mrkdwn', text },
  });

  return blocks;
}

export async function sendSlackReport(report: DailyReport, dashboardUrl?: string): Promise<void> {
  if (!config.slack.enabled) {
    console.log('[Slack] Slack not configured, skipping');
    return;
  }

  const blocks = buildBlocks(report, dashboardUrl);

  await axios.post(config.slack.webhookUrl, {
    text: `Console Dashboard Report — ${report.date}: ${report.failedLaunches} Failed / ${report.passedLaunches} Passed`,
    blocks,
  });

  console.log('[Slack] Report sent successfully');
}

export async function sendSlackAcknowledgment(reviewer: string, notes: string, date: string): Promise<void> {
  if (!config.slack.enabled) return;

  await axios.post(config.slack.webhookUrl, {
    text: `:white_check_mark: *${date} report reviewed* by ${reviewer}${notes ? `\nNotes: "${notes}"` : ''}`,
  });
}

export async function sendSlackReminder(): Promise<void> {
  if (!config.slack.enabled) return;

  await axios.post(config.slack.webhookUrl, {
    text: `:warning: *Reminder:* Today's console dashboard report has not been acknowledged yet. Please review and acknowledge.`,
  });
}
