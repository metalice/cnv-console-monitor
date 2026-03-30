import type { ChecklistTask, ReleaseInfo } from '@cnv-monitor/shared';

import type { ColumnDef } from '../../hooks/useColumnManagement';

export const CHECKLIST_COLUMNS: ColumnDef[] = [
  { id: 'dueDate', title: 'Due Date' },
  { id: 'version', title: 'Version' },
  { id: 'key', title: 'Key' },
  { id: 'summary', title: 'Summary' },
  { id: 'status', title: 'Status' },
  { id: 'component', isDefault: false, title: 'Component' },
  { id: 'assignee', title: 'Assignee' },
  { id: 'priority', title: 'Priority' },
  { id: 'subtasks', title: 'Subtasks' },
  { id: 'updated', title: 'Updated' },
  { id: 'actions', title: 'Actions' },
];

const toMajorMinor = (ver: string): string => {
  const stripped = ver
    .replace(/^cnv[\s\-_]*v?/i, '')
    .trim()
    .toLowerCase();
  const match = /(\d{1,20}\.\d{1,20})/.exec(stripped);
  return match ? match[1] : stripped;
};

export const buildDueDateMap = (releases: ReleaseInfo[] | undefined): Map<string, string> => {
  const map = new Map<string, string>();
  if (!releases) return map;
  for (const release of releases) {
    if (!release.nextRelease) continue;
    const key = toMajorMinor(release.shortname);
    if (key) map.set(key, release.nextRelease.date);
  }
  return map;
};

export const getDueDate = (task: ChecklistTask, dueDateMap: Map<string, string>): string | null => {
  for (const fixVersion of task.fixVersions) {
    const majorMinor = toMajorMinor(fixVersion);
    const date = dueDateMap.get(majorMinor);
    if (date) return date;
  }
  return null;
};

export const buildSortAccessors = (
  dueDateMap: Map<string, string>,
): Record<number, (t: ChecklistTask) => string | number | null> => ({
  0: task => {
    const dueDate = getDueDate(task, dueDateMap);
    return dueDate ? new Date(dueDate).getTime() : Infinity;
  },
  1: task => task.fixVersions[0] || '',
  2: task => task.key,
  3: task => task.summary,
  4: task => task.status,
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- defensive: runtime data
  5: task => task.components?.[0] || '',
  6: task => task.assignee,
  7: task => task.priority,
  8: task => (task.subtaskCount > 0 ? task.subtasksDone / task.subtaskCount : 0),
  9: task => new Date(task.updated).getTime(),
});

export const PER_PAGE_OPTIONS = [
  { title: '10', value: 10 },
  { title: '20', value: 20 },
  { title: '50', value: 50 },
  { title: '100', value: 100 },
] as const;

export type ReleaseChecklistProps = {
  checklist: ChecklistTask[] | undefined;
  isLoading: boolean;
  error: Error | null;
  checklistStatus: 'open' | 'all';
  onStatusChange: (status: 'open' | 'all') => void;
  releases: ReleaseInfo[] | undefined;
  activeVersion?: string | null;
};
