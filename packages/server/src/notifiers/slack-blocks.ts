import { config } from '../config';
import { DailyReport, LaunchGroup, EnrichedFailedItem } from '../analyzer';

export interface SlackBlock {
  type: string;
  text?: { type: string; text: string; emoji?: boolean };
  elements?: Array<{ type: string; text?: { type: string; text: string }; url?: string; action_id?: string }>;
  fields?: Array<{ type: string; text: string }>;
}

const healthEmoji = (health: string): string => {
  switch (health) {
    case 'green': return ':large_green_circle:';
    case 'yellow': return ':large_yellow_circle:';
    case 'red': return ':red_circle:';
    default: return ':white_circle:';
  }
}

const streakBar = (statuses: string[]): string => {
  return '[' + statuses.map(status => status === 'FAILED' ? 'X' : status === 'PASSED' ? '-' : '?').join('') + ']';
}

const formatLastPass = (lastPassDate: string | null, lastPassTime: number | null): string => {
  if (!lastPassDate || !lastPassTime) return 'Never passed';
  const dateObj = new Date(lastPassTime);
  const month = dateObj.toLocaleString('en-US', { month: 'short' });
  return `Last passed: ${month} ${dateObj.getDate()} ${dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
}

const mkSection = (text: string): SlackBlock => {
  return { type: 'section', text: { type: 'mrkdwn', text } };
}

const buildFailedGroupBlocks = (group: LaunchGroup): SlackBlock[] => {
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
  if (items.length > 10) text += `  _...and ${items.length - 10} more_\n`;
  if (dashboardUrl) text += `<${dashboardUrl}/launch/${group.latestLaunch.rp_id}|View in Dashboard>`;
  return [mkSection(text)];
}

export const buildBlocks = (report: DailyReport): SlackBlock[] => {
  const blocks: SlackBlock[] = [];
  const dashboardUrl = config.dashboard.url;

  blocks.push({
    type: 'header',
    text: { type: 'plain_text', text: `Console Dashboard Report — ${report.date}`, emoji: true },
  });
  const statusLine = `${healthEmoji(report.overallHealth)} *Overall:* ${report.failedLaunches} Failed / ${report.passedLaunches} Passed` +
    (report.inProgressLaunches > 0 ? ` / ${report.inProgressLaunches} In Progress` : '');
  blocks.push(mkSection(statusLine));
  blocks.push({ type: 'divider' } as SlackBlock);

  const groupsByComponent = new Map<string, LaunchGroup[]>();
  for (const group of report.groups) {
    const component = group.component || 'Other';
    if (!groupsByComponent.has(component)) groupsByComponent.set(component, []);
    groupsByComponent.get(component)!.push(group);
  }

  for (const [component, groups] of [...groupsByComponent.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    const failedGroups = groups.filter(group => group.health === 'red');
    const greenGroups = groups.filter(group => group.health === 'green');
    if (failedGroups.length === 0 && greenGroups.length === 0) continue;

    blocks.push(mkSection(`*${component}*`));
    for (const group of failedGroups) blocks.push(...buildFailedGroupBlocks(group));
    if (greenGroups.length > 0) {
      const greenList = greenGroups.map(group => `${group.tier}-${group.cnvVersion}`).join(', ');
      blocks.push(mkSection(`:white_check_mark: All Green: ${greenList}`));
    }
    blocks.push({ type: 'divider' } as SlackBlock);
  }

  if (report.newFailures.length > 0) {
    blocks.push({ type: 'divider' } as SlackBlock);
    blocks.push(mkSection(`:new: *${report.newFailures.length} New Failure(s)* (not seen in previous window)`));
  }

  if (dashboardUrl) {
    blocks.push({
      type: 'actions',
      elements: [{
        type: 'button',
        text: { type: 'plain_text', text: 'Open Dashboard' },
        url: dashboardUrl,
        action_id: 'open_dashboard',
      }],
    });
  }

  if (blocks.length > 48) {
    const truncated = blocks.slice(0, 47);
    truncated.push(mkSection(`_...and more. View full report in the dashboard._`));
    return truncated;
  }
  return blocks;
}
