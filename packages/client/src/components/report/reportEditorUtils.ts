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

  if (report.taskSummary?.blockers.length) {
    lines.push('## Blockers');
    for (const blocker of report.taskSummary.blockers) {
      lines.push(`- **[${blocker.severity}]** ${blocker.description}`);
      if (blocker.suggestedAction) lines.push(`  - Action: ${blocker.suggestedAction}`);
    }
    lines.push('');
  }

  const visible = report.personReports.filter(person => !person.excluded);
  if (visible.length > 0) {
    lines.push('## Team Members');
    lines.push('');
    for (const person of visible) {
      lines.push(`### ${person.member.displayName}`);
      const stats = person.stats;
      lines.push(
        `${pluralize(stats.prsMerged, 'PR')} merged · ${pluralize(stats.ticketsDone, 'ticket')} done · ${pluralize(stats.commitCount, 'commit')}`,
      );
      if (person.aiSummary) lines.push(`\n> ${person.aiSummary}`);
      if (person.managerNotes) lines.push(`\n**Notes:** ${person.managerNotes}`);
      lines.push('');
    }
  }

  return lines.join('\n');
};
