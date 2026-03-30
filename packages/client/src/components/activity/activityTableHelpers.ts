import type { ActivityEntry } from '@cnv-monitor/shared';

export type GroupedEntry = ActivityEntry & {
  groupCount?: number;
  groupedEntries?: ActivityEntry[];
};

export const groupBulkActions = (entries: ActivityEntry[]): GroupedEntry[] => {
  const result: GroupedEntry[] = [];
  let i = 0;
  while (i < entries.length) {
    const currentEntry = entries[i];
    if (currentEntry.action === 'bulk_classify_defect' && currentEntry.performed_by) {
      const group: ActivityEntry[] = [currentEntry];
      let j = i + 1;
      while (
        j < entries.length &&
        entries[j].action === 'bulk_classify_defect' &&
        entries[j].performed_by === currentEntry.performed_by &&
        entries[j].new_value === currentEntry.new_value &&
        Math.abs(
          new Date(entries[j].performed_at).getTime() -
            new Date(currentEntry.performed_at).getTime(),
        ) < 60000
      ) {
        group.push(entries[j]);
        j++;
      }
      if (group.length > 1) {
        result.push({
          ...currentEntry,
          groupCount: group.length,
          groupedEntries: group,
        });
        i = j;
        continue;
      }
    }
    result.push(currentEntry);
    i++;
  }
  return result;
};
