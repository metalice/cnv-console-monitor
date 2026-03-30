import { useMemo } from 'react';

import type { ChecklistTask, ReleaseInfo } from '@cnv-monitor/shared';

import type { VersionReadiness } from '../../api/releases';

const MAX_SLACK_ITEMS = 10;

export type ReportData = {
  version: string;
  openItems: ChecklistTask[];
  closedItems: ChecklistTask[];
  totalItems: number;
  checklistPct: number;
  passRate: number | null;
  isHealthy: boolean;
  byPriority: [string, ChecklistTask[]][];
  byAssignee: [string, number][];
  slackReport: string;
};

export const useReleaseReport = (
  release: ReleaseInfo,
  checklist: ChecklistTask[] | undefined,
  readiness: VersionReadiness | null | undefined,
): ReportData => {
  const version = release.shortname.replace('cnv-', 'CNV ');
  const openItems = (checklist ?? []).filter(task => task.status !== 'Closed');
  const closedItems = (checklist ?? []).filter(task => task.status === 'Closed');
  const totalItems = (checklist ?? []).length;
  const checklistPct = totalItems > 0 ? Math.round((closedItems.length / totalItems) * 100) : 100;
  const passRate = readiness?.passRate ?? null;
  const isHealthy = checklistPct >= 80 && (passRate === null || passRate >= 85);

  const byPriority = useMemo(() => {
    const map = new Map<string, ChecklistTask[]>();
    for (const item of openItems) {
      const priority = item.priority || 'Unset';
      if (!map.has(priority)) map.set(priority, []);
      map.get(priority)?.push(item);
    }
    const order = ['Blocker', 'Critical', 'Major', 'Minor', 'Trivial', 'Unset'];
    return [...map.entries()].sort(
      (entryA, entryB) => order.indexOf(entryA[0]) - order.indexOf(entryB[0]),
    );
  }, [openItems]);

  const byAssignee = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of openItems) {
      const name = item.assignee || 'Unassigned';
      map.set(name, (map.get(name) ?? 0) + 1);
    }
    return [...map.entries()].sort((entryA, entryB) => entryB[1] - entryA[1]);
  }, [openItems]);

  const slackReport = useMemo(() => {
    const lines: string[] = [];
    lines.push(`:rocket: *${version} Release Status*`);
    if (release.nextRelease) {
      lines.push(
        `> Next: *${release.nextRelease.name}* — ${new Date(release.nextRelease.date).toLocaleDateString()}${release.daysUntilNext !== null ? ` (${release.daysUntilNext}d)` : ''}`,
      );
    }
    lines.push(`*Checklist:* ${closedItems.length}/${totalItems} done (${checklistPct}%)`);
    if (passRate !== null) lines.push(`*Pass Rate:* ${passRate}%`);
    lines.push(
      `*Status:* ${isHealthy ? ':white_check_mark: On Track' : ':warning: Needs Attention'}`,
    );
    if (openItems.length > 0) {
      lines.push(`\n*Open Items (${openItems.length}):*`);
      openItems
        .slice(0, MAX_SLACK_ITEMS)
        .forEach(task =>
          lines.push(
            `• <https://issues.redhat.com/browse/${task.key}|${task.key}> ${task.summary}`,
          ),
        );
      if (openItems.length > MAX_SLACK_ITEMS)
        lines.push(`_...and ${openItems.length - MAX_SLACK_ITEMS} more_`);
    }
    return lines.join('\n');
  }, [release, version, closedItems, totalItems, checklistPct, passRate, isHealthy, openItems]);

  return {
    byAssignee,
    byPriority,
    checklistPct,
    closedItems,
    isHealthy,
    openItems,
    passRate,
    slackReport,
    totalItems,
    version,
  };
};
