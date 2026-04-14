import axios from 'axios';

import { formatDateRange, pluralize, type WeeklyReport } from '@cnv-monitor/shared';

import { logger } from '../logger';

const log = logger.child({ module: 'WeeklyReport:Slack' });

const TIMEOUT_MS = 10_000;

export const sendWeeklySlackReport = async (
  report: WeeklyReport,
  webhookUrl: string,
): Promise<void> => {
  const dateRange = formatDateRange(new Date(report.weekStart), new Date(report.weekEnd));
  const componentLabel = report.component ? ` (${report.component})` : '';
  const includedReports = report.personReports.filter(pr => !pr.excluded);

  const totalPRsMerged = includedReports.reduce((sum, pr) => sum + pr.stats.prsMerged, 0);
  const totalTicketsDone = includedReports.reduce((sum, pr) => sum + pr.stats.ticketsDone, 0);
  const totalCommits = includedReports.reduce((sum, pr) => sum + pr.stats.commitCount, 0);
  const totalStoryPoints = includedReports.reduce(
    (sum, pr) => sum + pr.stats.storyPointsCompleted,
    0,
  );

  const blocks: Record<string, unknown>[] = [
    {
      text: {
        text: `:clipboard: *CNV UI Weekly Report: ${dateRange}${componentLabel}*`,
        type: 'mrkdwn',
      },
      type: 'header',
    },
    {
      text: {
        text: [
          `:white_check_mark: ${pluralize(totalPRsMerged, 'PR')} merged`,
          `:ballot_box_with_check: ${pluralize(totalTicketsDone, 'ticket')} done`,
          `:pencil: ${pluralize(totalCommits, 'commit')}`,
          `:dart: ${totalStoryPoints} story points`,
          `:busts_in_silhouette: ${pluralize(includedReports.length, 'contributor')}`,
        ].join('  |  '),
        type: 'mrkdwn',
      },
      type: 'section',
    },
  ];

  if (report.taskSummary?.weekHighlights) {
    blocks.push(
      { type: 'divider' },
      {
        text: { text: `*Highlights*\n${report.taskSummary.weekHighlights}`, type: 'mrkdwn' },
        type: 'section',
      },
    );
  } else if (report.managerHighlights) {
    blocks.push(
      { type: 'divider' },
      {
        text: { text: `*Highlights*\n${report.managerHighlights}`, type: 'mrkdwn' },
        type: 'section',
      },
    );
  }

  if (report.taskSummary?.blockers && report.taskSummary.blockers.length > 0) {
    const blockerLines = report.taskSummary.blockers
      .map(blocker => `:warning: ${blocker.description}`)
      .join('\n');
    blocks.push({
      text: { text: `*Blockers*\n${blockerLines}`, type: 'mrkdwn' },
      type: 'section',
    });
  }

  const personLines = includedReports
    .map(pr => {
      const stuckCount = pr.prs.filter(prItem => prItem.isStuck).length;
      const blockedCount = pr.stats.ticketsBlocked;
      const flags = [
        stuckCount > 0 ? `:rotating_light: ${stuckCount} stuck` : '',
        blockedCount > 0 ? `:no_entry: ${blockedCount} blocked` : '',
      ]
        .filter(Boolean)
        .join(' ');

      return `*${pr.member.displayName}*: ${pr.stats.prsMerged} merged, ${pr.stats.ticketsDone} done ${flags}`.trim();
    })
    .join('\n');

  if (personLines) {
    blocks.push(
      { type: 'divider' },
      {
        text: { text: `*Team*\n${personLines}`, type: 'mrkdwn' },
        type: 'section',
      },
    );
  }

  await axios.post(webhookUrl, { blocks }, { timeout: TIMEOUT_MS });
  log.info({ weekId: report.weekId }, 'Slack weekly report sent');
};
