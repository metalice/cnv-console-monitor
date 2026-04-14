import nodemailer from 'nodemailer';

import { formatDateRange, pluralize, type WeeklyReport } from '@cnv-monitor/shared';

import { config } from '../config';
import { logger } from '../logger';

const log = logger.child({ module: 'WeeklyReport:Email' });

export const sendWeeklyEmailReport = async (
  report: WeeklyReport,
  recipients: string[],
): Promise<void> => {
  const transporter = nodemailer.createTransport({
    auth: config.email.user ? { pass: config.email.pass, user: config.email.user } : undefined,
    host: config.email.host,
    port: config.email.port,
    secure: config.email.port === 465,
  });

  const dateRange = formatDateRange(new Date(report.weekStart), new Date(report.weekEnd));
  const componentLabel = report.component ? ` - ${report.component}` : '';
  const includedReports = report.personReports.filter(pr => !pr.excluded);

  const totalPRsMerged = includedReports.reduce((sum, pr) => sum + pr.stats.prsMerged, 0);
  const totalTicketsDone = includedReports.reduce((sum, pr) => sum + pr.stats.ticketsDone, 0);
  const totalCommits = includedReports.reduce((sum, pr) => sum + pr.stats.commitCount, 0);
  const totalStoryPoints = includedReports.reduce(
    (sum, pr) => sum + pr.stats.storyPointsCompleted,
    0,
  );

  const highlightsHtml = report.managerHighlights
    ? `<div style="background:#e8f4fd;padding:12px 16px;border-radius:6px;margin:16px 0;border-left:4px solid #0066cc;">
        <strong>Highlights</strong><br/>${report.managerHighlights.replace(/\n/g, '<br/>')}
       </div>`
    : '';

  const taskSummaryHtml = report.taskSummary?.initiatives?.length
    ? `<div style="margin:16px 0;">
        <h3 style="margin:0 0 8px 0;color:#333;">This Week's Work</h3>
        ${report.taskSummary.initiatives
          .map(init => {
            const statusColors: Record<string, string> = {
              'at-risk': '#f0ab00',
              blocked: '#c9190b',
              done: '#3e8635',
              'in-progress': '#0066cc',
            };
            const color = statusColors[init.status] ?? '#6a6e73';
            return `<div style="margin:8px 0;padding:8px 12px;border-left:3px solid ${color};background:#f5f5f5;border-radius:4px;">
            <strong>${init.name}</strong>
            <span style="background:${color};color:white;padding:2px 8px;border-radius:10px;font-size:12px;margin-left:8px;">${init.status}</span>
            <br/><span style="color:#555;">${init.summary}</span>
          </div>`;
          })
          .join('')}
       </div>`
    : '';

  const blockersHtml = report.taskSummary?.blockers?.length
    ? `<div style="background:#fdf0e6;padding:12px 16px;border-radius:6px;margin:16px 0;border-left:4px solid #ec7a08;">
        <strong>Blockers</strong>
        ${report.taskSummary.blockers.map(blocker => `<br/>⚠ ${blocker.description}`).join('')}
       </div>`
    : '';

  const personSections = includedReports
    .map(pr => {
      const stuckBadge =
        pr.prs.filter(prItem => prItem.isStuck).length > 0
          ? `<span style="color:#c9190b;font-weight:bold;"> (${pr.prs.filter(prItem => prItem.isStuck).length} stuck)</span>`
          : '';
      const summary = pr.aiSummary ? `<br/><em style="color:#555;">${pr.aiSummary}</em>` : '';
      const notes = pr.managerNotes
        ? `<br/><span style="color:#333;">${pr.managerNotes}</span>`
        : '';

      return `<div style="margin:12px 0;padding:12px;border:1px solid #d2d2d2;border-radius:6px;">
      <strong>${pr.member.displayName}</strong>${stuckBadge}
      <span style="color:#6a6e73;margin-left:8px;">${pr.stats.prsMerged} merged · ${pr.stats.ticketsDone} done · ${pr.stats.commitCount} commits</span>
      ${summary}${notes}
    </div>`;
    })
    .join('');

  const html = `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:700px;margin:0 auto;">
      <h2 style="color:#151515;margin-bottom:4px;">CNV UI Weekly Report${componentLabel}</h2>
      <p style="color:#6a6e73;margin-top:0;">${dateRange}</p>
      <div style="display:flex;gap:16px;flex-wrap:wrap;margin:16px 0;">
        <div style="background:#f0faf0;padding:8px 16px;border-radius:6px;text-align:center;">
          <strong style="font-size:20px;color:#3e8635;">${totalPRsMerged}</strong><br/>
          <span style="color:#6a6e73;font-size:13px;">${pluralize(totalPRsMerged, 'PR')} merged</span>
        </div>
        <div style="background:#e8f4fd;padding:8px 16px;border-radius:6px;text-align:center;">
          <strong style="font-size:20px;color:#0066cc;">${totalTicketsDone}</strong><br/>
          <span style="color:#6a6e73;font-size:13px;">${pluralize(totalTicketsDone, 'ticket')} done</span>
        </div>
        <div style="background:#f5f5f5;padding:8px 16px;border-radius:6px;text-align:center;">
          <strong style="font-size:20px;color:#151515;">${totalCommits}</strong><br/>
          <span style="color:#6a6e73;font-size:13px;">${pluralize(totalCommits, 'commit')}</span>
        </div>
        <div style="background:#fdf7e6;padding:8px 16px;border-radius:6px;text-align:center;">
          <strong style="font-size:20px;color:#795600;">${totalStoryPoints}</strong><br/>
          <span style="color:#6a6e73;font-size:13px;">story points</span>
        </div>
      </div>
      ${highlightsHtml}
      ${taskSummaryHtml}
      ${blockersHtml}
      <h3 style="margin:24px 0 8px 0;color:#333;">Team</h3>
      ${personSections}
      <hr style="margin:24px 0;border:none;border-top:1px solid #d2d2d2;"/>
      <p style="color:#8a8d90;font-size:12px;">CNV Console Monitor · ${report.weekId}</p>
    </div>
  `;

  await transporter.sendMail({
    from: config.email.from,
    html,
    subject: `CNV UI Weekly Report: ${dateRange}${componentLabel}`,
    to: recipients.join(','),
  });

  log.info({ recipients: recipients.length, weekId: report.weekId }, 'Weekly email sent');
};
