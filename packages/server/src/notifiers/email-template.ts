import { type DailyReport, type EnrichedFailedItem, type LaunchGroup } from '../analyzer';
import { config } from '../config';

import { emailCss, formatLastPass, healthColor, streakBarHtml } from './email-styles';

const buildGroupRow = (group: LaunchGroup): string => {
  const statusClass = `status-${group.latestLaunch.status.toLowerCase()}`;
  const lastRun = new Date(group.latestLaunch.start_time).toLocaleString();
  const lastPassed = group.lastPassedTime
    ? new Date(group.lastPassedTime).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })
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
};

const buildComponentSections = (report: DailyReport): string => {
  const groupsByComponent = new Map<string, typeof report.groups>();
  for (const group of report.groups) {
    const component = group.component || 'Other';
    if (!groupsByComponent.has(component)) {
      groupsByComponent.set(component, []);
    }
    groupsByComponent.get(component)?.push(group);
  }

  let html = '';
  for (const [component, groups] of [...groupsByComponent.entries()].sort((a, b) =>
    a[0].localeCompare(b[0]),
  )) {
    const nonPassed = groups.filter(group => group.latestLaunch.status !== 'PASSED');
    if (nonPassed.length === 0) {
      continue;
    }
    html += `<div class="section-title">${component}</div>`;
    html += `<table><thead><tr>
      <th>Version</th><th>Tier</th><th>Status</th><th>Pass Rate</th><th>Tests</th><th>Last Run</th><th>Last Passed</th>
    </tr></thead><tbody>${nonPassed.map(group => buildGroupRow(group)).join('')}</tbody></table>`;
  }

  const allPassed = [...groupsByComponent.entries()]
    .filter(([, groups]) => groups.every(group => group.latestLaunch.status === 'PASSED'))
    .map(([componentName]) => componentName);
  if (allPassed.length > 0) {
    html += `<p class="green-list">All green: ${allPassed.join(', ')}</p>`;
  }
  return html;
};

const buildFailedSection = (group: LaunchGroup): string => {
  const dashboardUrl = config.dashboard.url;
  const items =
    group.enrichedFailedItems.length > 0 ? group.enrichedFailedItems : group.failedItems;
  const jiraBaseUrl = config.jira.url;
  let html = `<h4>${group.tier}-${group.cnvVersion} (${group.failedTests} failures)</h4>`;

  for (const item of items) {
    const enriched = item as EnrichedFailedItem;
    const shortName = item.name.split('.').pop() || item.name;
    const polarion = item.polarion_id
      ? `<span style="color:#888;">${item.polarion_id}</span> · `
      : '';
    let streakHtml = '';
    let metaHtml = '';
    if (enriched.recentRuns.length > 0) {
      streakHtml = streakBarHtml(enriched.recentRuns);
      metaHtml =
        `<span>Failing ${enriched.consecutiveFailures}/${enriched.totalRuns} runs</span>` +
        `<span>${formatLastPass(enriched.lastPassDate, enriched.lastPassTime)}</span>`;
    }
    const jira = item.jira_key
      ? jiraBaseUrl
        ? `<a href="${jiraBaseUrl}/browse/${item.jira_key}" class="jira-badge">${item.jira_key}</a>`
        : `<span class="jira-badge">${item.jira_key}</span>`
      : '';
    html += `<div class="test-item">
        <div class="test-name">${polarion}${shortName} ${jira}</div>
        <div class="test-meta">${streakHtml} ${metaHtml}</div>
      </div>`;
  }
  if (dashboardUrl) {
    html += `<a href="${dashboardUrl}/launch/${group.latestLaunch.rp_id}" style="font-size: 13px;">View in Dashboard →</a>`;
  }
  return html;
};

export const buildHtml = (report: DailyReport): string => {
  const failedGroups = report.groups.filter(group => group.health === 'red');
  const dashboardUrl = config.dashboard.url;
  return `<!DOCTYPE html><html><head><style>${emailCss}</style></head>
<body>
  <div class="header" style="background:${healthColor(report.overallHealth)}">
    <h1>Console Dashboard Report — ${report.date}</h1>
    <p>${report.failedLaunches} Failed / ${report.passedLaunches} Passed${report.inProgressLaunches > 0 ? ` / ${report.inProgressLaunches} In Progress` : ''}</p>
  </div>
  ${buildComponentSections(report)}
  ${failedGroups.length > 0 ? `<div class="section-title">Failed Test Details</div>${failedGroups.map(group => buildFailedSection(group)).join('')}` : ''}
  ${
    report.newFailures.length > 0
      ? `<div class="section-title">New Failures (${report.newFailures.length})</div>
    <p style="font-size:13px;color:#666;">Tests not failing in the previous window:</p>
    <ul style="margin:8px 0 0 16px;font-size:13px;color:#555;">
      ${report.newFailures.map(item => `<li>${item.polarion_id ? `${item.polarion_id}: ` : ''}${item.name.split('.').pop()}</li>`).join('')}
    </ul>`
      : ''
  }
  ${dashboardUrl ? `<a href="${dashboardUrl}" class="btn">Open Dashboard</a>` : ''}
</body></html>`;
};
