import { createElement, type ReactNode } from 'react';

import { type AggregateStats, pluralize, type TeamReport } from '@cnv-monitor/shared';

export const STAT_ITEMS: { key: keyof AggregateStats; label: string }[] = [
  { key: 'prsMerged', label: 'PRs merged' },
  { key: 'ticketsDone', label: 'tickets done' },
  { key: 'commitCount', label: 'commits' },
  { key: 'storyPoints', label: 'story points' },
  { key: 'contributorCount', label: 'contributors' },
];

const JIRA_KEY_RE = /\bCNV-\d+\b/g;
const PR_NUM_RE = /#\d+/g;

export const formatHighlightText = (text: string): ReactNode[] => {
  const parts = text.split(/(\bCNV-\d+\b|#\d+)/);
  let counter = 0;
  return parts.map(part => {
    if (JIRA_KEY_RE.test(part)) {
      JIRA_KEY_RE.lastIndex = 0;
      counter += 1;
      return createElement(
        'a',
        {
          href: `https://issues.redhat.com/browse/${part}`,
          key: `jira-${part}-${counter}`,
          rel: 'noreferrer',
          target: '_blank',
        },
        part,
      );
    }
    if (PR_NUM_RE.test(part)) {
      PR_NUM_RE.lastIndex = 0;
      counter += 1;
      return createElement('strong', { key: `pr-${part}-${counter}` }, part);
    }
    return part;
  });
};

export const computeDaysAgo = (dateStr: string | null | undefined): number | null => {
  if (!dateStr) return null;
  const created = new Date(dateStr).getTime();
  if (Number.isNaN(created)) return null;
  return Math.floor((Date.now() - created) / (1000 * 60 * 60 * 24));
};

export const formatTimestamp = (dateStr: string | null | undefined): string => {
  if (!dateStr) return '—';
  const date = new Date(dateStr);
  return date.toLocaleString('en-US', {
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

export const copyAsRichText = (html: string): void => {
  const blob = new Blob([html], { type: 'text/html' });
  const plainText = html
    .replaceAll(/<br\s*\/?>/gi, '\n')
    .replaceAll(/<\/?(?:p|h[1-3]|li|tr|div)[^>]*>/gi, '\n')
    // eslint-disable-next-line sonarjs/slow-regex -- runs on our own generated HTML, not user input
    .replaceAll(/<[^>]+>/g, '')
    .replaceAll(/\n{3,}/g, '\n\n')
    .trim();
  const textBlob = new Blob([plainText], { type: 'text/plain' });
  const item = new ClipboardItem({ 'text/html': blob, 'text/plain': textBlob });
  void navigator.clipboard.write([item]);
};

const CELL_STYLE = 'padding:6px 10px;border:1px solid #d2d2d2';
const HEADER_STYLE = `${CELL_STYLE};background:#f0f0f0`;
const SEVERITY_ICON: Record<string, string> = { high: '🔴', low: '🟢', medium: '🟡' };
const STATUS_COLOR: Record<string, string> = {
  blocked: '#c9190b',
  done: '#3e8635',
  'in-progress': '#06c',
};

const linkJiraKeys = (text: string): string =>
  text.replaceAll(JIRA_KEY_RE, '<a href="https://issues.redhat.com/browse/$&">$&</a>');

const personToHtml = (person: TeamReport['personReports'][number]): string => {
  const { member, stats } = person;
  const parts: string[] = [];
  parts.push(`<h3>${member.displayName}</h3>`);
  parts.push(
    `<p>${stats.prsMerged} PRs merged · ${stats.ticketsDone} tickets done · ${stats.commitCount} commits</p>`,
  );
  if (person.aiSummary) parts.push(`<p><em>${person.aiSummary}</em></p>`);
  if (person.managerNotes) parts.push(`<p><strong>Notes:</strong> ${person.managerNotes}</p>`);

  if (person.prs.length > 0) {
    parts.push('<table style="border-collapse:collapse;width:100%">');
    parts.push(
      `<tr><th style="${HEADER_STYLE};text-align:left">PR</th><th style="${HEADER_STYLE};text-align:left">Title</th><th style="${HEADER_STYLE};text-align:center">State</th></tr>`,
    );
    for (const pr of person.prs) {
      parts.push(
        `<tr><td style="${CELL_STYLE}"><a href="${pr.url}">#${pr.number}</a></td><td style="${CELL_STYLE}">${pr.title}</td><td style="${CELL_STYLE};text-align:center">${pr.state}</td></tr>`,
      );
    }
    parts.push('</table>');
  }

  if (person.jiraTickets.length > 0) {
    parts.push('<table style="border-collapse:collapse;width:100%">');
    parts.push(
      `<tr><th style="${HEADER_STYLE};text-align:left">Ticket</th><th style="${HEADER_STYLE};text-align:left">Summary</th><th style="${HEADER_STYLE};text-align:center">Status</th><th style="${HEADER_STYLE};text-align:center">Points</th></tr>`,
    );
    for (const ticket of person.jiraTickets) {
      parts.push(
        `<tr><td style="${CELL_STYLE}"><a href="${ticket.url}">${ticket.key}</a></td><td style="${CELL_STYLE}">${ticket.summary}</td><td style="${CELL_STYLE};text-align:center">${ticket.status}</td><td style="${CELL_STYLE};text-align:center">${ticket.storyPoints ?? '—'}</td></tr>`,
      );
    }
    parts.push('</table>');
  }
  return parts.join('\n');
};

const personToMarkdown = (person: TeamReport['personReports'][number]): string => {
  const lines: string[] = [];
  const { stats } = person;
  lines.push(`### ${person.member.displayName}`);
  lines.push(
    `${pluralize(stats.prsMerged, 'PR')} merged · ${pluralize(stats.ticketsDone, 'ticket')} done · ${pluralize(stats.commitCount, 'commit')}`,
  );
  if (person.aiSummary) lines.push(`\n> ${person.aiSummary}`);
  if (person.managerNotes) lines.push(`\n**Notes:** ${person.managerNotes}`);

  if (person.prs.length > 0) {
    lines.push('', '| PR | Title | State |', '|---|---|---|');
    for (const pr of person.prs) {
      lines.push(`| [#${pr.number}](${pr.url}) | ${pr.title} | ${pr.state} |`);
    }
  }

  if (person.jiraTickets.length > 0) {
    lines.push('', '| Ticket | Summary | Status | Points |', '|---|---|---|---|');
    for (const ticket of person.jiraTickets) {
      lines.push(
        `| [${ticket.key}](${ticket.url}) | ${ticket.summary} | ${ticket.status} | ${ticket.storyPoints ?? '—'} |`,
      );
    }
  }
  lines.push('');
  return lines.join('\n');
};

export const generateDocsHtml = (report: TeamReport): string => {
  const parts: string[] = [];
  const title = report.component ?? 'Team Report';
  parts.push(`<h1>${title} — ${report.weekStart} – ${report.weekEnd}</h1>`);

  if (report.aggregateStats) {
    const stats = report.aggregateStats;
    parts.push('<h2>Summary</h2>');
    parts.push('<table style="border-collapse:collapse;width:auto"><tr>');
    const statEntries = [
      { label: 'PRs merged', value: stats.prsMerged },
      { label: 'Tickets done', value: stats.ticketsDone },
      { label: 'Commits', value: stats.commitCount },
      { label: 'Story points', value: stats.storyPoints },
      { label: 'Contributors', value: stats.contributorCount },
    ];
    for (const entry of statEntries) {
      parts.push(
        `<td style="padding:4px 16px 4px 0;text-align:center"><strong style="font-size:18px">${entry.value}</strong><br><span style="color:#6a6a6a;font-size:12px">${entry.label}</span></td>`,
      );
    }
    parts.push('</tr></table>');
  }

  if (report.managerHighlights) {
    parts.push('<h2>Manager Highlights</h2>');
    parts.push(`<p>${linkJiraKeys(report.managerHighlights).replaceAll(/\n/g, '<br>')}</p>`);
  }

  if (report.taskSummary?.weekHighlights) {
    parts.push('<h2>Week Highlights</h2>');
    parts.push(
      `<p>${linkJiraKeys(report.taskSummary.weekHighlights).replaceAll(/\n/g, '<br>')}</p>`,
    );
  }

  if (report.taskSummary?.initiatives.length) {
    parts.push('<h2>Initiatives</h2>');
    parts.push(`<table style="border-collapse:collapse;width:100%">`);
    parts.push(
      `<tr><th style="${HEADER_STYLE};text-align:left">Initiative</th><th style="${HEADER_STYLE};text-align:center">Status</th><th style="${HEADER_STYLE};text-align:left">Summary</th><th style="${HEADER_STYLE};text-align:left">Related</th></tr>`,
    );
    for (const init of report.taskSummary.initiatives) {
      const color = STATUS_COLOR[init.status] ?? '#6a6a6a';
      const related = [
        ...init.relatedTickets.map(
          key => `<a href="https://issues.redhat.com/browse/${key}">${key}</a>`,
        ),
        ...init.relatedPRs.map(num => `#${num}`),
      ].join(', ');
      parts.push(
        `<tr><td style="${CELL_STYLE}"><strong>${init.name}</strong></td><td style="${CELL_STYLE};text-align:center;color:${color}">${init.status}</td><td style="${CELL_STYLE}">${init.summary}</td><td style="${CELL_STYLE}">${related || '—'}</td></tr>`,
      );
    }
    parts.push('</table>');
  }

  if (report.taskSummary?.blockers.length) {
    parts.push('<h2>Blockers</h2>');
    parts.push('<ul>');
    for (const blocker of report.taskSummary.blockers) {
      const icon = SEVERITY_ICON[blocker.severity] ?? '🟡';
      let item = `<li>${icon} <strong>${blocker.description}</strong>`;
      if (blocker.suggestedAction) item += `<br><em>Action: ${blocker.suggestedAction}</em>`;
      if (blocker.tickets.length > 0) {
        const links = blocker.tickets
          .map(key => `<a href="https://issues.redhat.com/browse/${key}">${key}</a>`)
          .join(', ');
        item += `<br>${links}`;
      }
      item += '</li>';
      parts.push(item);
    }
    parts.push('</ul>');
  }

  const visible = report.personReports.filter(person => !person.excluded);
  if (visible.length > 0) {
    parts.push('<h2>Team Members</h2>');
    for (const person of visible) {
      parts.push(personToHtml(person));
    }
  }

  return parts.join('\n');
};

export const generateMarkdown = (report: TeamReport): string => {
  const lines: string[] = [];
  const title = report.component ?? 'Team Report';
  lines.push(`# ${title} — ${report.weekStart} – ${report.weekEnd}`);
  lines.push('');

  if (report.aggregateStats) {
    const stats = report.aggregateStats;
    lines.push('## Summary');
    lines.push(`- **PRs merged:** ${stats.prsMerged}`);
    lines.push(`- **Tickets done:** ${stats.ticketsDone}`);
    lines.push(`- **Commits:** ${stats.commitCount}`);
    lines.push(`- **Story points:** ${stats.storyPoints}`);
    lines.push(`- **Contributors:** ${stats.contributorCount}`);
    lines.push('');
  }

  if (report.managerHighlights) {
    lines.push('## Manager Highlights');
    lines.push(report.managerHighlights);
    lines.push('');
  }

  if (report.taskSummary?.weekHighlights) {
    lines.push('## Week Highlights');
    lines.push(report.taskSummary.weekHighlights);
    lines.push('');
  }

  if (report.taskSummary?.initiatives.length) {
    lines.push('## Initiatives');
    lines.push('');
    lines.push('| Initiative | Status | Summary | Related |');
    lines.push('|---|---|---|---|');
    for (const init of report.taskSummary.initiatives) {
      const related = [...init.relatedTickets, ...init.relatedPRs.map(num => `#${num}`)].join(', ');
      lines.push(`| ${init.name} | ${init.status} | ${init.summary} | ${related || '—'} |`);
    }
    lines.push('');
  }

  if (report.taskSummary?.blockers.length) {
    lines.push('## Blockers');
    for (const blocker of report.taskSummary.blockers) {
      lines.push(`- **[${blocker.severity}]** ${blocker.description}`);
      if (blocker.suggestedAction) lines.push(`  - Action: ${blocker.suggestedAction}`);
      if (blocker.tickets.length > 0) lines.push(`  - ${blocker.tickets.join(', ')}`);
    }
    lines.push('');
  }

  const visible = report.personReports.filter(person => !person.excluded);
  if (visible.length > 0) {
    lines.push('## Team Members');
    lines.push('');
    for (const person of visible) {
      lines.push(personToMarkdown(person));
    }
  }

  return lines.join('\n');
};
