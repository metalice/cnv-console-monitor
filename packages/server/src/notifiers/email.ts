import nodemailer from 'nodemailer';
import { config } from '../config';
import { DailyReport, LaunchGroup } from '../analyzer';
import { getReportPortalLaunchUrl } from '../clients/reportportal';

function healthColor(health: string): string {
  switch (health) {
    case 'green': return '#2ecc71';
    case 'yellow': return '#f39c12';
    case 'red': return '#e74c3c';
    default: return '#95a5a6';
  }
}

function buildHtml(report: DailyReport, dashboardUrl?: string): string {
  const failedGroups = report.groups.filter(g => g.health === 'red');
  const greenGroups = report.groups.filter(g => g.health === 'green');

  return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #333; max-width: 800px; margin: 0 auto; padding: 20px; }
    .header { background: ${healthColor(report.overallHealth)}; color: white; padding: 16px 24px; border-radius: 8px; margin-bottom: 24px; }
    .header h1 { margin: 0 0 8px 0; font-size: 20px; }
    .header p { margin: 0; opacity: 0.9; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
    th { background: #f8f9fa; text-align: left; padding: 10px 12px; border-bottom: 2px solid #dee2e6; font-size: 13px; text-transform: uppercase; color: #666; }
    td { padding: 10px 12px; border-bottom: 1px solid #eee; font-size: 14px; }
    .status-passed { color: #2ecc71; font-weight: 600; }
    .status-failed { color: #e74c3c; font-weight: 600; }
    .status-in_progress { color: #f39c12; font-weight: 600; }
    .failed-items { margin: 8px 0 0 16px; font-size: 13px; color: #555; }
    .failed-items li { margin-bottom: 4px; }
    .prediction { color: #888; font-size: 12px; }
    .jira-badge { background: #0052CC; color: white; font-size: 11px; padding: 2px 6px; border-radius: 3px; text-decoration: none; }
    .btn { display: inline-block; background: #0066FF; color: white; padding: 10px 20px; border-radius: 6px; text-decoration: none; margin-top: 16px; }
    .section-title { font-size: 16px; font-weight: 600; margin: 24px 0 12px 0; }
    .green-list { color: #2ecc71; }
  </style>
</head>
<body>
  <div class="header">
    <h1>Console Dashboard Report — ${report.date}</h1>
    <p>${report.failedLaunches} Failed / ${report.passedLaunches} Passed${report.inProgressLaunches > 0 ? ` / ${report.inProgressLaunches} In Progress` : ''}</p>
  </div>

  <table>
    <thead>
      <tr>
        <th>Version</th>
        <th>Tier</th>
        <th>Status</th>
        <th>Pass Rate</th>
        <th>Tests</th>
        <th>Last Run</th>
      </tr>
    </thead>
    <tbody>
      ${report.groups.map(g => buildGroupRow(g)).join('')}
    </tbody>
  </table>

  ${failedGroups.length > 0 ? `
    <div class="section-title">Failed Test Details</div>
    ${failedGroups.map(g => buildFailedSection(g)).join('')}
  ` : ''}

  ${report.newFailures.length > 0 ? `
    <div class="section-title">New Failures (${report.newFailures.length})</div>
    <p>These tests were not failing yesterday:</p>
    <ul class="failed-items">
      ${report.newFailures.map(i => `<li>${i.polarion_id ? `${i.polarion_id}: ` : ''}${i.name.split('.').pop()}</li>`).join('')}
    </ul>
  ` : ''}

  ${greenGroups.length > 0 ? `
    <p class="green-list">All green: ${greenGroups.map(g => `${g.tier}-${g.cnvVersion}`).join(', ')}</p>
  ` : ''}

  ${dashboardUrl ? `<a href="${dashboardUrl}" class="btn">Open Dashboard</a>` : ''}
</body>
</html>`;
}

function buildGroupRow(group: LaunchGroup): string {
  const statusClass = `status-${group.latestLaunch.status.toLowerCase()}`;
  const lastRun = new Date(group.latestLaunch.start_time).toLocaleString();
  return `
    <tr>
      <td>${group.cnvVersion}</td>
      <td>${group.tier}</td>
      <td class="${statusClass}">${group.latestLaunch.status}</td>
      <td>${group.passRate}%</td>
      <td>${group.passedTests}/${group.totalTests}</td>
      <td>${lastRun}</td>
    </tr>`;
}

function buildFailedSection(group: LaunchGroup): string {
  const rpUrl = getReportPortalLaunchUrl(group.latestLaunch.rp_id);
  return `
    <h4>${group.tier}-${group.cnvVersion} (${group.failedTests} failures)</h4>
    <ul class="failed-items">
      ${group.failedItems.map(item => {
        const prediction = item.ai_prediction && item.ai_confidence
          ? `<span class="prediction">[${item.ai_prediction.replace('Predicted ', '')} ${item.ai_confidence}%]</span>`
          : '';
        const jira = item.jira_key ? `<a href="#" class="jira-badge">${item.jira_key}</a>` : '';
        return `<li>${item.polarion_id ? `${item.polarion_id}: ` : ''}${item.name.split('.').pop()} ${prediction} ${jira}</li>`;
      }).join('')}
    </ul>
    <a href="${rpUrl}" style="font-size: 13px;">View in ReportPortal →</a>`;
}

export async function sendEmailReport(report: DailyReport, dashboardUrl?: string): Promise<void> {
  if (!config.email.enabled || config.email.recipients.length === 0) {
    console.log('[Email] Email not configured, skipping');
    return;
  }

  const transporter = nodemailer.createTransport({
    host: config.email.host,
    port: config.email.port,
    secure: config.email.port === 465,
    auth: config.email.user ? { user: config.email.user, pass: config.email.pass } : undefined,
  });

  const statusText = report.overallHealth === 'green' ? 'ALL GREEN' : `${report.failedLaunches} FAILED`;

  await transporter.sendMail({
    from: config.email.user || 'cnv-console-monitor@redhat.com',
    to: config.email.recipients.join(', '),
    subject: `[CNV Console] ${report.date} — ${statusText}`,
    html: buildHtml(report, dashboardUrl),
  });

  console.log(`[Email] Report sent to ${config.email.recipients.length} recipients`);
}
