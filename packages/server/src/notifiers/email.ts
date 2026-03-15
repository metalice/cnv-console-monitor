import nodemailer from 'nodemailer';
import { config } from '../config';
import { logger } from '../logger';
import { DailyReport, LaunchGroup, EnrichedFailedItem } from '../analyzer';

const log = logger.child({ module: 'Email' });

function healthColor(health: string): string {
  switch (health) {
    case 'green': return '#2ecc71';
    case 'yellow': return '#f39c12';
    case 'red': return '#e74c3c';
    default: return '#95a5a6';
  }
}

function streakBarHtml(runs: Array<{ status: string; date: string }>): string {
  const segments = runs.map(r => {
    const color = r.status === 'FAILED' ? '#e74c3c' : r.status === 'PASSED' ? '#2ecc71' : '#95a5a6';
    const label = r.status === 'FAILED' ? `${r.date} — Failed` : `${r.date} — Passed`;
    return `<span style="display:inline-block;width:12px;height:12px;background:${color};border-radius:2px;margin-right:2px;cursor:default;" title="${label}"></span>`;
  }).join('');
  return `<span style="display:inline-flex;align-items:center;">${segments}</span>`;
}

function formatLastPass(lastPassDate: string | null, lastPassTime: number | null): string {
  if (!lastPassDate || !lastPassTime) return '<span style="color:#e74c3c;">Never passed</span>';
  const d = new Date(lastPassTime);
  const month = d.toLocaleString('en-US', { month: 'short' });
  const day = d.getDate();
  const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return `Last passed: ${month} ${day} ${time}`;
}

function buildHtml(report: DailyReport): string {
  const failedGroups = report.groups.filter(g => g.health === 'red');
  const greenGroups = report.groups.filter(g => g.health === 'green');
  const dashboardUrl = config.dashboard.url;

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
    .test-item { margin-bottom: 12px; padding: 10px 12px; background: #f8f9fa; border-radius: 6px; border-left: 4px solid #e74c3c; }
    .test-name { font-weight: 600; font-size: 14px; margin-bottom: 4px; }
    .test-meta { font-size: 12px; color: #666; }
    .test-meta span { margin-right: 12px; }
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

  ${buildComponentSections(report)}

  ${failedGroups.length > 0 ? `
    <div class="section-title">Failed Test Details</div>
    ${failedGroups.map(g => buildFailedSection(g)).join('')}
  ` : ''}

  ${report.newFailures.length > 0 ? `
    <div class="section-title">New Failures (${report.newFailures.length})</div>
    <p style="font-size:13px;color:#666;">Tests not failing in the previous window:</p>
    <ul style="margin:8px 0 0 16px;font-size:13px;color:#555;">
      ${report.newFailures.map(i => `<li>${i.polarion_id ? `${i.polarion_id}: ` : ''}${i.name.split('.').pop()}</li>`).join('')}
    </ul>
  ` : ''}

  

  ${dashboardUrl ? `<a href="${dashboardUrl}" class="btn">Open Dashboard</a>` : ''}
</body>
</html>`;
}

function buildComponentSections(report: DailyReport): string {
  const groupsByComponent = new Map<string, typeof report.groups>();
  for (const group of report.groups) {
    const comp = group.component || 'Other';
    if (!groupsByComponent.has(comp)) groupsByComponent.set(comp, []);
    groupsByComponent.get(comp)!.push(group);
  }

  let html = '';
  for (const [component, groups] of [...groupsByComponent.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    const nonPassed = groups.filter(g => g.latestLaunch.status !== 'PASSED');
    if (nonPassed.length === 0) continue;

    html += `<div class="section-title">${component}</div>`;
    html += `<table>
      <thead>
        <tr>
          <th>Version</th>
          <th>Tier</th>
          <th>Status</th>
          <th>Pass Rate</th>
          <th>Tests</th>
          <th>Last Run</th>
          <th>Last Passed</th>
        </tr>
      </thead>
      <tbody>
        ${nonPassed.map(g => buildGroupRow(g)).join('')}
      </tbody>
    </table>`;
  }

  const allPassedComponents = [...groupsByComponent.entries()]
    .filter(([, groups]) => groups.every(g => g.latestLaunch.status === 'PASSED'))
    .map(([comp]) => comp);

  if (allPassedComponents.length > 0) {
    html += `<p class="green-list">All green: ${allPassedComponents.join(', ')}</p>`;
  }

  return html;
}

function buildGroupRow(group: LaunchGroup): string {
  const statusClass = `status-${group.latestLaunch.status.toLowerCase()}`;
  const lastRun = new Date(group.latestLaunch.start_time).toLocaleString();
  const lastPassed = group.lastPassedTime
    ? new Date(group.lastPassedTime).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : '<span style="color:#e74c3c;">Never</span>';
  return `
    <tr>
      <td>${group.cnvVersion}</td>
      <td>${group.tier}</td>
      <td class="${statusClass}">${group.latestLaunch.status}</td>
      <td>${group.passRate}%</td>
      <td>${group.passedTests}/${group.totalTests}</td>
      <td>${lastRun}</td>
      <td>${lastPassed}</td>
    </tr>`;
}

function buildFailedSection(group: LaunchGroup): string {
  const dashboardUrl = config.dashboard.url;
  const items = group.enrichedFailedItems.length > 0 ? group.enrichedFailedItems : group.failedItems;
  const jiraBaseUrl = config.jira.url;

  let html = `<h4>${group.tier}-${group.cnvVersion} (${group.failedTests} failures)</h4>`;

  for (const item of items) {
    const enriched = item as EnrichedFailedItem;
    const shortName = item.name.split('.').pop() || item.name;
    const polarion = item.polarion_id ? `<span style="color:#888;">${item.polarion_id}</span> · ` : '';

    let streakHtml = '';
    let metaHtml = '';
    if (enriched.recentRuns) {
      streakHtml = streakBarHtml(enriched.recentRuns);
      metaHtml = `<span>Failing ${enriched.consecutiveFailures}/${enriched.totalRuns} runs</span>` +
        `<span>${formatLastPass(enriched.lastPassDate, enriched.lastPassTime)}</span>`;
    }

    const jira = item.jira_key
      ? (jiraBaseUrl
        ? `<a href="${jiraBaseUrl}/browse/${item.jira_key}" class="jira-badge">${item.jira_key}</a>`
        : `<span class="jira-badge">${item.jira_key}</span>`)
      : '';

    html += `
      <div class="test-item">
        <div class="test-name">${polarion}${shortName} ${jira}</div>
        <div class="test-meta">${streakHtml} ${metaHtml}</div>
      </div>`;
  }

  if (dashboardUrl) {
    html += `<a href="${dashboardUrl}/launch/${group.latestLaunch.rp_id}" style="font-size: 13px;">View in Dashboard →</a>`;
  }
  return html;
}

export async function sendEmailReport(report: DailyReport, recipientOverride?: string[]): Promise<void> {
  const recipients = recipientOverride ?? [];
  if (!config.email.enabled || recipients.length === 0) {
    log.debug('Email not configured or no recipients, skipping');
    return;
  }

  try {
    const transporter = nodemailer.createTransport({
      host: config.email.host,
      port: config.email.port,
      secure: config.email.port === 465,
      auth: config.email.user ? { user: config.email.user, pass: config.email.pass } : undefined,
      tls: { rejectUnauthorized: false },
    });

    const statusText = report.overallHealth === 'green' ? 'ALL GREEN' : `${report.failedLaunches} FAILED`;

    await transporter.sendMail({
      from: config.email.from,
      to: recipients.join(', '),
      subject: `[CNV Console] ${report.date} — ${statusText}`,
      html: buildHtml(report),
    });

    log.info({ recipients: recipients.length }, 'Report sent');
  } catch (err) {
    log.error({ err, recipients: recipients.length }, 'Failed to send email report');
    throw err;
  }
}
